package handlers

import (
	"net/http"
	"path/filepath"
	"time"

	"shajarah-backend/internal/database"
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
	personID := c.PostForm("person_id")
	title := c.PostForm("title")
	content := c.PostForm("content")

	if personID == "" || title == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "person_id and title are required"})
		return
	}

	story := models.Story{
		ID:       uuid.New().String(),
		PersonID: personID,
		Title:    title,
		Content:  content,
	}

	// Handle optional cover photo
	if file, err := c.FormFile("photo"); err == nil {
		ext := filepath.Ext(file.Filename)
		filename := uuid.New().String() + ext
		savePath := "uploads/" + filename
		if err := c.SaveUploadedFile(file, savePath); err == nil {
			url := "/uploads/" + filename
			story.CoverURL = &url
		}
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

type FamilyStory struct {
	ID        string    `json:"id"`
	PersonID  string    `json:"person_id"`
	Title     string    `json:"title"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at"`
	FirstName string    `json:"first_name"`
	LastName  string    `json:"last_name"`
}

func (h *StoryHandler) GetFamilyStories(c *gin.Context) {
	familyID := c.Param("id")

	rows, err := database.DB.Query(
		c.Request.Context(),
		`SELECT s.id, s.person_id, s.title, s.content, s.created_at, p.first_name, p.last_name
		FROM stories s
		JOIN persons p ON p.id = s.person_id
		WHERE p.family_id = $1
		ORDER BY s.created_at DESC`,
		familyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	stories := []FamilyStory{}
	for rows.Next() {
		var s FamilyStory
		if err := rows.Scan(&s.ID, &s.PersonID, &s.Title, &s.Content, &s.CreatedAt, &s.FirstName, &s.LastName); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		stories = append(stories, s)
	}

	c.JSON(http.StatusOK, gin.H{"stories": stories})
}
