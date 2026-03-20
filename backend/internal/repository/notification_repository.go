package repository

import (
	"context"

	"shajarah-backend/internal/database"
	"shajarah-backend/internal/models"
)

type NotificationRepository struct{}

func NewNotificationRepository() *NotificationRepository {
	return &NotificationRepository{}
}

func (r *NotificationRepository) Create(ctx context.Context, n *models.Notification) error {
	query := `
	INSERT INTO notifications (id, user_id, family_id, type, ref, message, read, created_at)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	_, err := database.DB.Exec(ctx, query, n.ID, n.UserID, n.FamilyID, n.Type, n.Ref, n.Message, n.Read, n.CreatedAt)
	return err
}

func (r *NotificationRepository) GetByUserID(ctx context.Context, userID string) ([]models.Notification, error) {
	query := `
	SELECT id, user_id, family_id, type, coalesce(ref, ''), message, read, created_at
	FROM notifications
	WHERE user_id = $1
	ORDER BY created_at DESC
	LIMIT 50
	`
	rows, err := database.DB.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var notifs []models.Notification
	for rows.Next() {
		var n models.Notification
		if err := rows.Scan(&n.ID, &n.UserID, &n.FamilyID, &n.Type, &n.Ref, &n.Message, &n.Read, &n.CreatedAt); err != nil {
			return nil, err
		}
		notifs = append(notifs, n)
	}
	return notifs, nil
}

func (r *NotificationRepository) MarkRead(ctx context.Context, id, userID string) error {
	_, err := database.DB.Exec(ctx,
		`UPDATE notifications SET read = TRUE WHERE id = $1 AND user_id = $2`,
		id, userID,
	)
	return err
}

func (r *NotificationRepository) CountUnread(ctx context.Context, userID string) (int, error) {
	var count int
	err := database.DB.QueryRow(ctx,
		`SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read = FALSE`,
		userID,
	).Scan(&count)
	return count, err
}
