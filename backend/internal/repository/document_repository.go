package repository

import (
	"context"

	"shajarah-backend/internal/database"
	"shajarah-backend/internal/models"
)

type DocumentRepository struct{}

func NewDocumentRepository() *DocumentRepository {
	return &DocumentRepository{}
}

func (r *DocumentRepository) Save(ctx context.Context, d *models.Document) error {
	_, err := database.DB.Exec(ctx,
		`INSERT INTO documents (id, person_id, file_url, description) VALUES ($1, $2, $3, $4)`,
		d.ID, d.PersonID, d.FileURL, d.Description,
	)
	return err
}

func (r *DocumentRepository) GetByPerson(ctx context.Context, personID string) ([]models.Document, error) {
	rows, err := database.DB.Query(ctx,
		`SELECT id, person_id, file_url, description, uploaded_at FROM documents WHERE person_id = $1 ORDER BY uploaded_at DESC`,
		personID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var docs []models.Document
	for rows.Next() {
		var d models.Document
		if err := rows.Scan(&d.ID, &d.PersonID, &d.FileURL, &d.Description, &d.UploadedAt); err != nil {
			return nil, err
		}
		docs = append(docs, d)
	}
	return docs, nil
}

func (r *DocumentRepository) Delete(ctx context.Context, id string) error {
	_, err := database.DB.Exec(ctx, `DELETE FROM documents WHERE id = $1`, id)
	return err
}
