package repository

import (
	"context"

	"shajarah-backend/internal/database"
	"shajarah-backend/internal/models"
)

type UserRepository struct{}

func NewUserRepository() *UserRepository {
	return &UserRepository{}
}

func (r *UserRepository) CreateUser(ctx context.Context, u *models.User) error {
	if u.Plan == "" {
		u.Plan = "free"
	}
	_, err := database.DB.Exec(ctx,
		`INSERT INTO users (id, email, password_hash, plan, created_at) VALUES ($1, $2, $3, $4, $5)`,
		u.ID, u.Email, u.PasswordHash, u.Plan, u.CreatedAt,
	)
	return err
}

func (r *UserRepository) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	var u models.User
	err := database.DB.QueryRow(ctx,
		`SELECT id, email, password_hash, plan, created_at FROM users WHERE email = $1`, email,
	).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Plan, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *UserRepository) GetUserByID(ctx context.Context, id string) (*models.User, error) {
	var u models.User
	err := database.DB.QueryRow(ctx,
		`SELECT id, email, password_hash, plan, created_at FROM users WHERE id = $1`, id,
	).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Plan, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *UserRepository) UpdateUserPlan(ctx context.Context, userID, plan string) error {
	_, err := database.DB.Exec(ctx,
		`UPDATE users SET plan = $1 WHERE id = $2`,
		plan, userID,
	)
	return err
}

// LinkUserToPerson inserts a user_person_links row (family_id may be empty until the user joins a family).
func (r *UserRepository) LinkUserToPerson(ctx context.Context, linkID, userID, personID string) error {
	_, err := database.DB.Exec(ctx,
		`INSERT INTO user_person_links (id, user_id, person_id, created_at)
		 VALUES ($1, $2, $3, NOW()) ON CONFLICT DO NOTHING`,
		linkID, userID, personID,
	)
	return err
}

// GetPersonIDForUser returns the person_id linked to a user via user_person_links.
func (r *UserRepository) GetPersonIDForUser(ctx context.Context, userID string) (string, error) {
	var personID string
	err := database.DB.QueryRow(ctx,
		`SELECT person_id FROM user_person_links WHERE user_id = $1 LIMIT 1`, userID,
	).Scan(&personID)
	return personID, err
}
