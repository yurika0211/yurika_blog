package routes

import (
	"chat-ai/controller"
	"github.com/gin-gonic/gin"
)

func InitRouter(r *gin.Engine) *gin.Engine {
	// realize a controller
	msgCtrl := new(controller.MessageController)

	v1 := r.Group("/api/v1")
	{
		msgGroup := v1.Group("/message")
		{
			msgGroup.GET("/", msgCtrl.GetMessages)
			msgGroup.POST("/", msgCtrl.CreateMessage)
		}
	}
	return r
}
