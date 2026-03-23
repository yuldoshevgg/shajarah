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
	_, err := database.DB.Exec(ctx,
		`INSERT INTO invitations (id, family_id, role, status, token, invited_by, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		inv.ID, inv.FamilyID, inv.Role, inv.Status, inv.Token, inv.InvitedBy, inv.CreatedAt,
	)
	return err
}

func (r *InvitationRepository) GetByFamilyID(ctx context.Context, familyID string) ([]models.Invitation, error) {
	rows, err := database.DB.Query(ctx,
		`SELECT id, family_id, COALESCE(person_id::text,''), role, status, token,
		        COALESCE(invited_by,''), created_at
		 FROM invitations WHERE family_id = $1 ORDER BY created_at DESC`,
		familyID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var invitations []models.Invitation
	for rows.Next() {
		var inv models.Invitation
		if err := rows.Scan(&inv.ID, &inv.FamilyID, &inv.PersonID, &inv.Role, &inv.Status,
			&inv.Token, &inv.InvitedBy, &inv.CreatedAt); err != nil {
			return nil, err
		}
		invitations = append(invitations, inv)
	}
	return invitations, nil
}

func (r *InvitationRepository) GetByToken(ctx context.Context, token string) (*models.Invitation, error) {
	var inv models.Invitation
	err := database.DB.QueryRow(ctx,
		`SELECT id, family_id, COALESCE(person_id::text,''), role, status, token,
		        COALESCE(invited_by,''), created_at
		 FROM invitations WHERE token = $1`,
		token,
	).Scan(&inv.ID, &inv.FamilyID, &inv.PersonID, &inv.Role, &inv.Status,
		&inv.Token, &inv.InvitedBy, &inv.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &inv, nil
}

func (r *InvitationRepository) UpdateStatus(ctx context.Context, id, status string) error {
	_, err := database.DB.Exec(ctx, `UPDATE invitations SET status = $1 WHERE id = $2`, status, id)
	return err
}
