package client

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"

	"chat-ai/internal/models"
)

type ChatRequest struct {
	Model    string                `json:"model"`
	Messages []models.AgentMessage `json:"messages"`
}

type ChatResponse struct {
	Choices []struct {
		Message models.Message `json:"message"`
	} `json:"choices"`
}

type Client struct {
	APIKey string
	URL    string
	Model  string
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

/**
 * 初始化默认的client实例
 * @param apiKey string
 * @param url string
 * @param model string
 */
func InitClient(apiKey, url, model string) {
	DefaulClient = NewClient(apiKey, url, model)
}

/**
 * 返回一个新的client实例
 * @param apiKey string
 * @param url string
 * @param model string
 * @return *Client
 */
func NewClient(apiKey, url, model string) *Client {
	return &Client{
		APIKey: apiKey,
		URL:    url,
		Model:  model,
	}
}

/**
 * 通过http请求调用apikey,获取返回的ai生成文本
 * @param messages []models.Message
 * @return models.Message, error
 */

func (c *Client) Chat(am []models.AgentMessage) (models.Message, error) {
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
	json.NewDecoder(resp.Body).Decode(&res)
	if len(res.Choices) == 0 {
		return models.Message{}, fmt.Errorf("no choices returned")
	}

	return res.Choices[0].Message, nil
}
