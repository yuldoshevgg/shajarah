package handlers

import (
	"io"
	"net/http"

	"shajarah-backend/internal/models"
	"shajarah-backend/internal/repository"
	"shajarah-backend/internal/services"

	"github.com/gin-gonic/gin"
)

type GEDCOMHandler struct {
	memberRepo *repository.MemberRepository
	personRepo *repository.PersonRepository
	relRepo    *repository.RelationshipRepository
	familyRepo *repository.FamilyRepository
	svc        *services.GEDCOMService
}

func NewGEDCOMHandler(
	memberRepo *repository.MemberRepository,
	personRepo *repository.PersonRepository,
	relRepo *repository.RelationshipRepository,
	familyRepo *repository.FamilyRepository,
	svc *services.GEDCOMService,
) *GEDCOMHandler {
	return &GEDCOMHandler{
		memberRepo: memberRepo,
		personRepo: personRepo,
		relRepo:    relRepo,
		familyRepo: familyRepo,
		svc:        svc,
	}
}

// ImportGEDCOM handles POST /families/:id/import/gedcom
func (h *GEDCOMHandler) ImportGEDCOM(c *gin.Context) {
	familyID := c.Param("id")
	userID := c.GetString("user_id")

	role, err := h.memberRepo.GetMemberRole(c.Request.Context(), familyID, userID)
	if err != nil || (role != "admin" && role != "editor") {
		c.JSON(http.StatusForbidden, gin.H{"error": "admin or editor access required"})
		return
	}

	file, _, err := c.Request.FormFile("gedcom")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "gedcom file is required"})
		return
	}
	defer file.Close()

	data, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read file"})
		return
	}

	persons, rels, err := h.svc.ImportGEDCOM(c.Request.Context(), familyID, string(data))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"persons_created":      persons,
		"relationships_created": rels,
	})
}

// ExportGEDCOM handles GET /families/:id/export/gedcom
func (h *GEDCOMHandler) ExportGEDCOM(c *gin.Context) {
	familyID := c.Param("id")
	userID := c.GetString("user_id")

	if _, err := h.memberRepo.GetMemberRole(c.Request.Context(), familyID, userID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "not a family member"})
		return
	}

	family, err := h.familyRepo.GetFamilyByID(c.Request.Context(), familyID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "family not found"})
		return
	}

	persons, err := h.personRepo.GetPersons(c.Request.Context(), familyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if persons == nil {
		persons = []models.Person{}
	}

	seen := map[string]bool{}
	var allRels []models.Relationship
	for _, p := range persons {
		rels, _ := h.relRepo.GetRelationshipsByPerson(c.Request.Context(), p.ID)
		for _, r := range rels {
			if !seen[r.ID] {
				seen[r.ID] = true
				allRels = append(allRels, r)
			}
		}
	}

	gedcom := h.svc.ExportGEDCOM(c.Request.Context(), family, persons, allRels)

	c.Header("Content-Disposition", `attachment; filename="`+family.Name+`.ged"`)
	c.Header("Content-Type", "text/plain; charset=utf-8")
	c.String(http.StatusOK, gedcom)
}
