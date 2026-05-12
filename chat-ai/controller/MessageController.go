package controller

import (
	"fmt"
	"log/slog"
	"math/rand"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"chat-ai/dbaccess"
	"chat-ai/internal/auth"
	"chat-ai/internal/client"
	"chat-ai/internal/models"
	"chat-ai/internal/service"

	"github.com/gin-gonic/gin"
)

type MessageController struct{}

var nudgeState = struct {
	mu       sync.Mutex
	turn     int64
	lastTurn map[string]int64
	rng      *rand.Rand
}{
	lastTurn: map[string]int64{},
	rng:      rand.New(rand.NewSource(time.Now().UnixNano())),
}

var missingMemoryTableWarnOnce sync.Once

func NewMessageController() *MessageController {
	return &MessageController{}
}

func requireAuthorizedUserID(c *gin.Context) (int64, error) {
	token := auth.ExtractBearerToken(c.GetHeader("Authorization"))
	sub, err := auth.ParseUserIDFromToken(token)
	if err != nil {
		return 0, err
	}

	userID, err := strconv.ParseInt(strings.TrimSpace(sub), 10, 64)
	if err != nil || userID <= 0 {
		return 0, fmt.Errorf("invalid user id in token")
	}

	return userID, nil
}

func isRAGEnabled() bool {
	return strings.EqualFold(strings.TrimSpace(os.Getenv("RAG_ENABLED")), "true")
}

func isRAGWriteEnabled() bool {
	// 默认开启写入，便于在灰度读取前先积累记忆数据
	v := strings.TrimSpace(os.Getenv("RAG_WRITE_ENABLED"))
	if v == "" {
		return true
	}
	return strings.EqualFold(v, "true")
}

func newMemoryServiceFromEnv() (*service.MemoryService, error) {
	apiKey := strings.TrimSpace(os.Getenv("OPENAI_API_KEY"))
	if apiKey == "" {
		return nil, fmt.Errorf("OPENAI_API_KEY is required")
	}

	embeddingURL := strings.TrimSpace(os.Getenv("OPENAI_EMBEDDING_URL"))
	if embeddingURL == "" {
		embeddingURL = "https://api.openai.com/v1/embeddings"
	}

	embeddingModel := strings.TrimSpace(os.Getenv("OPENAI_EMBEDDING_MODEL"))
	if embeddingModel == "" {
		embeddingModel = "text-embedding-3-small"
	}

	embedder := client.NewEmbeddingClient(apiKey, embeddingURL, embeddingModel)
	return service.NewMemoryService(embedder), nil
}

func embeddingModelFromEnv() string {
	model := strings.TrimSpace(os.Getenv("OPENAI_EMBEDDING_MODEL"))
	if model == "" {
		return "text-embedding-3-small"
	}
	return model
}

func persistChunkWithEmbedding(memorySvc *service.MemoryService, userID int64, conversationID, role, content string) {
	chunkID, err := dbaccess.InsertMemoryChunk(userID, conversationID, role, content, "{}")
	if err != nil {
		slog.Warn("Failed to write memory chunk", "role", role, "err", err)
		return
	}

	vec, err := memorySvc.Embedder.Embed(content)
	if err != nil {
		slog.Warn("Failed to embed memory chunk", "role", role, "err", err)
		return
	}

	if err := dbaccess.UpdateChunkEmbedding(chunkID, vec, embeddingModelFromEnv()); err != nil {
		slog.Warn("Failed to update memory chunk embedding", "role", role, "err", err)
	}
}

func isMemoryNudgeEnabled() bool {
	v := strings.TrimSpace(os.Getenv("MEMORY_NUDGE_ENABLED"))
	if v == "" {
		return true
	}
	return strings.EqualFold(v, "true")
}

