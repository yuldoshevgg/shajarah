package handlers

import (
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"shajarah-backend/internal/database"
	"shajarah-backend/internal/models"
	"shajarah-backend/internal/repository"
	"shajarah-backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type InvitationHandler struct {
	repo             *repository.InvitationRepository
	memberRepo       *repository.MemberRepository
	familyRepo       *repository.FamilyRepository
	userRepo         *repository.UserRepository
	notifRepo        *repository.NotificationRepository
	personRepo       *repository.PersonRepository
	relRepo          *repository.RelationshipRepository
	treeSvc          *services.FamilyTreeService
	genealogyTreeSvc *services.GenealogyTreeService
}

func NewInvitationHandler(
	repo *repository.InvitationRepository,
	memberRepo *repository.MemberRepository,
	familyRepo *repository.FamilyRepository,
	userRepo *repository.UserRepository,
	notifRepo *repository.NotificationRepository,
	personRepo *repository.PersonRepository,
	relRepo *repository.RelationshipRepository,
	treeSvc *services.FamilyTreeService,
	genealogyTreeSvc *services.GenealogyTreeService,
) *InvitationHandler {
	return &InvitationHandler{
		repo:             repo,
		memberRepo:       memberRepo,
		familyRepo:       familyRepo,
		userRepo:         userRepo,
		notifRepo:        notifRepo,
		personRepo:       personRepo,
		relRepo:          relRepo,
		treeSvc:          treeSvc,
		genealogyTreeSvc: genealogyTreeSvc,
	}
}

// personNameForUser returns the display name of a user via their linked person node.
func (h *InvitationHandler) personNameForUser(ctx *gin.Context, userID string) string {
	if userID == "" {
		return "A family member"
	}
	u, err := h.userRepo.GetUserByID(ctx.Request.Context(), userID)
	if err != nil {
		return "A family member"
	}
	personID, _ := h.userRepo.GetPersonIDForUser(ctx.Request.Context(), userID)
	if personID != "" {
		var fn, ln string
		_ = database.DB.QueryRow(ctx.Request.Context(),
			`SELECT COALESCE(first_name,''), COALESCE(last_name,'') FROM persons WHERE id = $1`, personID,
		).Scan(&fn, &ln)
		if name := strings.TrimSpace(fn + " " + ln); name != "" {
			return name
		}
	}
	return u.Email
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

	// Ensure the invitee has an account
	if _, err := h.userRepo.GetUserByEmail(c.Request.Context(), req.Email); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No account found for " + req.Email + ". Ask them to register on Shajarah first."})
		return
	}

	inv := models.Invitation{
		ID:        uuid.New().String(),
		FamilyID:  familyID,
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

	// In-app notification
	family, familyErr := h.familyRepo.GetFamilyByID(c.Request.Context(), familyID)
	invitedUser, userErr := h.userRepo.GetUserByEmail(c.Request.Context(), req.Email)
	if familyErr == nil && userErr == nil {
		inviterName := h.personNameForUser(c, userID)
		message := fmt.Sprintf("%s|%s|%s|%s", inviterName, family.Name, req.Role, inv.Token)
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

func (h *InvitationHandler) GetInvitation(c *gin.Context) {
	token := c.Param("token")

	inv, err := h.repo.GetByToken(c.Request.Context(), token)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "invitation not found"})
		return
	}
	if inv.Status != "pending" {
		c.JSON(http.StatusGone, gin.H{"error": "invitation already used"})
		return
	}

	family, _ := h.familyRepo.GetFamilyByID(c.Request.Context(), inv.FamilyID)
	familyName := ""
	if family != nil {
		familyName = family.Name
	}

	var memberCount int
	_ = database.DB.QueryRow(c.Request.Context(),
		`SELECT COUNT(*) FROM family_members WHERE family_id = $1`, inv.FamilyID,
	).Scan(&memberCount)

	inviterName := h.personNameForUser(c, inv.InvitedBy)

	c.JSON(http.StatusOK, gin.H{
		"token":        inv.Token,
		"family_id":    inv.FamilyID,
		"family_name":  familyName,
		"invited_as":   inv.Role,
		"inviter_name": inviterName,
		"member_count": memberCount,
		"status":       inv.Status,
	})
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

	// Link acceptor's person to this family
	acceptorPersonID, _ := h.userRepo.GetPersonIDForUser(c.Request.Context(), userID)
	if acceptorPersonID != "" {
		_ = h.personRepo.UpdatePersonFamilyID(c.Request.Context(), acceptorPersonID, inv.FamilyID)
	}

	h.treeSvc.InvalidateCache(inv.FamilyID)
	h.genealogyTreeSvc.InvalidateCache(inv.FamilyID)

	// Notify the inviter
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

func (h *InvitationHandler) JoinFamily(c *gin.Context) {
	familyID := c.Param("id")
	userID := c.GetString("user_id")

	family, err := h.familyRepo.GetFamilyByID(c.Request.Context(), familyID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "family not found"})
		return
	}

	if err := h.memberRepo.AddMember(c.Request.Context(), familyID, userID, "member"); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Move user's person node into this family
	if personID, _ := h.userRepo.GetPersonIDForUser(c.Request.Context(), userID); personID != "" {
		_ = h.personRepo.UpdatePersonFamilyID(c.Request.Context(), personID, familyID)
	}

	h.treeSvc.InvalidateCache(familyID)
	h.genealogyTreeSvc.InvalidateCache(familyID)

	// Resolve family owner's person for the frontend
	var ownerPersonID, ownerName string
	if family.OwnerID != nil && *family.OwnerID != "" {
		if pid, _ := h.userRepo.GetPersonIDForUser(c.Request.Context(), *family.OwnerID); pid != "" {
			ownerPersonID = pid
			var fn, ln string
			_ = database.DB.QueryRow(c.Request.Context(),
				`SELECT COALESCE(first_name,''), COALESCE(last_name,'') FROM persons WHERE id = $1`, pid,
			).Scan(&fn, &ln)
			ownerName = strings.TrimSpace(fn + " " + ln)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message":         "joined family",
		"family_id":       familyID,
		"role":            "member",
		"owner_person_id": ownerPersonID,
		"owner_name":      ownerName,
	})
}
