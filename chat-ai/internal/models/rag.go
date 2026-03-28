package models

import "time"

type MemoryHit struct {
	ID        int64     `db:"id" json:"id"`
	Role      string    `db:"role" json:"role"`
	Content   string    `db:"content" json:"content"`
	Score     float64   `db:"score" json:"score"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
}

type ChatInput struct {
	Content        string `json:"content"`
	UserID         int64  `json:"user_id"`
	ConversationID string `json:"conversation_id"`
}
