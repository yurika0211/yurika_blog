package dbaccess

import (
	"database/sql"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"chat-ai/internal/models"
)

func vectorLiteral(v []float32) string {
	// 生成 pgvector 字面量： [0.1,0.2,0.3]
	parts := make([]string, 0, len(v))
	for _, x := range v {
		parts = append(parts, strconv.FormatFloat(float64(x), 'f', -1, 32))
	}
	return "[" + strings.Join(parts, ",") + "]"
}

func InsertMemoryChunk(userID int64, conversationID, role, content string, metadata string) (int64, error) {
	const q = `
		INSERT INTO memory_chunks (user_id, conversation_id, role, content, metadata)
		VALUES ($1, $2, $3, $4, COALESCE($5::jsonb, '{}'::jsonb))
		RETURNING id
	`
	var id int64
	err := DB.Get(&id, q, userID, conversationID, role, content, metadata)
	return id, err
}

func UpdateChunkEmbedding(chunkID int64, embedding []float32, model string) error {
	const q = `
		UPDATE memory_chunks
		SET embedding = $1::vector,
		    embedding_model = $2
		WHERE id = $3
	`
	_, err := DB.Exec(q, vectorLiteral(embedding), model, chunkID)
	return err
}

func SearchRelevantMemory(userID int64, conversationID string, queryEmbedding []float32, topK int) ([]models.MemoryHit, error) {
	const q = `
		SELECT id, role, content, created_at,
		       1 - (embedding <=> $1::vector) AS score
		FROM memory_chunks
		WHERE user_id = $2
		  AND conversation_id = $3
		  AND embedding IS NOT NULL
		ORDER BY embedding <=> $1::vector
		LIMIT $4
	`

	rows := []models.MemoryHit{}
	err := DB.Select(&rows, q, vectorLiteral(queryEmbedding), userID, conversationID, topK)
	if err != nil {
		return nil, fmt.Errorf("search memory failed: %w", err)
	}
	return rows, nil
}

func GetRandomMemoryChunk(userID int64, conversationID string, excludeRecent int) (*models.MemoryHit, error) {
	const q = `
		SELECT id, role, content, created_at,
		       0.0 AS score
		FROM memory_chunks
		WHERE user_id = $1
		  AND conversation_id = $2
		  AND role = 'user'
		  AND content IS NOT NULL
		  AND btrim(content) <> ''
		  AND id NOT IN (
		    SELECT id
		    FROM memory_chunks
		    WHERE user_id = $1
		      AND conversation_id = $2
		    ORDER BY created_at DESC
		    LIMIT $3
		  )
		ORDER BY random()
		LIMIT 1
	`

	var row models.MemoryHit
	err := DB.Get(&row, q, userID, conversationID, excludeRecent)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("query random memory failed: %w", err)
	}

	return &row, nil
}
