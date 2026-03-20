package repository

import (
	"context"

	"shajarah-backend/internal/database"
	"shajarah-backend/internal/models"
)

type FamilyRepository struct{}

func NewFamilyRepository() *FamilyRepository {
	return &FamilyRepository{}
}

func (r *FamilyRepository) CreateFamily(ctx context.Context, f *models.Family) error {
	query := `
	INSERT INTO families (id, name, owner_id)
	VALUES ($1, $2, $3)
	`

	_, err := database.DB.Exec(ctx, query, f.ID, f.Name, f.OwnerID)

	return err
}

func (r *FamilyRepository) GetFamilyByID(ctx context.Context, id string) (*models.Family, error) {
	query := `
	SELECT id, name, owner_id, created_at
	FROM families
	WHERE id = $1
	`

	var f models.Family

	err := database.DB.QueryRow(ctx, query, id).Scan(
		&f.ID,
		&f.Name,
		&f.OwnerID,
		&f.CreatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &f, nil
}

func (r *FamilyRepository) GetFamilies(ctx context.Context) ([]models.Family, error) {
	query := `
	SELECT id, name, owner_id, created_at
	FROM families
	ORDER BY created_at DESC
	`

	rows, err := database.DB.Query(ctx, query)
	if err != nil {
		return nil, err
	}

	defer rows.Close()

	var families []models.Family

	for rows.Next() {
		var f models.Family

		err := rows.Scan(&f.ID, &f.Name, &f.OwnerID, &f.CreatedAt)
		if err != nil {
			return nil, err
		}

		families = append(families, f)
	}

	return families, nil
}

func (r *FamilyRepository) GetFamiliesByUser(ctx context.Context, userID string) ([]models.Family, error) {
	query := `
	SELECT f.id, f.name, f.owner_id, f.created_at, fm.role
	FROM families f
	JOIN family_members fm ON fm.family_id = f.id
	WHERE fm.user_id = $1
	ORDER BY f.created_at DESC
	`

	rows, err := database.DB.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}

	defer rows.Close()

	var families []models.Family

	for rows.Next() {
		var f models.Family
		if err := rows.Scan(&f.ID, &f.Name, &f.OwnerID, &f.CreatedAt, &f.UserRole); err != nil {
			return nil, err
		}
		families = append(families, f)
	}

	return families, nil
}

func (r *FamilyRepository) TransferOwnership(ctx context.Context, familyID, newOwnerID string) error {
	_, err := database.DB.Exec(ctx,
		`UPDATE families SET owner_id = $1 WHERE id = $2`,
		newOwnerID, familyID,
	)
	return err
}

func (r *FamilyRepository) DeleteFamily(ctx context.Context, id string) error {
	query := `
	DELETE FROM families
	WHERE id = $1
	`

	_, err := database.DB.Exec(ctx, query, id)

	return err
}
