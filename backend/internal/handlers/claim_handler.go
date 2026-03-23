package handlers

import (
	"net/http"
	"time"

	"shajarah-backend/internal/database"
	"shajarah-backend/internal/models"
	"shajarah-backend/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type ClaimHandler struct {
	claimRepo  *repository.ClaimRepository
	personRepo *repository.PersonRepository
	memberRepo *repository.MemberRepository
	userRepo   *repository.UserRepository
}

func NewClaimHandler(
	claimRepo *repository.ClaimRepository,
	personRepo *repository.PersonRepository,
	memberRepo *repository.MemberRepository,
	userRepo *repository.UserRepository,
) *ClaimHandler {
	return &ClaimHandler{
		claimRepo:  claimRepo,
		personRepo: personRepo,
		memberRepo: memberRepo,
		userRepo:   userRepo,
	}
}

// isPersonClaimed returns true if a user_person_links row exists for this person.
func isPersonClaimed(h *ClaimHandler, c *gin.Context, personID string) bool {
	var exists bool
	_ = database.DB.QueryRow(c.Request.Context(),
		`SELECT EXISTS(SELECT 1 FROM user_person_links WHERE person_id = $1)`, personID,
	).Scan(&exists)
	return exists
}

func (h *ClaimHandler) RequestClaim(c *gin.Context) {
	personID := c.Param("id")
	callerUserID := c.GetString("user_id")

	if _, err := h.personRepo.GetPersonByID(c.Request.Context(), personID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "person not found"})
		return
	}

	if isPersonClaimed(h, c, personID) {
		c.JSON(http.StatusConflict, gin.H{"error": "person already claimed"})
		return
	}

	claim := &models.Claim{
		ID:        uuid.New().String(),
		PersonID:  personID,
		UserID:    callerUserID,
		Status:    "pending",
		CreatedAt: time.Now(),
	}
	if err := h.claimRepo.Create(c.Request.Context(), claim); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to submit claim"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "claim submitted, pending admin approval", "claim_id": claim.ID})
}

func (h *ClaimHandler) ListClaims(c *gin.Context) {
	familyID := c.Param("id")
	callerUserID := c.GetString("user_id")

	role, err := h.memberRepo.GetMemberRole(c.Request.Context(), familyID, callerUserID)
	if err != nil || role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "admin access required"})
		return
	}

	views, err := h.claimRepo.GetPendingByFamily(c.Request.Context(), familyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if views == nil {
		views = []models.ClaimView{}
	}
	c.JSON(http.StatusOK, views)
}

func (h *ClaimHandler) ApproveClaim(c *gin.Context) {
	claimID := c.Param("id")
	callerUserID := c.GetString("user_id")

	claim, err := h.claimRepo.GetByID(c.Request.Context(), claimID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "claim not found"})
		return
	}
	if claim.Status != "pending" {
		c.JSON(http.StatusConflict, gin.H{"error": "claim already resolved"})
		return
	}

	person, err := h.personRepo.GetPersonByID(c.Request.Context(), claim.PersonID)
	if err != nil || person.FamilyID == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "person not found"})
		return
	}

	role, err := h.memberRepo.GetMemberRole(c.Request.Context(), *person.FamilyID, callerUserID)
	if err != nil || role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "admin access required"})
		return
	}

	if isPersonClaimed(h, c, claim.PersonID) {
		c.JSON(http.StatusConflict, gin.H{"error": "person already claimed by another user"})
		return
	}

	// Create the user_person_links row
	_, err = database.DB.Exec(c.Request.Context(),
		`INSERT INTO user_person_links (id, user_id, person_id, family_id, created_at)
		 VALUES ($1, $2, $3, $4, NOW())
		 ON CONFLICT DO NOTHING`,
		uuid.New().String(), claim.UserID, claim.PersonID, *person.FamilyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to link user to person"})
		return
	}

	if err := h.claimRepo.UpdateStatus(c.Request.Context(), claimID, "approved"); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update claim status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "claim approved"})
}

func (h *ClaimHandler) RejectClaim(c *gin.Context) {
	claimID := c.Param("id")
	callerUserID := c.GetString("user_id")

	claim, err := h.claimRepo.GetByID(c.Request.Context(), claimID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "claim not found"})
		return
	}

	person, err := h.personRepo.GetPersonByID(c.Request.Context(), claim.PersonID)
	if err != nil || person.FamilyID == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "person not found"})
		return
	}

	role, err := h.memberRepo.GetMemberRole(c.Request.Context(), *person.FamilyID, callerUserID)
	if err != nil || role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "admin access required"})
		return
	}

	if err := h.claimRepo.UpdateStatus(c.Request.Context(), claimID, "rejected"); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "claim rejected"})
}
