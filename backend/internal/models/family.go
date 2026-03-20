package models

import "time"

type Family struct {
	ID        string    `db:"id" json:"id"`
	Name      string    `db:"name" json:"name"`
	OwnerID   *string   `db:"owner_id" json:"owner_id"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	// UserRole is populated only when queried in the context of a specific user (e.g. GetFamiliesByUser).
	UserRole  string    `db:"-" json:"user_role,omitempty"`
}
