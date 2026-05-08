package models

import "time"

type Message struct {
	ID             int64     `db:"id" json:"id"`
	Content        string    `db:"content" json:"content"`
	UserID         int64     `db:"user_id" json:"user_id"`
	Role           string    `db:"role" json:"role"`
	ConversationID string    `db:"conversation_id" json:"conversation_id"`
	CreatedAt      time.Time `db:"created_at" json:"created_at"`
}
