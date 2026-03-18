package dbaccess

import (
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/jmoiron/sqlx"
	"log"
	//导入postgresql
	"chat-ai/internal/models"
	"fmt"
	"os"
)

var DB *sqlx.DB

func InitDB() {
	var err error
	// Connect 相当于 sql.Open + db.Ping
	// dsn (Data Source Name) 格式取决于驱动
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://admin:password123@localhost:5432/postgres?sslmode=disable"
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
 * 查询今天的所有消息，并且拼接
 */
func GetRecentMessages_db() (models.AgentMessage, error) {
	// 1. 定义切片来接收数据库查询结果
	var messages []models.AgentMessage
	if err := DB.Select(&messages, "SELECT content FROM messages ORDER BY created_at DESC LIMIT 2"); err != nil {
		return models.AgentMessage{}, err
	}

	// 2. 定义一个字符串变量，用来“拼接”所有内容
	var combinedContent string

	// 3. 循环所有记录，拼接到 combinedContent 里
	for _, msg := range messages {
		// 拼接格式示例： "[user]: 你好 (Today)\n"
		// 这样 AI 就能读懂是谁说的，以及具体内容
		combinedContent += fmt.Sprintf("[%s]: %s (Today)\n", msg.Role, msg.Content)
	}

	// 4. 返回【一个】汇总后的对象
	// 这样你的 Controller 收到的就是包含所有历史的一条“大消息”
	return models.AgentMessage{
		Role:    "system", // 建议设为 system，代表这是背景知识/历史上下文
		Content: combinedContent,
	}, nil
}
