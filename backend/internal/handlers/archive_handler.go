package handlers

import (
	"net/http"

	"shajarah-backend/internal/models"
	"shajarah-backend/internal/repository"

	"github.com/gin-gonic/gin"
)

type ArchiveHandler struct {
	memberRepo   *repository.MemberRepository
	personRepo   *repository.PersonRepository
	storyRepo    *repository.StoryRepository
	photoRepo    *repository.PhotoRepository
	documentRepo *repository.DocumentRepository
}

func NewArchiveHandler(
	memberRepo *repository.MemberRepository,
	personRepo *repository.PersonRepository,
	storyRepo *repository.StoryRepository,
	photoRepo *repository.PhotoRepository,
	documentRepo *repository.DocumentRepository,
) *ArchiveHandler {
	return &ArchiveHandler{
		memberRepo:   memberRepo,
		personRepo:   personRepo,
		storyRepo:    storyRepo,
		photoRepo:    photoRepo,
		documentRepo: documentRepo,
	}
}

type ArchivePerson struct {
	Person    models.Person    `json:"person"`
	Stories   []models.Story   `json:"stories"`
	Photos    []models.Photo   `json:"photos"`
	Documents []models.Document `json:"documents"`
}

func (h *ArchiveHandler) GetArchive(c *gin.Context) {
	familyID := c.Param("id")
	userID := c.GetString("user_id")

	if _, err := h.memberRepo.GetMemberRole(c.Request.Context(), familyID, userID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "not a family member"})
		return
	}

	persons, err := h.personRepo.GetPersons(c.Request.Context(), familyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx := c.Request.Context()
	archive := make([]ArchivePerson, 0, len(persons))

	for _, p := range persons {
		stories, _ := h.storyRepo.GetStoriesByPerson(ctx, p.ID)
		photos, _ := h.photoRepo.GetPhotosByPerson(ctx, p.ID)
		documents, _ := h.documentRepo.GetByPerson(ctx, p.ID)

		if stories == nil {
			stories = []models.Story{}
		}
		if photos == nil {
			photos = []models.Photo{}
		}
		if documents == nil {
			documents = []models.Document{}
		}

		archive = append(archive, ArchivePerson{
			Person:    p,
			Stories:   stories,
			Photos:    photos,
			Documents: documents,
		})
	}

	c.JSON(http.StatusOK, gin.H{"archive": archive})
}
