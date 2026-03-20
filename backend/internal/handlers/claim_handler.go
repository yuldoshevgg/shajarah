package handlers

import (
	"net/http"
	"time"

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

// RequestClaim submits a claim on a person, pending admin approval.
func (h *ClaimHandler) RequestClaim(c *gin.Context) {
	personID := c.Param("id")
	callerUserID := c.GetString("user_id")

	if _, err := h.personRepo.GetPersonByID(c.Request.Context(), personID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "person not found"})
		return
	}

	// Reject if person is already claimed by another user
	if existing, err := h.userRepo.GetUserByPersonID(c.Request.Context(), personID); err == nil && existing != nil {
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

// ListClaims returns pending claims for a family (admin only).
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

// ApproveClaim links the claimant user to the person (admin only).
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

	// Verify caller is admin of the person's family
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

	// Check the person isn't already claimed by someone else
	if existing, err := h.userRepo.GetUserByPersonID(c.Request.Context(), claim.PersonID); err == nil && existing != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "person already claimed by another user"})
		return
	}

	if err := h.userRepo.UpdatePersonID(c.Request.Context(), claim.UserID, claim.PersonID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to link user to person"})
		return
	}

	if err := h.claimRepo.UpdateStatus(c.Request.Context(), claimID, "approved"); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update claim status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "claim approved"})
}

// RejectClaim denies the claim (admin only).
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
