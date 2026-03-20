package models

import "time"

type Photo struct {
	ID         string    `json:"id"`
	PersonID   string    `json:"person_id"`
	URL        string    `json:"url"`
	UploadedAt time.Time `json:"uploaded_at"`
}
