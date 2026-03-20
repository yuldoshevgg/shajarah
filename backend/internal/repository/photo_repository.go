package repository

import (
	"context"

	"shajarah-backend/internal/database"
	"shajarah-backend/internal/models"
)

type PhotoRepository struct{}

func NewPhotoRepository() *PhotoRepository {
	return &PhotoRepository{}
}

func (r *PhotoRepository) SavePhoto(ctx context.Context, p *models.Photo) error {
	query := `
	INSERT INTO photos (id, person_id, url)
	VALUES ($1, $2, $3)
	`

	_, err := database.DB.Exec(ctx, query, p.ID, p.PersonID, p.URL)

	return err
}

func (r *PhotoRepository) GetPhotosByPerson(ctx context.Context, personID string) ([]models.Photo, error) {
	query := `
	SELECT id, person_id, url, uploaded_at
	FROM photos
	WHERE person_id = $1
	ORDER BY uploaded_at DESC
	`

	rows, err := database.DB.Query(ctx, query, personID)
	if err != nil {
		return nil, err
	}

	defer rows.Close()

	var photos []models.Photo

	for rows.Next() {
		var p models.Photo

		if err := rows.Scan(&p.ID, &p.PersonID, &p.URL, &p.UploadedAt); err != nil {
			return nil, err
		}

		photos = append(photos, p)
	}

	return photos, nil
}
