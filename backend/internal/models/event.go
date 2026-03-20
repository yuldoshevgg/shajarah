package models

import "time"

type Event struct {
	ID          string     `json:"id"`
	PersonID    string     `json:"person_id"`
	EventType   string     `json:"event_type"`
	EventDate   *time.Time `json:"event_date"`
	Description string     `json:"description"`
}
