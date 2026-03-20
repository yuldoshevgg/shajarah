package repository

import (
	"context"

	"shajarah-backend/internal/database"
	"shajarah-backend/internal/models"
)

type ClaimRepository struct{}

func NewClaimRepository() *ClaimRepository {
	return &ClaimRepository{}
}

func (r *ClaimRepository) Create(ctx context.Context, c *models.Claim) error {
	_, err := database.DB.Exec(ctx,
		`INSERT INTO claims (id, person_id, user_id, status, created_at)
		 VALUES ($1, $2, $3, $4, $5)
		 ON CONFLICT (person_id, user_id) DO UPDATE SET status = 'pending', created_at = EXCLUDED.created_at`,
		c.ID, c.PersonID, c.UserID, c.Status, c.CreatedAt,
	)
	return err
}

func (r *ClaimRepository) GetByID(ctx context.Context, id string) (*models.Claim, error) {
	var c models.Claim
	err := database.DB.QueryRow(ctx,
		`SELECT id, person_id, user_id, status, created_at FROM claims WHERE id = $1`, id,
	).Scan(&c.ID, &c.PersonID, &c.UserID, &c.Status, &c.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *ClaimRepository) UpdateStatus(ctx context.Context, id, status string) error {
	_, err := database.DB.Exec(ctx,
		`UPDATE claims SET status = $1 WHERE id = $2`, status, id,
	)
	return err
}

// GetPendingByFamily returns pending claims for persons belonging to the given family.
func (r *ClaimRepository) GetPendingByFamily(ctx context.Context, familyID string) ([]models.ClaimView, error) {
	rows, err := database.DB.Query(ctx, `
		SELECT c.id, c.person_id, p.first_name, p.last_name, c.user_id, u.email, c.status, c.created_at
		FROM claims c
		JOIN persons p ON p.id = c.person_id
		JOIN users u ON u.id = c.user_id
		WHERE p.family_id = $1 AND c.status = 'pending'
		ORDER BY c.created_at DESC
	`, familyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var views []models.ClaimView
	for rows.Next() {
		var v models.ClaimView
		if err := rows.Scan(
			&v.ID, &v.PersonID, &v.PersonFirstName, &v.PersonLastName,
			&v.UserID, &v.UserEmail, &v.Status, &v.CreatedAt,
		); err != nil {
			return nil, err
		}
		views = append(views, v)
	}
	return views, nil
}