func memoryNudgeProbability() float64 {
	v := strings.TrimSpace(os.Getenv("MEMORY_NUDGE_PROB"))
	if v == "" {
		return 0.20
	}
	p, err := strconv.ParseFloat(v, 64)
	if err != nil {
		return 0.20
	}
	if p < 0 {
		return 0
	}
	if p > 1 {
		return 1
	}
	return p
}

func memoryNudgeCooldownTurns() int64 {
	v := strings.TrimSpace(os.Getenv("MEMORY_NUDGE_COOLDOWN_TURNS"))
	if v == "" {
		return 5
	}
	n, err := strconv.ParseInt(v, 10, 64)
	if err != nil || n < 0 {
		return 5
	}
	return n
}

func memoryNudgeExcludeRecent() int {
	v := strings.TrimSpace(os.Getenv("MEMORY_NUDGE_EXCLUDE_RECENT"))
	if v == "" {
		return 8
	}
	n, err := strconv.Atoi(v)
	if err != nil || n < 0 {
		return 8
	}
	return n
}

func memoryNudgeMaxChars() int {
	v := strings.TrimSpace(os.Getenv("MEMORY_NUDGE_MAX_CHARS"))
	if v == "" {
		return 160
	}
	n, err := strconv.Atoi(v)
	if err != nil || n <= 0 {
		return 160
	}
	return n
}

func shouldInjectMemoryNudge(userID int64, conversationID string) bool {
	if !isMemoryNudgeEnabled() {
		return false
	}

	p := memoryNudgeProbability()
	if p <= 0 {
		return false
	}

	cooldown := memoryNudgeCooldownTurns()
	key := fmt.Sprintf("%d:%s", userID, conversationID)

	nudgeState.mu.Lock()
	defer nudgeState.mu.Unlock()

	nudgeState.turn++
	currentTurn := nudgeState.turn

	if cooldown > 0 {
		if lastTurn, ok := nudgeState.lastTurn[key]; ok && currentTurn-lastTurn <= cooldown {
			return false
		}
	}

	if nudgeState.rng.Float64() >= p {
		return false
	}

	nudgeState.lastTurn[key] = currentTurn
	return true
}

func truncateRunes(s string, maxChars int) string {
	content := strings.TrimSpace(s)
	if content == "" {
		return ""
	}
	if maxChars <= 0 {
		return content
	}
	runes := []rune(content)
	if len(runes) <= maxChars {
		return content
	}
	return string(runes[:maxChars]) + "..."
}

func isOverlappingWithCurrentInput(candidate, currentInput string) bool {
	inputNormalized := strings.ToLower(strings.TrimSpace(currentInput))
	candidateNormalized := strings.ToLower(strings.TrimSpace(candidate))
	if inputNormalized == "" || candidateNormalized == "" {
		return false
	}
	return strings.Contains(candidateNormalized, inputNormalized) || strings.Contains(inputNormalized, candidateNormalized)
}

func buildNudgePrompt(role, content string) *models.AgentMessage {
	return &models.AgentMessage{
		Role: "system",
		Content: fmt.Sprintf(
			"你可以在回答里自然地提及一条历史记忆（若不相关就不要提及），禁止生硬插入或编造。可选记忆：(%s) %s",
			role,
			content,
		),
	}
}

func buildLegacyNudgeMessage(userID int64, currentInput string) *models.AgentMessage {
	legacy, err := dbaccess.GetRandomLegacyMessageByUser(userID, memoryNudgeExcludeRecent())
	if err != nil {
		slog.Warn("Legacy nudge query failed", "err", err)
		return nil
	}
	if legacy == nil {
		return nil
	}

	nudgeContent := truncateRunes(legacy.Content, memoryNudgeMaxChars())
	if nudgeContent == "" || isOverlappingWithCurrentInput(nudgeContent, currentInput) {
		return nil
	}
	return buildNudgePrompt("legacy", nudgeContent)
}

