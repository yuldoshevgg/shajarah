package models

import "time"

type Document struct {
	ID          string    `json:"id"`
	PersonID    string    `json:"person_id"`
	FileURL     string    `json:"file_url"`
	Description string    `json:"description"`
	UploadedAt  time.Time `json:"uploaded_at"`
}
