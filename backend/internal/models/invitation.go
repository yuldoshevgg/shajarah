package models

import "time"

type Invitation struct {
	ID         string    `json:"id"`
	FamilyID   string    `json:"family_id"`
	Email      string    `json:"email"`
	Role       string    `json:"role"`
	Status     string    `json:"status"`
	Token      string    `json:"token"`
	InvitedBy  string    `json:"invited_by"`
	CreatedAt  time.Time `json:"created_at"`
}
