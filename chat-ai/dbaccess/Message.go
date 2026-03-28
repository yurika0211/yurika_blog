package dbaccess

import (
	"database/sql"
	"errors"
	"fmt"
	"log"
	"log/slog"
	"os"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/jmoiron/sqlx"

	// 导入postgresql
	"chat-ai/internal/models"
)

var DB *sqlx.DB

func InitDB() {
	var err error
	// Connect 相当于 sql.Open + db.Ping
	// dsn (Data Source Name) 格式取决于驱动
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		slog.Error("Missing get database info", "dsn", dsn)
	}
	DB, err = sqlx.Connect("pgx", dsn)
	if err != nil {
		log.Fatalln(err)
	}

	// 设置连接池配置 (最佳实践)
	DB.SetMaxOpenConns(20) // 最大打开连接数
	DB.SetMaxIdleConns(10) // 最大空闲连接数
	log.Println("数据库初始化成功，连接池已就绪")
}

/**
 * 获取一条消息记录
 */
func GetMessage_db(id string) (*models.Message, error) {
	var message models.Message
	err := DB.Get(&message, "SELECT * FROM messages WHERE id = $1", id)
	return &message, err
}

/**
 * 创建一条消息记录
 */
func CreateMessage_db(message *models.Message) error {
	_, err := DB.NamedExec("INSERT INTO messages (content, user_id) VALUES (:content, :user_id)", message)
	return err
}

/**
 * 查询近期的两条消息，并且拼接
 */
func GetRecentMessages_db() (models.AgentMessage, error) {
	slog.Info("GetRecentMessages_db started")

	type recentRow struct {
		Content string `db:"content"`
	}
	// 1. 定义切片来接收数据库查询结果
	var rows []recentRow
	if err := DB.Select(&rows, "SELECT content FROM messages ORDER BY created_at DESC LIMIT 2"); err != nil {
		slog.Error("Failed to get data from db", "err", err)
		return models.AgentMessage{}, err
	}
	slog.Info("Fetched recent rows from db", "rows", len(rows))

	if len(rows) == 0 {
		slog.Info("No recent messages found")
		return models.AgentMessage{}, nil
	}
	// 2. 定义一个字符串变量，用来“拼接”所有内容
	var combinedContent string

	// 3. 循环所有记录，拼接到 combinedContent 里
	for i := len(rows) - 1; i >= 0; i-- {
		// 拼接格式示例： "[user]: 你好 (Today)\n"
		// 这样 AI 就能读懂是谁说的，以及具体内容
		combinedContent += fmt.Sprintf("[user]: %s (Today)\n", rows[i].Content)
	}
	slog.Info("Combined recent messages", "combined_length", len(combinedContent))

	// 4. 返回【一个】汇总后的对象
	// 这样你的 Controller 收到的就是包含所有历史的一条“大消息”
	return models.AgentMessage{
		Role:    "system", // 建议设为 system，代表这是背景知识/历史上下文
		Content: combinedContent,
	}, nil
}

func GetRandomLegacyMessageByUser(userID int64, excludeRecent int) (*models.Message, error) {
	const q = `
		SELECT id, user_id, content, created_at
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
