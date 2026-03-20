package handlers

import (
	"net/http"

	"shajarah-backend/internal/models"
	"shajarah-backend/internal/repository"

	"github.com/gin-gonic/gin"
)

type NotificationHandler struct {
	repo *repository.NotificationRepository
}

func NewNotificationHandler(repo *repository.NotificationRepository) *NotificationHandler {
	return &NotificationHandler{repo: repo}
}

func (h *NotificationHandler) GetNotifications(c *gin.Context) {
	userID := c.GetString("user_id")

	notifs, err := h.repo.GetByUserID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if notifs == nil {
		notifs = []models.Notification{}
	}

	unread, _ := h.repo.CountUnread(c.Request.Context(), userID)

	c.JSON(http.StatusOK, gin.H{"notifications": notifs, "unread": unread})
}

func (h *NotificationHandler) MarkRead(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetString("user_id")

	if err := h.repo.MarkRead(c.Request.Context(), id, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "marked as read"})
}

func (h *NotificationHandler) GetUnreadCount(c *gin.Context) {
	userID := c.GetString("user_id")
	count, _ := h.repo.CountUnread(c.Request.Context(), userID)
	c.JSON(http.StatusOK, gin.H{"unread": count})
}
