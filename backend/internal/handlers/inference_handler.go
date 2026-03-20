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
