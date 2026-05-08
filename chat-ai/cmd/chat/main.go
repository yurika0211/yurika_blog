package main

import (
	"log/slog"
	"os"

	"chat-ai/dbaccess"
	"chat-ai/internal/client"
	"chat-ai/routes"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func mustEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		slog.Error("Missing required env", "key", key)
		os.Exit(1)
	}
	return v
}

func getEnv(key, def string) string {
	v := os.Getenv(key)
	if v == "" {
		return def
	}
	return v
}

func main() {
	_ = godotenv.Load("../.env", ".env")

	provider := getEnv("CHAT_PROVIDER", "openai")
	apiKey := ""
	apiURL := ""

	if provider == "luckyharness" {
		apiKey = getEnv("LUCKYHARNESS_API_KEY", "")
		apiURL = mustEnv("LUCKYHARNESS_API_URL")
	} else {
		apiKey = mustEnv("OPENAI_API_KEY")
		apiURL = mustEnv("OPENAI_API_URL")
	}

	model := getEnv("OPENAI_MODEL", "deepseek-chat")
	port := getEnv("CHAT_PORT", "8080")
	systemContent := mustEnv("SYSTEM_CONTENT")

	client.InitClient(provider, apiKey, apiURL, model)
	client.SetSystemPrompt(systemContent)

	// 初始化一个gin引擎，并绑定端口号
	r := gin.Default()
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept, Origin")
		c.Writer.Header().Set("Access-Control-Max-Age", "86400")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})
	dbaccess.InitDB()
	// 初始化路由
	r = routes.InitRouter(r)
	r.Run(":" + port)
}
