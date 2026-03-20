package handlers

import (
	"net/http"

	"shajarah-backend/internal/database"
	"shajarah-backend/internal/repository"

	"github.com/gin-gonic/gin"
)

type IssuesHandler struct {
	memberRepo *repository.MemberRepository
}

func NewIssuesHandler(memberRepo *repository.MemberRepository) *IssuesHandler {
	return &IssuesHandler{memberRepo: memberRepo}
}

type Issue struct {
	Type      string `json:"type"`
	PersonID  string `json:"person_id,omitempty"`
	Name      string `json:"name,omitempty"`
	Message   string `json:"message"`
}

func (h *IssuesHandler) GetIssues(c *gin.Context) {
	familyID := c.Param("id")
	userID := c.GetString("user_id")

	if _, err := h.memberRepo.GetMemberRole(c.Request.Context(), familyID, userID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "not a family member"})
		return
	}

	var issues []Issue

	// Persons with no relationships
	noRelsRows, err := database.DB.Query(c.Request.Context(), `
		SELECT p.id, p.first_name, p.last_name
		FROM persons p
		LEFT JOIN relationships r ON r.person1_id = p.id OR r.person2_id = p.id
		WHERE p.family_id = $1
		  AND r.id IS NULL
	`, familyID)
	if err == nil {
		defer noRelsRows.Close()
		for noRelsRows.Next() {
			var id, fn, ln string
			if err := noRelsRows.Scan(&id, &fn, &ln); err == nil {
				issues = append(issues, Issue{
					Type:     "isolated_person",
					PersonID: id,
					Name:     fn + " " + ln,
					Message:  "Person has no relationships",
				})
			}
		}
	}

	// Persons with more than 2 parents
	manyParentsRows, err := database.DB.Query(c.Request.Context(), `
		SELECT p.id, p.first_name, p.last_name, COUNT(r.id) AS parent_count
		FROM persons p
		JOIN relationships r ON r.person2_id = p.id AND r.relation_type = 'parent'
		WHERE p.family_id = $1
		GROUP BY p.id, p.first_name, p.last_name
		HAVING COUNT(r.id) > 2
	`, familyID)
	if err == nil {
		defer manyParentsRows.Close()
		for manyParentsRows.Next() {
			var id, fn, ln string
			var count int
			if err := manyParentsRows.Scan(&id, &fn, &ln, &count); err == nil {
				issues = append(issues, Issue{
					Type:     "too_many_parents",
					PersonID: id,
					Name:     fn + " " + ln,
					Message:  "Person has more than 2 parents",
				})
			}
		}
	}

	// Duplicate persons
	dupRows, err := database.DB.Query(c.Request.Context(), `
		SELECT p.id, p.first_name, p.last_name
		FROM persons p
		WHERE p.family_id = $1
		  AND (p.first_name, coalesce(p.last_name, '')) IN (
		    SELECT first_name, coalesce(last_name, '')
		    FROM persons
		    WHERE family_id = $1
		    GROUP BY first_name, coalesce(last_name, '')
		    HAVING COUNT(*) > 1
		  )
	`, familyID)
	if err == nil {
		defer dupRows.Close()
		for dupRows.Next() {
			var id, fn, ln string
			if err := dupRows.Scan(&id, &fn, &ln); err == nil {
				issues = append(issues, Issue{
					Type:     "duplicate_person",
					PersonID: id,
					Name:     fn + " " + ln,
					Message:  "Possible duplicate: same name exists in this family",
				})
			}
		}
	}

	if issues == nil {
		issues = []Issue{}
	}

	c.JSON(http.StatusOK, gin.H{"issues": issues, "count": len(issues)})
}