func buildMemoryNudgeMessage(userID int64, conversationID, currentInput string) *models.AgentMessage {
	if !shouldInjectMemoryNudge(userID, conversationID) {
		return nil
	}

	hit, err := dbaccess.GetRandomMemoryChunk(userID, conversationID, memoryNudgeExcludeRecent())
	if err != nil {
		errLower := strings.ToLower(err.Error())
		if strings.Contains(errLower, "memory_chunks") && strings.Contains(errLower, "does not exist") {
			missingMemoryTableWarnOnce.Do(func() {
				slog.Warn("Memory nudge skipped: memory_chunks table not found")
			})
			return buildLegacyNudgeMessage(userID, currentInput)
		}
		slog.Warn("Memory nudge query failed", "err", err)
		return buildLegacyNudgeMessage(userID, currentInput)
	}
	if hit == nil {
		return buildLegacyNudgeMessage(userID, currentInput)
	}

	nudgeContent := truncateRunes(hit.Content, memoryNudgeMaxChars())
	if nudgeContent == "" || isOverlappingWithCurrentInput(nudgeContent, currentInput) {
		return buildLegacyNudgeMessage(userID, currentInput)
	}
	return buildNudgePrompt(hit.Role, nudgeContent)
}

func (mc *MessageController) GetMessages(c *gin.Context) {
	userID, err := requireAuthorizedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Please log in before viewing chat history"})
		return
	}

	conversationID := strings.TrimSpace(c.Query("conversation_id"))
	if conversationID == "" {
		conversationID = "default"
	}

	limit := 100
	if rawLimit := strings.TrimSpace(c.Query("limit")); rawLimit != "" {
		if parsed, parseErr := strconv.Atoi(rawLimit); parseErr == nil && parsed > 0 {
			if parsed > 100 {
				parsed = 100
			}
			limit = parsed
		}
	}

	history, err := dbaccess.ListMessagesByConversation(userID, conversationID, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"messages": history})
}

func normalizeChatInput(c *gin.Context) (models.ChatInput, string, int, error) {
	userID, err := requireAuthorizedUserID(c)
	if err != nil {
		return models.ChatInput{}, "", http.StatusUnauthorized, fmt.Errorf("Please log in before chatting")
	}

	var req models.ChatInput
	if err := c.ShouldBindJSON(&req); err != nil {
		return models.ChatInput{}, "", http.StatusBadRequest, fmt.Errorf("JSON 格式错误")
	}

	content := strings.TrimSpace(req.Content)
	if content == "" {
		return models.ChatInput{}, "", http.StatusBadRequest, fmt.Errorf("Content cannot be empty")
	}

	req.UserID = userID
	req.ConversationID = strings.TrimSpace(req.ConversationID)
	if req.ConversationID == "" {
		req.ConversationID = "default"
	}

	return req, content, 0, nil
}

func buildChatMessages(req models.ChatInput, content string) ([]models.AgentMessage, *service.MemoryService, int, error) {
	userMessage := models.AgentMessage{
		Role:    "user",
		Content: content,
	}

	messages := make([]models.AgentMessage, len(client.History))
	copy(messages, client.History)

	ragEnabled := isRAGEnabled()
	ragWriteEnabled := isRAGWriteEnabled()

	needMemorySvc := ragEnabled || ragWriteEnabled
	var memorySvc *service.MemoryService
	addedRAGContext := false

	if needMemorySvc {
		svc, err := newMemoryServiceFromEnv()
		if err != nil {
			if ragEnabled {
				slog.Warn("RAG disabled by config error, fallback to legacy memory", "err", err)
			}
			if ragWriteEnabled {
				slog.Warn("RAG write disabled by config error", "err", err)
			}
		} else {
			memorySvc = svc
			if ragEnabled {
				ragContext, err := memorySvc.BuildRAGContext(req.UserID, req.ConversationID, content)
				if err != nil {
					slog.Warn("Failed to build RAG context, fallback to legacy memory", "err", err)
				} else if len(ragContext) > 0 {
					messages = append(messages, ragContext...)
					addedRAGContext = true
				}
			}
		}
	}

	if !addedRAGContext {
		todayMessage, err := dbaccess.GetRecentMessages_db(req.UserID, req.ConversationID)
		if err != nil {
			return nil, memorySvc, http.StatusInternalServerError, fmt.Errorf("failed to load recent messages: %w", err)
		}
		slog.Info("Legacy memory context loaded", "content_len", len(todayMessage.Content))
		if todayMessage.Content != "" {
			messages = append(messages, todayMessage)
		}
	}

	if nudgeMessage := buildMemoryNudgeMessage(req.UserID, req.ConversationID, content); nudgeMessage != nil {
		messages = append(messages, *nudgeMessage)
	}
	messages = append(messages, userMessage)

	return messages, memorySvc, 0, nil
}

