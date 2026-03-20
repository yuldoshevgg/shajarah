package repository

import (
	"context"

	"shajarah-backend/internal/database"
	"shajarah-backend/internal/models"
)

type EventRepository struct{}

func NewEventRepository() *EventRepository {
	return &EventRepository{}
}

func (r *EventRepository) CreateEvent(ctx context.Context, e *models.Event) error {
	query := `
	INSERT INTO events (id, person_id, event_type, event_date, description)
	VALUES ($1, $2, $3, $4, $5)
	`

	_, err := database.DB.Exec(ctx, query, e.ID, e.PersonID, e.EventType, e.EventDate, e.Description)

	return err
}

func (r *EventRepository) GetEventsByPerson(ctx context.Context, personID string) ([]models.Event, error) {
	query := `
	SELECT id, person_id, event_type, event_date, description
	FROM events
	WHERE person_id = $1
	ORDER BY event_date ASC NULLS LAST
	`

	rows, err := database.DB.Query(ctx, query, personID)
	if err != nil {
		return nil, err
	}

	defer rows.Close()

	var events []models.Event

	for rows.Next() {
		var e models.Event

		if err := rows.Scan(&e.ID, &e.PersonID, &e.EventType, &e.EventDate, &e.Description); err != nil {
			return nil, err
		}

		events = append(events, e)
	}

	return events, nil
}
