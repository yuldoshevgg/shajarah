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
	_, err := database.DB.Exec(ctx,
		`INSERT INTO stories (id, person_id, title, content, cover_url) VALUES ($1, $2, $3, $4, $5)`,
		s.ID, s.PersonID, s.Title, s.Content, s.CoverURL,
	)
	return err
}

func (r *StoryRepository) GetStoriesByPerson(ctx context.Context, personID string) ([]models.Story, error) {
	rows, err := database.DB.Query(ctx,
		`SELECT id, person_id, title, content, cover_url, created_at FROM stories WHERE person_id = $1 ORDER BY created_at DESC`,
		personID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var stories []models.Story
	for rows.Next() {
		var s models.Story
		if err := rows.Scan(&s.ID, &s.PersonID, &s.Title, &s.Content, &s.CoverURL, &s.CreatedAt); err != nil {
			return nil, err
		}
		stories = append(stories, s)
	}
	return stories, nil
}
