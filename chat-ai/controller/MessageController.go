package controller

import (
	"chat-ai/dbaccess"
	"chat-ai/internal/client"
	"chat-ai/internal/models"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

type MessageController struct {
}

func NewMessageController() *MessageController {
	return &MessageController{}
}

func (mc *MessageController) GetMessages(c *gin.Context) {
	// 逻辑：获取 ID -> 查询数据库 -> 返回
	id := c.Query("id")

	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "id is required",
		})
		return
	}

	message, err := dbaccess.GetMessage_db(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"id":   message.ID,
		"text": message.Content,
	})
}

func (mc *MessageController) CreateMessage(c *gin.Context) {
	// content := c.PostForm("content")
	// 定义一个临时的结构体来接收 JSON
	var jsonReq struct {
		Content string `json:"content"` // 注意：这里必须对应前端传的 key
	}

	// 尝试解析 JSON
	if err := c.ShouldBindJSON(&jsonReq); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "JSON 格式错误"})
		return
	}

	// 3. 把解析出来的内容赋值给 content 变量，这样后面的代码就不用动了
	content := jsonReq.Content

	if content == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Content cannot be empty"})
		return
	}
	userMessage := models.AgentMessage{
		Role:    "user",
		Content: content,
	}

	todayMessage, err := dbaccess.GetRecentMessages_db()

	log.Println(todayMessage)

	client.History = append(client.History, todayMessage)

	client.History = append(client.History, userMessage)

	reply, err := client.DefaulClient.Chat(client.History)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	if err := dbaccess.CreateMessage_db(&reply); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"text": reply,
	})
}
