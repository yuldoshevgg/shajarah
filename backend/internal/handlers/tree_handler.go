package handlers

import (
	"net/http"

	"shajarah-backend/internal/models"
	"shajarah-backend/internal/services"

	"github.com/gin-gonic/gin"
)


type TreeHandler struct {
	service          *services.FamilyTreeService
	genealogyService *services.GenealogyTreeService
}

func NewTreeHandler(service *services.FamilyTreeService, genealogyService *services.GenealogyTreeService) *TreeHandler {
	return &TreeHandler{service: service, genealogyService: genealogyService}
}

func (h *TreeHandler) GetFamilyTree(c *gin.Context) {
	familyID := c.Param("family_id")
	tree, err := h.service.GetFamilyTree(c.Request.Context(), familyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, tree)
}

func (h *TreeHandler) GetGenealogyTree(c *gin.Context) {
	familyID := c.Param("id")
	tree, err := h.genealogyService.GetFamilyGenealogyTree(c.Request.Context(), familyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, tree)
}

func (h *TreeHandler) GetAncestorTree(c *gin.Context) {
	personID := c.Param("id")
	tree, err := h.genealogyService.GetAncestorTree(c.Request.Context(), personID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, tree)
}

func (h *TreeHandler) GetDescendantsTree(c *gin.Context) {
	personID := c.Param("id")
	tree, err := h.genealogyService.GetDescendantsTree(c.Request.Context(), personID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, tree)
}

func (h *TreeHandler) GetLineage(c *gin.Context) {
	personID := c.Param("id")
	lineage, err := h.genealogyService.GetLineage(c.Request.Context(), personID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if lineage == nil {
		lineage = []services.LineagePerson{}
	}
	c.JSON(http.StatusOK, gin.H{"lineage": lineage})
}

func (h *TreeHandler) GetPersonChildren(c *gin.Context) {
	personID := c.Param("id")
	children, err := h.genealogyService.GetDirectChildren(c.Request.Context(), personID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if children == nil {
		children = []models.GenealogyPerson{}
	}
	c.JSON(http.StatusOK, gin.H{"children": children})
}
