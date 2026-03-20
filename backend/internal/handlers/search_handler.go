package handlers

import (
	"net/http"

	"shajarah-backend/internal/models"
	"shajarah-backend/internal/repository"

	"github.com/gin-gonic/gin"
)

type SearchHandler struct {
	personRepo *repository.PersonRepository
}

func NewSearchHandler(personRepo *repository.PersonRepository) *SearchHandler {
	return &SearchHandler{personRepo: personRepo}
}

func (h *SearchHandler) SearchPersons(c *gin.Context) {
	q := c.Query("q")
	if q == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "q parameter required"})
		return
	}

	persons, err := h.personRepo.SearchPersons(c.Request.Context(), q)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if persons == nil {
		persons = []models.Person{}
	}

	c.JSON(http.StatusOK, gin.H{"persons": persons})
}