func persistChatExchange(req models.ChatInput, content string, reply *models.Message, memorySvc *service.MemoryService) (int, error) {
	userRecord := models.Message{
		Content:        content,
		UserID:         req.UserID,
		Role:           "user",
		ConversationID: req.ConversationID,
	}
	if err := dbaccess.CreateMessage_db(&userRecord); err != nil {
		return http.StatusInternalServerError, err
	}

	reply.Role = "assistant"
	reply.ConversationID = req.ConversationID
	reply.UserID = req.UserID
	if err := dbaccess.CreateMessage_db(reply); err != nil {
		return http.StatusInternalServerError, err
	}

	if isRAGWriteEnabled() && memorySvc != nil {
		persistChunkWithEmbedding(memorySvc, req.UserID, req.ConversationID, "user", content)
		persistChunkWithEmbedding(memorySvc, req.UserID, req.ConversationID, "assistant", reply.Content)
	}

	return 0, nil
}

func generateChatReply(req models.ChatInput, content string) (models.Message, int, error) {
	messages, memorySvc, status, err := buildChatMessages(req, content)
	if err != nil {
		return models.Message{}, status, err
	}

	reply, err := client.DefaulClient.Chat(messages, req.ConversationID)
	if err != nil {
		return models.Message{}, http.StatusBadGateway, fmt.Errorf("upstream chat service unavailable: %w", err)
	}
	if status, err := persistChatExchange(req, content, &reply, memorySvc); err != nil {
		return models.Message{}, status, err
	}

	return reply, 0, nil
}

func (mc *MessageController) CreateMessage(c *gin.Context) {
	req, content, status, err := normalizeChatInput(c)
	if err != nil {
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	reply, status, err := generateChatReply(req, content)
	if err != nil {
		c.JSON(status, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"text": reply.Content,
	})
}

func (mc *MessageController) CreateMessageStream(c *gin.Context) {
	req, content, status, err := normalizeChatInput(c)
	if err != nil {
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")
	c.SSEvent("start", gin.H{"conversation_id": req.ConversationID})
	c.Writer.Flush()

	messages, memorySvc, status, err := buildChatMessages(req, content)
	if err != nil {
		c.SSEvent("error", gin.H{"error": err.Error(), "status": status})
		c.Writer.Flush()
		return
	}

	var fullText strings.Builder
	reply, err := client.DefaulClient.StreamChat(messages, req.ConversationID, func(delta string) error {
		fullText.WriteString(delta)
		c.SSEvent("delta", gin.H{
			"delta": delta,
			"text":  fullText.String(),
		})
		c.Writer.Flush()
		return nil
	})
	if err != nil {
		c.SSEvent("error", gin.H{"error": err.Error(), "status": http.StatusBadGateway})
		c.Writer.Flush()
		return
	}
	if strings.TrimSpace(reply.Content) == "" {
		reply.Content = fullText.String()
	}
	if status, err := persistChatExchange(req, content, &reply, memorySvc); err != nil {
		c.SSEvent("error", gin.H{"error": err.Error(), "status": status})
		c.Writer.Flush()
		return
	}

	c.SSEvent("done", gin.H{"text": reply.Content})
	c.Writer.Flush()
}
