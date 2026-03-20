package models

import (
	"time"

	"gopkg.in/guregu/null.v4/zero"
)

type User struct {
	ID           string      `json:"id"`
	Email        string      `json:"email"`
	PersonID     zero.String `json:"person_id"`
	PasswordHash string      `json:"-"`
	CreatedAt    time.Time   `json:"created_at"`
}
