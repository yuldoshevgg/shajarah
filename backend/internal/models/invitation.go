package models

import "time"

type Invitation struct {
	ID        string    `json:"id"`
	FamilyID  string    `json:"family_id"`
	PersonID  string    `json:"person_id"`
	Role      string    `json:"role"`
	Status    string    `json:"status"`
	Token     string    `json:"token"`
	InvitedBy string    `json:"invited_by"`
	CreatedAt time.Time `json:"created_at"`
}
