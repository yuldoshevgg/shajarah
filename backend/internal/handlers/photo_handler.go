package handlers

import (
	"net/http"
	"path/filepath"

	"shajarah-backend/internal/models"
	"shajarah-backend/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type PhotoHandler struct {
	repo *repository.PhotoRepository
}

func NewPhotoHandler(repo *repository.PhotoRepository) *PhotoHandler {
	return &PhotoHandler{repo: repo}
}

func (h *PhotoHandler) UploadPhoto(c *gin.Context) {
	personID := c.Param("id")

	file, err := c.FormFile("photo")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "photo file is required"})
		return
	}

	ext := filepath.Ext(file.Filename)
	filename := uuid.New().String() + ext
	savePath := filepath.Join("uploads", filename)

	if err := c.SaveUploadedFile(file, savePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save file"})
		return
	}

	photo := models.Photo{
		ID:       uuid.New().String(),
		PersonID: personID,
		URL:      "/uploads/" + filename,
	}

	if err := h.repo.SavePhoto(c.Request.Context(), &photo); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, photo)
}

func (h *PhotoHandler) GetPhotos(c *gin.Context) {
	personID := c.Param("id")

	photos, err := h.repo.GetPhotosByPerson(c.Request.Context(), personID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if photos == nil {
		photos = []models.Photo{}
	}

	c.JSON(http.StatusOK, photos)
}
