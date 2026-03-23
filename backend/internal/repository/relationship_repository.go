package repository

import (
	"context"

	"shajarah-backend/internal/database"
	"shajarah-backend/internal/models"
)

type RelationshipRepository struct{}

func NewRelationshipRepository() *RelationshipRepository {
	return &RelationshipRepository{}
}

// CreateRelationship inserts a single primitive edge (parent or spouse).
func (r *RelationshipRepository) CreateRelationship(ctx context.Context, rel *models.Relationship) error {
	var familyID *string
	if rel.FamilyID != "" {
		familyID = &rel.FamilyID
	}
	_, err := database.DB.Exec(ctx,
		`INSERT INTO relationships (id, person1_id, person2_id, relation_type, family_id)
		 VALUES ($1, $2, $3, $4, $5)
		 ON CONFLICT DO NOTHING`,
		rel.ID, rel.Person1ID, rel.Person2ID, rel.RelationType, familyID,
	)
	return err
}

// GetParentsOf returns the IDs of all persons who are stored as parents of personID.
// A parent edge is stored as: person1_id = parent, person2_id = child, relation_type = 'parent'.
func (r *RelationshipRepository) GetParentsOf(ctx context.Context, personID string) ([]string, error) {
	rows, err := database.DB.Query(ctx,
		`SELECT person1_id FROM relationships
		 WHERE person2_id = $1 AND relation_type = 'parent'`,
		personID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, nil
}

// GetPersonRelationshipsWithNames returns all direct and derived relatives of personID:
//
//   - parent   — explicit edge: person1 IS PARENT of person2
//   - child    — inverse of parent
//   - spouse   — explicit edge (symmetric)
//   - sibling  — derived: persons who share at least one parent with personID
func (r *RelationshipRepository) GetPersonRelationshipsWithNames(ctx context.Context, personID string) ([]models.PersonRelationshipView, error) {
	query := `
	-- 1. parents  (person1 = parent, person2 = child = $1)
	SELECT r.id::text, 'parent' AS relation_type,
	       p.id, p.first_name, p.last_name, p.gender
	FROM   relationships r
	JOIN   persons p ON p.id = r.person1_id
	WHERE  r.person2_id = $1 AND r.relation_type = 'parent'

	UNION ALL

	-- 2. children  (person1 = $1 = parent, person2 = child)
	SELECT r.id::text, 'child',
	       p.id, p.first_name, p.last_name, p.gender
	FROM   relationships r
	JOIN   persons p ON p.id = r.person2_id
	WHERE  r.person1_id = $1 AND r.relation_type = 'parent'

	UNION ALL

	-- 3. spouses  (symmetric)
	SELECT r.id::text, 'spouse',
	       CASE WHEN r.person1_id = $1 THEN p2.id ELSE p1.id END,
	       CASE WHEN r.person1_id = $1 THEN p2.first_name ELSE p1.first_name END,
	       CASE WHEN r.person1_id = $1 THEN p2.last_name  ELSE p1.last_name  END,
	       CASE WHEN r.person1_id = $1 THEN p2.gender     ELSE p1.gender     END
	FROM   relationships r
	JOIN   persons p1 ON p1.id = r.person1_id
	JOIN   persons p2 ON p2.id = r.person2_id
	WHERE  (r.person1_id = $1 OR r.person2_id = $1) AND r.relation_type = 'spouse'

	UNION ALL

	-- 4. siblings  (share at least one parent — fully derived, no stored sibling record needed)
	SELECT DISTINCT ON (sib.id)
	       gen_random_uuid()::text, 'sibling',
	       sib.id, sib.first_name, sib.last_name, sib.gender
	FROM   relationships r_me
	JOIN   relationships r_sib
	         ON  r_sib.person1_id    = r_me.person1_id
	         AND r_sib.relation_type = 'parent'
	         AND r_sib.person2_id   != $1
	JOIN   persons sib ON sib.id = r_sib.person2_id
	WHERE  r_me.person2_id = $1 AND r_me.relation_type = 'parent'
	`

	rows, err := database.DB.Query(ctx, query, personID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var views []models.PersonRelationshipView
	for rows.Next() {
		var v models.PersonRelationshipView
		if err := rows.Scan(
			&v.ID,
			&v.RelationType,
			&v.RelatedPerson.ID,
			&v.RelatedPerson.FirstName,
			&v.RelatedPerson.LastName,
			&v.RelatedPerson.Gender,
		); err != nil {
			return nil, err
		}
		views = append(views, v)
	}
	return views, nil
}

func (r *RelationshipRepository) GetRelationshipsByPerson(ctx context.Context, personID string) ([]models.Relationship, error) {
	rows, err := database.DB.Query(ctx,
		`SELECT id, person1_id, person2_id, relation_type, created_at
		 FROM relationships WHERE person1_id = $1 OR person2_id = $1`,
		personID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rels []models.Relationship
	for rows.Next() {
		var rel models.Relationship
		if err := rows.Scan(&rel.ID, &rel.Person1ID, &rel.Person2ID, &rel.RelationType, &rel.CreatedAt); err != nil {
			return nil, err
		}
		rels = append(rels, rel)
	}
	return rels, nil
}

func (r *RelationshipRepository) UpdateRelationship(ctx context.Context, id, relationType string) error {
	_, err := database.DB.Exec(ctx,
		`UPDATE relationships SET relation_type = $1 WHERE id = $2`,
		relationType, id,
	)
	return err
}

func (r *RelationshipRepository) DeleteRelationship(ctx context.Context, id string) error {
	_, err := database.DB.Exec(ctx, `DELETE FROM relationships WHERE id = $1`, id)
	return err
}
