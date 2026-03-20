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

func (r *RelationshipRepository) CreateRelationship(ctx context.Context, rel *models.Relationship) error {

	query := `
	INSERT INTO relationships (id, person1_id, person2_id, relation_type)
	VALUES ($1,$2,$3,$4)
	`

	_, err := database.DB.Exec(ctx, query,
		rel.ID,
		rel.Person1ID,
		rel.Person2ID,
		rel.RelationType,
	)

	return err
}

func (r *RelationshipRepository) GetRelationshipsByPerson(ctx context.Context, personID string) ([]models.Relationship, error) {

	query := `
	SELECT id, person1_id, person2_id, relation_type, created_at
	FROM relationships
	WHERE person1_id=$1 OR person2_id=$1
	`

	rows, err := database.DB.Query(ctx, query, personID)
	if err != nil {
		return nil, err
	}

	defer rows.Close()

	var relations []models.Relationship

	for rows.Next() {

		var rel models.Relationship

		err := rows.Scan(
			&rel.ID,
			&rel.Person1ID,
			&rel.Person2ID,
			&rel.RelationType,
			&rel.CreatedAt,
		)

		if err != nil {
			return nil, err
		}

		relations = append(relations, rel)
	}

	return relations, nil
}

func (r *RelationshipRepository) GetPersonRelationshipsWithNames(ctx context.Context, personID string) ([]models.PersonRelationshipView, error) {

	query := `
	SELECT
		r.id,
		r.relation_type,
		CASE WHEN r.person1_id = $1 THEN p2.id       ELSE p1.id       END,
		CASE WHEN r.person1_id = $1 THEN p2.first_name ELSE p1.first_name END,
		CASE WHEN r.person1_id = $1 THEN p2.last_name  ELSE p1.last_name  END
	FROM relationships r
	JOIN persons p1 ON p1.id = r.person1_id
	JOIN persons p2 ON p2.id = r.person2_id
	WHERE r.person1_id = $1 OR r.person2_id = $1
	`

	rows, err := database.DB.Query(ctx, query, personID)
	if err != nil {
		return nil, err
	}

	defer rows.Close()

	var views []models.PersonRelationshipView

	for rows.Next() {
		var v models.PersonRelationshipView

		err := rows.Scan(
			&v.ID,
			&v.RelationType,
			&v.RelatedPerson.ID,
			&v.RelatedPerson.FirstName,
			&v.RelatedPerson.LastName,
		)
		if err != nil {
			return nil, err
		}

		views = append(views, v)
	}

	return views, nil
}

func (r *RelationshipRepository) UpdateRelationship(ctx context.Context, id, relationType string) error {
	_, err := database.DB.Exec(ctx,
		`UPDATE relationships SET relation_type = $1 WHERE id = $2`,
		relationType, id,
	)
	return err
}

func (r *RelationshipRepository) DeleteRelationship(ctx context.Context, id string) error {

	query := `
	DELETE FROM relationships
	WHERE id=$1
	`

	_, err := database.DB.Exec(ctx, query, id)

	return err
}
