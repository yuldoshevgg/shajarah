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
	query := `
	INSERT INTO users (id, email, password_hash, person_id, created_at)
	VALUES ($1, $2, $3, $4, $5)
	`
	_, err := database.DB.Exec(ctx, query, u.ID, u.Email, u.PasswordHash, u.PersonID, u.CreatedAt)
	return err
}

func (r *UserRepository) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	query := `SELECT id, email, password_hash, person_id, created_at FROM users WHERE email = $1`
	row := database.DB.QueryRow(ctx, query, email)

	var u models.User
	if err := row.Scan(&u.ID, &u.Email, &u.PasswordHash, &u.PersonID, &u.CreatedAt); err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *UserRepository) GetUserByPersonID(ctx context.Context, personID string) (*models.User, error) {
	query := `SELECT id, email, password_hash, person_id, created_at FROM users WHERE person_id = $1`
	row := database.DB.QueryRow(ctx, query, personID)
	var u models.User
	if err := row.Scan(&u.ID, &u.Email, &u.PasswordHash, &u.PersonID, &u.CreatedAt); err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *UserRepository) UpdatePersonID(ctx context.Context, userID, personID string) error {
	_, err := database.DB.Exec(ctx, `UPDATE users SET person_id = $1 WHERE id = $2`, personID, userID)
	return err
}

func (r *UserRepository) GetUserByID(ctx context.Context, id string) (*models.User, error) {
	query := `SELECT id, email, password_hash, person_id, created_at FROM users WHERE id = $1`
	row := database.DB.QueryRow(ctx, query, id)

	var u models.User
	if err := row.Scan(&u.ID, &u.Email, &u.PasswordHash, &u.PersonID, &u.CreatedAt); err != nil {
		return nil, err
	}
	return &u, nil
}
