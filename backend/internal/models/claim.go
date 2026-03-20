package models

import "time"

type Claim struct {
	ID        string    `json:"id"`
	PersonID  string    `json:"person_id"`
	UserID    string    `json:"user_id"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

// ClaimView enriches a claim with person and user info for admin review.
type ClaimView struct {
	ID              string    `json:"id"`
	PersonID        string    `json:"person_id"`
	PersonFirstName string    `json:"person_first_name"`
	PersonLastName  string    `json:"person_last_name"`
	UserID          string    `json:"user_id"`
	UserEmail       string    `json:"user_email"`
	Status          string    `json:"status"`
	CreatedAt       time.Time `json:"created_at"`
}
