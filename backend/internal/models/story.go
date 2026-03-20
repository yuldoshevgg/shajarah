package models

import "time"

type Story struct {
	ID        string    `json:"id"`
	PersonID  string    `json:"person_id"`
	Title     string    `json:"title"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at"`
}
