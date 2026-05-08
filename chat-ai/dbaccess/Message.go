package dbaccess

import (
	"database/sql"
	"errors"
	"fmt"
	"log"
	"log/slog"
	"os"
	"strings"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/jmoiron/sqlx"

	"chat-ai/internal/models"
)

var DB *sqlx.DB

func InitDB() {
	var err error
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		slog.Error("Missing get database info", "dsn", dsn)
	}
	DB, err = sqlx.Connect("pgx", dsn)
	if err != nil {
		log.Fatalln(err)
	}

	DB.SetMaxOpenConns(20)
	DB.SetMaxIdleConns(10)
	log.Println("数据库初始化成功，连接池已就绪")
}

func GetMessage_db(id string) (*models.Message, error) {
	var message models.Message
	err := DB.Get(&message, "SELECT * FROM messages WHERE id = $1", id)
	return &message, err
}

func CreateMessage_db(message *models.Message) error {
	if strings.TrimSpace(message.ConversationID) == "" {
		message.ConversationID = "default"
	}
	if strings.TrimSpace(message.Role) == "" {
		message.Role = "assistant"
	}

	_, err := DB.NamedExec(
		"INSERT INTO messages (content, user_id, role, conversation_id) VALUES (:content, :user_id, :role, :conversation_id)",
		message,
	)
	return err
}

func ListMessagesByConversation(userID int64, conversationID string, limit int) ([]models.Message, error) {
	if strings.TrimSpace(conversationID) == "" {
		conversationID = "default"
	}
	if limit <= 0 {
		limit = 100
	}
	if limit > 100 {
		limit = 100
	}

	var rows []models.Message
	err := DB.Select(
		&rows,
		`
		SELECT id, user_id, role, conversation_id, content, created_at
		FROM messages
		WHERE user_id = $1 AND conversation_id = $2
		ORDER BY created_at DESC
		LIMIT $3
		`,
		userID,
		conversationID,
		limit,
	)
	if err != nil {
		return nil, err
	}

	// 前端按时间正序更自然
	for i, j := 0, len(rows)-1; i < j; i, j = i+1, j-1 {
		rows[i], rows[j] = rows[j], rows[i]
	}

	return rows, nil
}

func GetRecentMessages_db(userID int64, conversationID string) (models.AgentMessage, error) {
	slog.Info("GetRecentMessages_db started", "user_id", userID, "conversation_id", conversationID)

	rows, err := ListMessagesByConversation(userID, conversationID, 2)
	if err != nil {
		slog.Error("Failed to get data from db", "err", err)
		return models.AgentMessage{}, err
	}

	if len(rows) == 0 {
		slog.Info("No recent messages found")
		return models.AgentMessage{}, nil
	}

	var combinedContent string
	for _, row := range rows {
		role := strings.TrimSpace(row.Role)
		if role == "" {
			role = "assistant"
		}
		combinedContent += fmt.Sprintf("[%s]: %s (Today)\n", role, row.Content)
	}

	return models.AgentMessage{
		Role:    "system",
		Content: combinedContent,
	}, nil
}

func GetRandomLegacyMessageByUser(userID int64, excludeRecent int) (*models.Message, error) {
	const q = `
		SELECT id, user_id, role, conversation_id, content, created_at
		FROM messages
		WHERE user_id = $1
		  AND content IS NOT NULL
		  AND btrim(content) <> ''
		  AND id NOT IN (
		    SELECT id
		    FROM messages
		    WHERE user_id = $1
		    ORDER BY created_at DESC
		    LIMIT $2
		  )
		ORDER BY random()
		LIMIT 1
	`

	var row models.Message
	err := DB.Get(&row, q, userID, excludeRecent)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	return &row, nil
}
