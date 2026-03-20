package repository

import (
	"context"

	"shajarah-backend/internal/database"
	"shajarah-backend/internal/models"
)

type InvitationRepository struct{}

func NewInvitationRepository() *InvitationRepository {
	return &InvitationRepository{}
}

func (r *InvitationRepository) CreateInvitation(ctx context.Context, inv *models.Invitation) error {
	query := `
	INSERT INTO invitations (id, family_id, email, role, status, token, invited_by, created_at)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	_, err := database.DB.Exec(ctx, query,
		inv.ID, inv.FamilyID, inv.Email, inv.Role,
		inv.Status, inv.Token, inv.InvitedBy, inv.CreatedAt,
	)
	return err
}

func (r *InvitationRepository) GetByFamilyID(ctx context.Context, familyID string) ([]models.Invitation, error) {
	query := `
	SELECT id, family_id, email, role, status, token, invited_by, created_at
	FROM invitations
	WHERE family_id = $1
	ORDER BY created_at DESC
	`
	rows, err := database.DB.Query(ctx, query, familyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var invitations []models.Invitation
	for rows.Next() {
		var inv models.Invitation
		if err := rows.Scan(&inv.ID, &inv.FamilyID, &inv.Email, &inv.Role, &inv.Status, &inv.Token, &inv.InvitedBy, &inv.CreatedAt); err != nil {
			return nil, err
		}
		invitations = append(invitations, inv)
	}
	return invitations, nil
}

func (r *InvitationRepository) GetByToken(ctx context.Context, token string) (*models.Invitation, error) {
	query := `
	SELECT id, family_id, email, role, status, token, invited_by, created_at
	FROM invitations
	WHERE token = $1
	`
	var inv models.Invitation
	err := database.DB.QueryRow(ctx, query, token).Scan(
		&inv.ID, &inv.FamilyID, &inv.Email, &inv.Role,
		&inv.Status, &inv.Token, &inv.InvitedBy, &inv.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &inv, nil
}

func (r *InvitationRepository) UpdateStatus(ctx context.Context, id, status string) error {
	_, err := database.DB.Exec(ctx, `UPDATE invitations SET status = $1 WHERE id = $2`, status, id)
	return err
}
