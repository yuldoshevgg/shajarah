package handlers

import (
	"net/http"

	"shajarah-backend/internal/models"
	"shajarah-backend/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type RelationshipHandler struct {
	repo *repository.RelationshipRepository
}

func NewRelationshipHandler(repo *repository.RelationshipRepository) *RelationshipHandler {
	return &RelationshipHandler{repo: repo}
}

func (h *RelationshipHandler) CreateRelationship(c *gin.Context) {

	var req models.CreateRelationshipRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	rel := models.Relationship{
		ID:           uuid.New().String(),
		Person1ID:    req.Person1ID,
		Person2ID:    req.Person2ID,
		RelationType: req.RelationType,
	}

	err := h.repo.CreateRelationship(c.Request.Context(), &rel)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, rel)
}

func (h *RelationshipHandler) GetRelationships(c *gin.Context) {

	personID := c.Param("person_id")

	rels, err := h.repo.GetRelationshipsByPerson(c.Request.Context(), personID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, rels)
}

func (h *RelationshipHandler) GetPersonRelationshipsEnriched(c *gin.Context) {

	personID := c.Param("id")

	views, err := h.repo.GetPersonRelationshipsWithNames(c.Request.Context(), personID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if views == nil {
		views = []models.PersonRelationshipView{}
	}

	c.JSON(http.StatusOK, views)
}

func (h *RelationshipHandler) UpdateRelationship(c *gin.Context) {
	id := c.Param("id")

	var req models.UpdateRelationshipRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.repo.UpdateRelationship(c.Request.Context(), id, req.RelationType); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"id": id, "relation_type": req.RelationType})
}

func (h *RelationshipHandler) DeleteRelationship(c *gin.Context) {

	id := c.Param("id")

	err := h.repo.DeleteRelationship(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "relationship deleted",
	})
}
