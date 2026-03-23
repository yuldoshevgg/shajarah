package handlers

import (
	"net/http"

	"shajarah-backend/internal/services"

	"github.com/gin-gonic/gin"
)

type InferenceHandler struct {
	svc *services.InferenceService
}

func NewInferenceHandler(svc *services.InferenceService) *InferenceHandler {
	return &InferenceHandler{svc: svc}
}

func (h *InferenceHandler) FindRelationship(c *gin.Context) {
	fromID := c.Param("id")
	toID := c.Param("other")

	label, err := h.svc.FindRelationship(c.Request.Context(), fromID, toID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"relation": label})
}

func (h *InferenceHandler) GetInferredRelatives(c *gin.Context) {
	personID := c.Param("id")

	relatives, err := h.svc.GetInferredRelatives(c.Request.Context(), personID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if relatives == nil {
		relatives = []services.InferredRelative{}
	}

	c.JSON(http.StatusOK, gin.H{"inferred_relatives": relatives})
}
