package models

import "time"

type Message struct {
	ID int64 `db:"id" json:"id"`
	// db 标签对应数据库列名，json 标签对应 Postman 发来的字段名
	Content   string    `db:"content" json:"content"`
	UserID    int64     `db:"user_id" json:"user_id"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
}
