package client

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"sync"

	"chat-ai/internal/models"
)

type ChatRequest struct {
	Model    string                `json:"model"`
	Messages []models.AgentMessage `json:"messages"`
	Stream   bool                  `json:"stream,omitempty"`
}

type ChatResponse struct {
	Choices []struct {
		Message models.Message `json:"message"`
	} `json:"choices"`
}

type streamChatResponse struct {
	Choices []struct {
		Delta struct {
			Content string `json:"content"`
		} `json:"delta"`
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
		Text string `json:"text"`
	} `json:"choices"`
}

type luckyHarnessChatRequest struct {
	Message     string `json:"message"`
	SessionID   string `json:"session_id,omitempty"`
	AutoApprove bool   `json:"auto_approve,omitempty"`
	MaxIter     int    `json:"max_iterations,omitempty"`
}

type luckyHarnessChatResponse struct {
	Response  string `json:"response"`
	SessionID string `json:"session_id"`
}

type Client struct {
	Provider string
	APIKey   string
	URL      string
	Model    string

	mu                 sync.RWMutex
	luckySessionByConv map[string]string
}

var DefaulClient *Client

var History = []models.AgentMessage{
	{Role: "system", Content: "default prompt"},
}

func SetSystemPrompt(content string) {
	if content == "" {
		slog.Error("Missing system content", "content", content)
	}
	History = []models.AgentMessage{
		{Role: "system", Content: content},
	}
}

// InitClient 初始化默认的 client 实例。
func InitClient(provider, apiKey, url, model string) {
	DefaulClient = NewClient(provider, apiKey, url, model)
}

// NewClient 返回一个新的 client 实例。
func NewClient(provider, apiKey, url, model string) *Client {
	if strings.TrimSpace(provider) == "" {
		provider = "openai"
	}
	return &Client{
		Provider:           provider,
		APIKey:             apiKey,
		URL:                url,
		Model:              model,
		luckySessionByConv: make(map[string]string),
	}
}

// Chat 调用当前 provider 获取文本回复。
func (c *Client) Chat(am []models.AgentMessage, conversationID string) (models.Message, error) {
	if strings.EqualFold(strings.TrimSpace(c.Provider), "luckyharness") {
		return c.chatWithLuckyHarness(am, conversationID)
	}
	return c.chatWithOpenAI(am)
}

func (c *Client) StreamChat(am []models.AgentMessage, conversationID string, onDelta func(string) error) (models.Message, error) {
	if strings.EqualFold(strings.TrimSpace(c.Provider), "luckyharness") {
		reply, err := c.chatWithLuckyHarness(am, conversationID)
		if err != nil {
			return models.Message{}, err
		}
		if strings.TrimSpace(reply.Content) != "" && onDelta != nil {
			if err := onDelta(reply.Content); err != nil {
				return models.Message{}, err
			}
		}
		return reply, nil
	}
	return c.chatWithOpenAIStream(am, onDelta)
}

func (c *Client) chatWithOpenAI(am []models.AgentMessage) (models.Message, error) {
	reqBody := ChatRequest{
		Model:    c.Model,
		Messages: am,
	}
	data, _ := json.Marshal(reqBody)

	req, _ := http.NewRequest("POST", c.URL, bytes.NewBuffer(data))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.APIKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return models.Message{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return models.Message{}, fmt.Errorf("HTTP %d", resp.StatusCode)
	}

	var res ChatResponse
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return models.Message{}, err
	}
	if len(res.Choices) == 0 {
		return models.Message{}, fmt.Errorf("no choices returned")
	}

	return res.Choices[0].Message, nil
}

