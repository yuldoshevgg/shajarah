package models

// FamilyWithStats is used in the dashboard response.
type FamilyWithStats struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Role        string `json:"role"`
	PersonCount int    `json:"person_count"`
	MemberCount int    `json:"member_count"`
}
