package models

import "time"

type Person struct {
	ID         string     `db:"id" json:"id"`
	FamilyID   *string    `db:"family_id" json:"family_id"`
	Email      *string    `db:"email" json:"email"`
	FirstName  string     `db:"first_name" json:"first_name"`
	LastName   string     `db:"last_name" json:"last_name"`
	Gender     string     `db:"gender" json:"gender"`
	BirthDate  *time.Time `db:"birth_date" json:"birth_date"`
	DeathDate  *time.Time `db:"death_date" json:"death_date"`
	Biography  string     `db:"biography" json:"biography"`
	Visibility string     `db:"visibility" json:"visibility"`
	CreatedAt  time.Time  `db:"created_at" json:"created_at"`
}