func (c *Client) chatWithOpenAIStream(am []models.AgentMessage, onDelta func(string) error) (models.Message, error) {
	reqBody := ChatRequest{
		Model:    c.Model,
		Messages: am,
		Stream:   true,
	}
	data, _ := json.Marshal(reqBody)

	req, _ := http.NewRequest("POST", c.URL, bytes.NewBuffer(data))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.APIKey)
	req.Header.Set("Accept", "text/event-stream")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return models.Message{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		message := strings.TrimSpace(string(body))
		if message == "" {
			message = fmt.Sprintf("HTTP %d", resp.StatusCode)
		}
		return models.Message{}, fmt.Errorf("%s", message)
	}

	scanner := bufio.NewScanner(resp.Body)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)

	var fullText strings.Builder
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || !strings.HasPrefix(line, "data:") {
			continue
		}

		payload := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		if payload == "" {
			continue
		}
		if payload == "[DONE]" {
			break
		}

		var chunk streamChatResponse
		if err := json.Unmarshal([]byte(payload), &chunk); err != nil {
			continue
		}
		if len(chunk.Choices) == 0 {
			continue
		}

		delta := strings.TrimSpace(chunk.Choices[0].Delta.Content)
		if delta == "" {
			delta = strings.TrimSpace(chunk.Choices[0].Message.Content)
		}
		if delta == "" {
			delta = strings.TrimSpace(chunk.Choices[0].Text)
		}
		if delta == "" {
			continue
		}

		fullText.WriteString(delta)
		if onDelta != nil {
			if err := onDelta(delta); err != nil {
				return models.Message{}, err
			}
		}
	}

	if err := scanner.Err(); err != nil {
		return models.Message{}, err
	}

	return models.Message{Content: fullText.String()}, nil
}

func (c *Client) chatWithLuckyHarness(am []models.AgentMessage, conversationID string) (models.Message, error) {
	payload := luckyHarnessChatRequest{
		Message: buildLuckyHarnessPrompt(am),
	}
	if payload.Message == "" {
		return models.Message{}, fmt.Errorf("empty prompt")
	}

	if conversationID != "" {
		if sessionID := c.getLuckyHarnessSession(conversationID); sessionID != "" {
			payload.SessionID = sessionID
		}
	}

	data, _ := json.Marshal(payload)

	req, _ := http.NewRequest("POST", c.URL, bytes.NewBuffer(data))
	req.Header.Set("Content-Type", "application/json")
	if strings.TrimSpace(c.APIKey) != "" {
		req.Header.Set("Authorization", "Bearer "+c.APIKey)
		req.Header.Set("X-API-Key", c.APIKey)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return models.Message{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return models.Message{}, fmt.Errorf("HTTP %d", resp.StatusCode)
	}

	var res luckyHarnessChatResponse
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return models.Message{}, err
	}
	if strings.TrimSpace(res.Response) == "" {
		return models.Message{}, fmt.Errorf("empty luckyharness response")
	}

	if conversationID != "" && strings.TrimSpace(res.SessionID) != "" {
		c.setLuckyHarnessSession(conversationID, res.SessionID)
	}

	return models.Message{Content: res.Response}, nil
}

func buildLuckyHarnessPrompt(messages []models.AgentMessage) string {
	if len(messages) == 0 {
		return ""
	}

	var systemParts []string
	var contextParts []string
	var userMessage string

	for _, msg := range messages {
		content := strings.TrimSpace(msg.Content)
		if content == "" {
			continue
		}

		switch strings.ToLower(strings.TrimSpace(msg.Role)) {
		case "system":
			systemParts = append(systemParts, content)
		case "user":
			userMessage = content
		case "assistant":
			contextParts = append(contextParts, "Assistant history:\n"+content)
		default:
			contextParts = append(contextParts, msg.Role+":\n"+content)
		}
	}

	var builder strings.Builder
	if len(systemParts) > 0 {
		builder.WriteString("System instructions:\n")
		builder.WriteString(strings.Join(systemParts, "\n\n"))
		builder.WriteString("\n\n")
	}
	if len(contextParts) > 0 {
		builder.WriteString("Additional context:\n")
		builder.WriteString(strings.Join(contextParts, "\n\n"))
		builder.WriteString("\n\n")
	}
	if userMessage != "" {
		builder.WriteString("User message:\n")
		builder.WriteString(userMessage)
	}

	return strings.TrimSpace(builder.String())
}

func (c *Client) getLuckyHarnessSession(conversationID string) string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.luckySessionByConv[conversationID]
}

func (c *Client) setLuckyHarnessSession(conversationID, sessionID string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.luckySessionByConv[conversationID] = sessionID
}
