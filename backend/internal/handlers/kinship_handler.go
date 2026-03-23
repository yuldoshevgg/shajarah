package handlers

import (
	"net/http"

	"shajarah-backend/internal/services"

	"github.com/gin-gonic/gin"
)

type KinshipHandler struct {
	svc *services.KinshipService
}

func NewKinshipHandler(svc *services.KinshipService) *KinshipHandler {
	return &KinshipHandler{svc: svc}
}

// GET /persons/:id/kinship/:other
// Returns the relationship of :other as seen from the perspective of :id (the root/POV person).
// Example: GET /persons/me-id/kinship/uncle-id → { "relation": "Uncle" }
func (h *KinshipHandler) GetKinship(c *gin.Context) {
	rootID := c.Param("id")
	targetID := c.Param("other")

	relation, err := h.svc.GetRelationship(c.Request.Context(), rootID, targetID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"relation": relation})
}

// GET /persons/:id/kinship-map
// Returns the relationship of every other person in the family relative to :id.
// Useful for annotating all nodes in the family tree at once.
func (h *KinshipHandler) GetKinshipMap(c *gin.Context) {
	rootID := c.Param("id")

	relationMap, err := h.svc.GetRelationshipMap(c.Request.Context(), rootID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"relations": relationMap})
}
