package handlers

import (
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"shajarah-backend/internal/models"
	"shajarah-backend/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type InvitationHandler struct {
	repo       *repository.InvitationRepository
	memberRepo *repository.MemberRepository
	familyRepo *repository.FamilyRepository
	userRepo   *repository.UserRepository
	notifRepo  *repository.NotificationRepository
}

func NewInvitationHandler(
	repo *repository.InvitationRepository,
	memberRepo *repository.MemberRepository,
	familyRepo *repository.FamilyRepository,
	userRepo *repository.UserRepository,
	notifRepo *repository.NotificationRepository,
) *InvitationHandler {
	return &InvitationHandler{
		repo:       repo,
		memberRepo: memberRepo,
		familyRepo: familyRepo,
		userRepo:   userRepo,
		notifRepo:  notifRepo,
	}
}

func (h *InvitationHandler) Invite(c *gin.Context) {
	familyID := c.Param("id")
	userID := c.GetString("user_id")

	role, err := h.memberRepo.GetMemberRole(c.Request.Context(), familyID, userID)
	if err != nil || role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "admin access required"})
		return
	}

	var req models.InviteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	inv := models.Invitation{
		ID:        uuid.New().String(),
		FamilyID:  familyID,
		Email:     req.Email,
		Role:      req.Role,
		Status:    "pending",
		Token:     uuid.New().String(),
		InvitedBy: userID,
		CreatedAt: time.Now(),
	}

	if err := h.repo.CreateInvitation(c.Request.Context(), &inv); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Find the Shajarah user with the invited email and send them an in-app notification
	family, familyErr := h.familyRepo.GetFamilyByID(c.Request.Context(), familyID)
	invitedUser, userErr := h.userRepo.GetUserByEmail(c.Request.Context(), req.Email)
	if familyErr == nil && userErr == nil {
		message := fmt.Sprintf(
			"You've been invited to join the \"%s\" family tree as %s. Accept: /invitations/accept?token=%s",
			family.Name, req.Role, inv.Token,
		)
		notif := &models.Notification{
			ID:        uuid.New().String(),
			UserID:    invitedUser.ID,
			FamilyID:  familyID,
			Type:      "invitation",
			Ref:       inv.Token,
			Message:   message,
			Read:      false,
			CreatedAt: time.Now(),
		}
		if err := h.notifRepo.Create(c.Request.Context(), notif); err != nil {
			slog.Warn("failed to create invitation notification", "error", err, "user_id", invitedUser.ID)
		}
	}

	c.JSON(http.StatusCreated, inv)
}

func (h *InvitationHandler) ListInvitations(c *gin.Context) {
	familyID := c.Param("id")
	userID := c.GetString("user_id")

	role, err := h.memberRepo.GetMemberRole(c.Request.Context(), familyID, userID)
	if err != nil || role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "admin access required"})
		return
	}

	invitations, err := h.repo.GetByFamilyID(c.Request.Context(), familyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if invitations == nil {
		invitations = []models.Invitation{}
	}

	c.JSON(http.StatusOK, invitations)
}

func (h *InvitationHandler) AcceptInvitation(c *gin.Context) {
	token := c.Param("token")
	userID := c.GetString("user_id")

	inv, err := h.repo.GetByToken(c.Request.Context(), token)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "invitation not found"})
		return
	}

	if inv.Status != "pending" {
		c.JSON(http.StatusConflict, gin.H{"error": "invitation already used"})
		return
	}

	if err := h.memberRepo.AddMember(c.Request.Context(), inv.FamilyID, userID, inv.Role); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if err := h.repo.UpdateStatus(c.Request.Context(), inv.ID, "accepted"); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Notify the family admin that the invite was accepted
	family, familyErr := h.familyRepo.GetFamilyByID(c.Request.Context(), inv.FamilyID)
	if familyErr == nil && inv.InvitedBy != "" {
		message := fmt.Sprintf("Your invitation to \"%s\" was accepted.", family.Name)
		notif := &models.Notification{
			ID:        uuid.New().String(),
			UserID:    inv.InvitedBy,
			FamilyID:  inv.FamilyID,
			Type:      "general",
			Message:   message,
			Read:      false,
			CreatedAt: time.Now(),
		}
		if err := h.notifRepo.Create(c.Request.Context(), notif); err != nil {
			slog.Warn("failed to create accept notification", "error", err)
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "joined family", "family_id": inv.FamilyID, "role": inv.Role})
}
