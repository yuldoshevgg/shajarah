package handlers

import (
	"net/http"

	"shajarah-backend/internal/models"
	"shajarah-backend/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type StoryHandler struct {
	repo *repository.StoryRepository
}

func NewStoryHandler(repo *repository.StoryRepository) *StoryHandler {
	return &StoryHandler{repo: repo}
}

func (h *StoryHandler) CreateStory(c *gin.Context) {
	var req models.CreateStoryRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	story := models.Story{
		ID:       uuid.New().String(),
		PersonID: req.PersonID,
		Title:    req.Title,
		Content:  req.Content,
	}

	if err := h.repo.CreateStory(c.Request.Context(), &story); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, story)
}

func (h *StoryHandler) GetStories(c *gin.Context) {
	personID := c.Param("person_id")

	stories, err := h.repo.GetStoriesByPerson(c.Request.Context(), personID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if stories == nil {
		stories = []models.Story{}
	}

	c.JSON(http.StatusOK, stories)
}
