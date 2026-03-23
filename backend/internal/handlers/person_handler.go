package handlers

import (
	"net/http"
	"time"

	"shajarah-backend/internal/database"
	"shajarah-backend/internal/models"
	"shajarah-backend/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type PersonHandler struct {
	repo       *repository.PersonRepository
	memberRepo *repository.MemberRepository
	userRepo   *repository.UserRepository
	relRepo    *repository.RelationshipRepository
}

func NewPersonHandler(repo *repository.PersonRepository, memberRepo *repository.MemberRepository, userRepo *repository.UserRepository, relRepo *repository.RelationshipRepository) *PersonHandler {
	return &PersonHandler{repo: repo, memberRepo: memberRepo, userRepo: userRepo, relRepo: relRepo}
}

func (h *PersonHandler) CreatePerson(c *gin.Context) {
	var req models.CreatePersonRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetString("user_id")
	role, err := h.memberRepo.GetMemberRole(c.Request.Context(), req.FamilyID, userID)
	if err != nil || (role != "admin" && role != "editor") {
		c.JSON(http.StatusForbidden, gin.H{"error": "editor or admin access required"})
		return
	}

	// Check for existing person with same email (only when email provided)
	var emailPtr *string
	if req.Email != "" {
		existing, _ := h.repo.GetPersonByEmail(c.Request.Context(), req.Email)
		if existing != nil {
			c.JSON(http.StatusConflict, gin.H{"error": "a person with this email already exists"})
			return
		}
		emailPtr = &req.Email
	}

	familyID := req.FamilyID
	visibility := req.Visibility
	if visibility == "" {
		visibility = "family_only"
	}
	person := models.Person{
		ID:         uuid.New().String(),
		FamilyID:   &familyID,
		Email:      emailPtr,
		FirstName:  req.FirstName,
		LastName:   req.LastName,
		Gender:     req.Gender,
		Biography:  req.Biography,
		Visibility: visibility,
	}

	if req.BirthDate != "" {
		t, err := time.Parse("2006-01-02", req.BirthDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid birth_date, use YYYY-MM-DD"})
			return
		}
		person.BirthDate = &t
	}

	if err := h.repo.CreatePerson(c.Request.Context(), &person); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, person)
}

func (h *PersonHandler) GetPersons(c *gin.Context) {
	familyID := c.Query("family_id")

	persons, err := h.repo.GetPersons(c.Request.Context(), familyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, persons)
}

func (h *PersonHandler) GetPerson(c *gin.Context) {
	id := c.Param("id")

	person, err := h.repo.GetPersonByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "person not found"})
		return
	}

	c.JSON(http.StatusOK, person)
}

func (h *PersonHandler) UpdatePerson(c *gin.Context) {
	id := c.Param("id")
	callerPersonID := c.GetString("person_id")
	callerUserID := c.GetString("user_id")

	person, err := h.repo.GetPersonByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "person not found"})
		return
	}

	if callerPersonID != id {
		familyID := ""
		if person.FamilyID != nil {
			familyID = *person.FamilyID
		}
		if familyID == "" {
			c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
			return
		}
		role, err := h.memberRepo.GetMemberRole(c.Request.Context(), familyID, callerUserID)
		if err != nil || (role != "admin" && role != "editor") {
			c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
			return
		}
	}

	var req models.UpdatePersonRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Email != nil {
		person.Email = req.Email
	}
	if req.FirstName != nil {
		person.FirstName = *req.FirstName
	}
	if req.LastName != nil {
		person.LastName = *req.LastName
	}
	if req.Gender != nil {
		person.Gender = *req.Gender
	}
	if req.Biography != nil {
		person.Biography = *req.Biography
	}
	if req.BirthDate != nil {
		if *req.BirthDate == "" {
			person.BirthDate = nil
		} else {
			t, err := time.Parse("2006-01-02", *req.BirthDate)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid birth_date, use YYYY-MM-DD"})
				return
			}
			person.BirthDate = &t
		}
	}
	if req.Visibility != nil {
		person.Visibility = *req.Visibility
	}

	if err := h.repo.UpdatePerson(c.Request.Context(), person); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, person)
}

func (h *PersonHandler) DeletePerson(c *gin.Context) {
	id := c.Param("id")

	if err := h.repo.DeletePerson(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "person deleted"})
}

// ClaimPerson is kept for backward compatibility but the recommended flow
// is through ClaimHandler.RequestClaim which requires admin approval.
func (h *PersonHandler) ClaimPerson(c *gin.Context) {
	id := c.Param("id")
	callerUserID := c.GetString("user_id")

	if _, err := h.repo.GetPersonByID(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "person not found"})
		return
	}

	var alreadyClaimed bool
	_ = database.DB.QueryRow(c.Request.Context(),
		`SELECT EXISTS(SELECT 1 FROM user_person_links WHERE person_id = $1)`, id,
	).Scan(&alreadyClaimed)
	if alreadyClaimed {
		c.JSON(http.StatusConflict, gin.H{"error": "person already claimed by another user"})
		return
	}

	person, _ := h.repo.GetPersonByID(c.Request.Context(), id)
	familyID := ""
	if person != nil && person.FamilyID != nil {
		familyID = *person.FamilyID
	}

	if _, err := database.DB.Exec(c.Request.Context(),
		`INSERT INTO user_person_links (id, user_id, person_id, family_id, created_at)
		 VALUES ($1, $2, $3, $4, NOW()) ON CONFLICT DO NOTHING`,
		uuid.New().String(), callerUserID, id, familyID,
	); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "person claimed"})
}

func (h *PersonHandler) MergePersons(c *gin.Context) {
	callerUserID := c.GetString("user_id")

	var req struct {
		KeepID   string `json:"keep_id" binding:"required"`
		RemoveID string `json:"remove_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.KeepID == req.RemoveID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "keep_id and remove_id must differ"})
		return
	}

	keep, err := h.repo.GetPersonByID(c.Request.Context(), req.KeepID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "keep person not found"})
		return
	}

	if keep.FamilyID == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "person has no family"})
		return
	}

	role, err := h.memberRepo.GetMemberRole(c.Request.Context(), *keep.FamilyID, callerUserID)
	if err != nil || (role != "admin" && role != "editor") {
		c.JSON(http.StatusForbidden, gin.H{"error": "editor or admin access required"})
		return
	}

	if err := h.repo.MergePersons(c.Request.Context(), req.KeepID, req.RemoveID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "persons merged", "kept_id": req.KeepID})
}

func (h *PersonHandler) GetRelatives(c *gin.Context) {
	id := c.Param("id")

	views, err := h.relRepo.GetPersonRelationshipsWithNames(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if views == nil {
		views = []models.PersonRelationshipView{}
	}

	grouped := map[string][]models.PersonRelationshipView{}
	for _, v := range views {
		grouped[v.RelationType] = append(grouped[v.RelationType], v)
	}

	c.JSON(http.StatusOK, gin.H{"relatives": grouped})
}
