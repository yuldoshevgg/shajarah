package repository

import (
	"context"

	"shajarah-backend/internal/database"
	"shajarah-backend/internal/models"
)

type StoryRepository struct{}

func NewStoryRepository() *StoryRepository {
	return &StoryRepository{}
}

func (r *StoryRepository) CreateStory(ctx context.Context, s *models.Story) error {
	query := `
	INSERT INTO stories (id, person_id, title, content)
	VALUES ($1, $2, $3, $4)
	`

	_, err := database.DB.Exec(ctx, query, s.ID, s.PersonID, s.Title, s.Content)

	return err
}

func (r *StoryRepository) GetStoriesByPerson(ctx context.Context, personID string) ([]models.Story, error) {
	query := `
	SELECT id, person_id, title, content, created_at
	FROM stories
	WHERE person_id = $1
	ORDER BY created_at DESC
	`

	rows, err := database.DB.Query(ctx, query, personID)
	if err != nil {
		return nil, err
	}

	defer rows.Close()

	var stories []models.Story

	for rows.Next() {
		var s models.Story

		if err := rows.Scan(&s.ID, &s.PersonID, &s.Title, &s.Content, &s.CreatedAt); err != nil {
			return nil, err
		}

		stories = append(stories, s)
	}

	return stories, nil
}
