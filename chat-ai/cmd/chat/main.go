package main

import (
	"chat-ai/dbaccess"
	"chat-ai/internal/client"
	"chat-ai/internal/models"
	"chat-ai/routes"
	"encoding/json"
	"fmt"
	"github.com/gin-gonic/gin"
	"os"
)

func main() {
	file, err := os.Open("./config.json")
	if err != nil {
		fmt.Println("无法打开配置文件:", err)
		return
	}
	defer file.Close()

	var cfg models.Config
	if err := json.NewDecoder(file).Decode(&cfg); err != nil {
		fmt.Println("解析配置文件失败:", err)
		return
	}

	if cfg.APIKey == "" || cfg.APIURL == "" || cfg.Model == "" {
		fmt.Println("配置文件中 api_key, api_url, model 都不能为空")
		return
	}

	client.InitClient(cfg.APIKey, cfg.APIURL, cfg.Model)

	//初始化一个gin引擎，并绑定端口号
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
	//初始化路由
	r = routes.InitRouter(r)
	r.Run(":8080")
}
