package repository

import (
	"context"

	"shajarah-backend/internal/database"
	"shajarah-backend/internal/models"
)

type AuditRepository struct{}

func NewAuditRepository() *AuditRepository {
	return &AuditRepository{}
}

func (r *AuditRepository) Log(ctx context.Context, log *models.AuditLog) error {
	query := `
	INSERT INTO audit_logs (id, user_id, family_id, entity_type, entity_id, action, created_at)
	VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	_, err := database.DB.Exec(ctx, query,
		log.ID, log.UserID, log.FamilyID, log.EntityType, log.EntityID, log.Action, log.CreatedAt,
	)
	return err
}

func (r *AuditRepository) GetByFamilyID(ctx context.Context, familyID string) ([]models.AuditLog, error) {
	query := `
	SELECT id, user_id, family_id, entity_type, entity_id, action, created_at
	FROM audit_logs
	WHERE family_id = $1
	ORDER BY created_at DESC
	LIMIT 100
	`
	rows, err := database.DB.Query(ctx, query, familyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []models.AuditLog
	for rows.Next() {
		var l models.AuditLog
		if err := rows.Scan(&l.ID, &l.UserID, &l.FamilyID, &l.EntityType, &l.EntityID, &l.Action, &l.CreatedAt); err != nil {
			return nil, err
		}
		logs = append(logs, l)
	}
	return logs, nil
}
