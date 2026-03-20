package models

import "time"

type Relationship struct {
	ID           string    `db:"id" json:"id"`
	Person1ID    string    `db:"person1_id" json:"person1_id"`
	Person2ID    string    `db:"person2_id" json:"person2_id"`
	RelationType string    `db:"relation_type" json:"relation_type"`
	CreatedAt    time.Time `db:"created_at" json:"created_at"`
}

type RelatedPerson struct {
	ID        string `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
}

type PersonRelationshipView struct {
	ID            string        `json:"id"`
	RelationType  string        `json:"relation_type"`
	RelatedPerson RelatedPerson `json:"related_person"`
}
