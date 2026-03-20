package handlers

import (
	"net/http"

	"shajarah-backend/internal/models"
	"shajarah-backend/internal/repository"

	"github.com/gin-gonic/gin"
)

type DashboardHandler struct {
	userRepo   *repository.UserRepository
	personRepo *repository.PersonRepository
	memberRepo *repository.MemberRepository
	notifRepo  *repository.NotificationRepository
}

func NewDashboardHandler(
	userRepo *repository.UserRepository,
	personRepo *repository.PersonRepository,
	memberRepo *repository.MemberRepository,
	notifRepo *repository.NotificationRepository,
) *DashboardHandler {
	return &DashboardHandler{userRepo, personRepo, memberRepo, notifRepo}
}

func (h *DashboardHandler) GetDashboard(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.GetString("user_id")
	personID := c.GetString("person_id")

	user, err := h.userRepo.GetUserByID(ctx, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	var person *models.Person
	if personID != "" {
		person, _ = h.personRepo.GetPersonByID(ctx, personID)
	}

	families, _ := h.memberRepo.GetUserFamiliesWithStats(ctx, userID)
	if families == nil {
		families = []models.FamilyWithStats{}
	}

	unread, _ := h.notifRepo.CountUnread(ctx, userID)

	c.JSON(http.StatusOK, gin.H{
		"user":                 user,
		"person":               person,
		"families":             families,
		"unread_notifications": unread,
	})
}
