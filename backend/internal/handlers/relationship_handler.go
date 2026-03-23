package handlers

import (
	"net/http"

	"shajarah-backend/internal/database"
	"shajarah-backend/internal/models"
	"shajarah-backend/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type RelationshipHandler struct {
	repo *repository.RelationshipRepository
}

func NewRelationshipHandler(repo *repository.RelationshipRepository) *RelationshipHandler {
	return &RelationshipHandler{repo: repo}
}

// familyIDForPerson fetches the family_id of a person from DB.
func familyIDForPerson(c *gin.Context, personID string) (string, bool) {
	var familyID *string
	err := database.DB.QueryRow(c.Request.Context(),
		`SELECT family_id FROM persons WHERE id = $1`, personID,
	).Scan(&familyID)
	if err != nil || familyID == nil || *familyID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "could not resolve family for person"})
		return "", false
	}
	return *familyID, true
}

// CreateRelationship handles all relationship types from the frontend:
//
//   - "parent"  → person1 IS PARENT of person2  (stored directly)
//   - "child"   → person1 IS CHILD  of person2  (stored as parent edge, flipped)
//   - "spouse"  → symmetric                      (stored directly)
//   - "sibling" → person1 and person2 share parents
//                 → find person1's parents, create parent→person2 edges for each
func (h *RelationshipHandler) CreateRelationship(c *gin.Context) {
	var req models.CreateRelationshipRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx := c.Request.Context()

	// Resolve family_id from one of the persons
	familyID, ok := familyIDForPerson(c, req.Person1ID)
	if !ok {
		return
	}

	switch req.RelationType {

	case "sibling":
		// Find person1's parents and attach person2 to the same parents.
		parentIDs, err := h.repo.GetParentsOf(ctx, req.Person1ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if len(parentIDs) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "cannot create sibling: reference person has no known parents"})
			return
		}
		for _, parentID := range parentIDs {
			rel := &models.Relationship{
				ID:           uuid.New().String(),
				Person1ID:    parentID,
				Person2ID:    req.Person2ID,
				RelationType: "parent",
				FamilyID:     familyID,
			}
			if err := h.repo.CreateRelationship(ctx, rel); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
		}
		c.JSON(http.StatusCreated, gin.H{"message": "sibling linked via shared parents", "parent_count": len(parentIDs)})

	case "child":
		// person1 is the child → person2 is the parent
		rel := &models.Relationship{
			ID:           uuid.New().String(),
			Person1ID:    req.Person2ID, // parent
			Person2ID:    req.Person1ID, // child
			RelationType: "parent",
			FamilyID:     familyID,
		}
		if err := h.repo.CreateRelationship(ctx, rel); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, rel)

	case "parent", "spouse":
		rel := &models.Relationship{
			ID:           uuid.New().String(),
			Person1ID:    req.Person1ID,
			Person2ID:    req.Person2ID,
			RelationType: req.RelationType,
			FamilyID:     familyID,
		}
		if err := h.repo.CreateRelationship(ctx, rel); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, rel)

	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid relation_type: must be parent, child, spouse, or sibling"})
	}
}

func (h *RelationshipHandler) GetRelationships(c *gin.Context) {
	personID := c.Param("person_id")
	rels, err := h.repo.GetRelationshipsByPerson(c.Request.Context(), personID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, rels)
}

func (h *RelationshipHandler) GetPersonRelationshipsEnriched(c *gin.Context) {
	personID := c.Param("id")
	views, err := h.repo.GetPersonRelationshipsWithNames(c.Request.Context(), personID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if views == nil {
		views = []models.PersonRelationshipView{}
	}
	c.JSON(http.StatusOK, views)
}

func (h *RelationshipHandler) UpdateRelationship(c *gin.Context) {
	id := c.Param("id")
	var req models.UpdateRelationshipRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.repo.UpdateRelationship(c.Request.Context(), id, req.RelationType); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"id": id, "relation_type": req.RelationType})
}

func (h *RelationshipHandler) DeleteRelationship(c *gin.Context) {
	id := c.Param("id")
	if err := h.repo.DeleteRelationship(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "relationship deleted"})
}
