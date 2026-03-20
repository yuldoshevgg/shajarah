package repository

import (
	"context"

	"shajarah-backend/internal/database"
	"shajarah-backend/internal/models"

	"github.com/google/uuid"
)

type MemberRepository struct{}

func NewMemberRepository() *MemberRepository {
	return &MemberRepository{}
}

func (r *MemberRepository) AddMember(ctx context.Context, familyID, userID, role string) error {
	query := `
	INSERT INTO family_members (id, family_id, user_id, role)
	VALUES ($1, $2, $3, $4)
	ON CONFLICT (family_id, user_id) DO NOTHING
	`
	_, err := database.DB.Exec(ctx, query, uuid.New().String(), familyID, userID, role)
	return err
}

func (r *MemberRepository) GetUserFamiliesWithStats(ctx context.Context, userID string) ([]models.FamilyWithStats, error) {
	rows, err := database.DB.Query(ctx, `
		SELECT
			f.id, f.name, fm.role,
			(SELECT COUNT(*) FROM persons WHERE family_id = f.id)::int,
			(SELECT COUNT(*) FROM family_members WHERE family_id = f.id)::int
		FROM family_members fm
		JOIN families f ON f.id = fm.family_id
		WHERE fm.user_id = $1
		ORDER BY f.created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []models.FamilyWithStats
	for rows.Next() {
		var f models.FamilyWithStats
		if err := rows.Scan(&f.ID, &f.Name, &f.Role, &f.PersonCount, &f.MemberCount); err != nil {
			return nil, err
		}
		result = append(result, f)
	}
	return result, nil
}

func (r *MemberRepository) GetMemberRole(ctx context.Context, familyID, userID string) (string, error) {
	query := `SELECT role FROM family_members WHERE family_id = $1 AND user_id = $2`
	row := database.DB.QueryRow(ctx, query, familyID, userID)

	var role string
	if err := row.Scan(&role); err != nil {
		return "", err
	}
	return role, nil
}
