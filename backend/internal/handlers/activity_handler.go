package handlers

import (
	"net/http"

	"shajarah-backend/internal/models"
	"shajarah-backend/internal/repository"

	"github.com/gin-gonic/gin"
)

type ActivityHandler struct {
	auditRepo  *repository.AuditRepository
	memberRepo *repository.MemberRepository
}

func NewActivityHandler(auditRepo *repository.AuditRepository, memberRepo *repository.MemberRepository) *ActivityHandler {
	return &ActivityHandler{auditRepo: auditRepo, memberRepo: memberRepo}
}

func (h *ActivityHandler) GetActivity(c *gin.Context) {
	familyID := c.Param("id")
	userID := c.GetString("user_id")

	_, err := h.memberRepo.GetMemberRole(c.Request.Context(), familyID, userID)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "not a family member"})
		return
	}

	logs, err := h.auditRepo.GetByFamilyID(c.Request.Context(), familyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if logs == nil {
		logs = []models.AuditLog{}
	}

	c.JSON(http.StatusOK, gin.H{"activity": logs})
}
