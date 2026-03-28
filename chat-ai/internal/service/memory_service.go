package service

import (
	"fmt"
	"os"
	"strconv"
	"strings"

	"chat-ai/dbaccess"
	"chat-ai/internal/client"
	"chat-ai/internal/models"
)

type MemoryService struct {
	Embedder *client.EmbeddingClient
	TopK     int
}

func NewMemoryService(embedder *client.EmbeddingClient) *MemoryService {
	topK := 6
	if v := os.Getenv("RAG_TOP_K"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			topK = n
		}
	}
	return &MemoryService{Embedder: embedder, TopK: topK}
}

func (s *MemoryService) BuildRAGContext(userID int64, conversationID, query string) ([]models.AgentMessage, error) {
	qVec, err := s.Embedder.Embed(query)
	if err != nil {
		return nil, err
	}

	hits, err := dbaccess.SearchRelevantMemory(userID, conversationID, qVec, s.TopK)
	if err != nil {
		return nil, err
	}
	if len(hits) == 0 {
		return nil, nil
	}

	var b strings.Builder
	b.WriteString("以下是与当前问题最相关的历史记忆，请仅在相关时使用：\n")
	for _, h := range hits {
		b.WriteString(fmt.Sprintf("- (%s) %s\n", h.Role, h.Content))
	}

	return []models.AgentMessage{{Role: "system", Content: b.String()}}, nil
}
