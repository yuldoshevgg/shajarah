package handlers

import (
	"net/http"

	"shajarah-backend/internal/models"
	"shajarah-backend/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type FamilyHandler struct {
	repo       *repository.FamilyRepository
	memberRepo *repository.MemberRepository
	personRepo *repository.PersonRepository
	relRepo    *repository.RelationshipRepository
}

func NewFamilyHandler(repo *repository.FamilyRepository, memberRepo *repository.MemberRepository, personRepo *repository.PersonRepository, relRepo *repository.RelationshipRepository) *FamilyHandler {
	return &FamilyHandler{repo: repo, memberRepo: memberRepo, personRepo: personRepo, relRepo: relRepo}
}

func (h *FamilyHandler) CreateFamily(c *gin.Context) {
	var req models.CreateFamilyRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetString("user_id")

	family := models.Family{
		ID:      uuid.New().String(),
		Name:    req.Name,
		OwnerID: &userID,
	}

	if err := h.repo.CreateFamily(c.Request.Context(), &family); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if err := h.memberRepo.AddMember(c.Request.Context(), family.ID, userID, "admin"); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Automatically add the creator as the first person in the tree
	if personID := c.GetString("person_id"); personID != "" {
		_ = h.personRepo.UpdatePersonFamilyID(c.Request.Context(), personID, family.ID)
	}

	c.JSON(http.StatusCreated, family)
}

func (h *FamilyHandler) GetFamily(c *gin.Context) {
	id := c.Param("id")

	family, err := h.repo.GetFamilyByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "family not found"})
		return
	}

	c.JSON(http.StatusOK, family)
}

func (h *FamilyHandler) GetFamilies(c *gin.Context) {
	userID := c.GetString("user_id")

	families, err := h.repo.GetFamiliesByUser(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if families == nil {
		families = []models.Family{}
	}

	c.JSON(http.StatusOK, families)
}

func (h *FamilyHandler) DeleteFamily(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetString("user_id")

	role, err := h.memberRepo.GetMemberRole(c.Request.Context(), id, userID)
	if err != nil || role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "admin access required"})
		return
	}

	if err := h.repo.DeleteFamily(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "family deleted"})
}

func (h *FamilyHandler) TransferOwnership(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetString("user_id")

	role, err := h.memberRepo.GetMemberRole(c.Request.Context(), id, userID)
	if err != nil || role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "admin access required"})
		return
	}

	var req struct {
		NewOwnerID string `json:"new_owner_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	newRole, err := h.memberRepo.GetMemberRole(c.Request.Context(), id, req.NewOwnerID)
	if err != nil || newRole == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "new owner must be a family member"})
		return
	}

	if err := h.repo.TransferOwnership(c.Request.Context(), id, req.NewOwnerID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "ownership transferred"})
}

func (h *FamilyHandler) Export(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetString("user_id")

	_, err := h.memberRepo.GetMemberRole(c.Request.Context(), id, userID)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "not a family member"})
		return
	}

	family, err := h.repo.GetFamilyByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "family not found"})
		return
	}

	persons, err := h.personRepo.GetPersons(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if persons == nil {
		persons = []models.Person{}
	}

	var allRels []models.Relationship
	seen := map[string]bool{}
	for _, p := range persons {
		rels, err := h.relRepo.GetRelationshipsByPerson(c.Request.Context(), p.ID)
		if err != nil {
			continue
		}
		for _, r := range rels {
			if !seen[r.ID] {
				seen[r.ID] = true
				allRels = append(allRels, r)
			}
		}
	}
	if allRels == nil {
		allRels = []models.Relationship{}
	}

	c.JSON(http.StatusOK, gin.H{
		"family":        family,
		"persons":       persons,
		"relationships": allRels,
	})
}

func (h *FamilyHandler) GetDuplicates(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetString("user_id")

	_, err := h.memberRepo.GetMemberRole(c.Request.Context(), id, userID)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "not a family member"})
		return
	}

	persons, err := h.personRepo.FindDuplicatesInFamily(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if persons == nil {
		persons = []models.Person{}
	}

	c.JSON(http.StatusOK, gin.H{"duplicates": persons})
}
