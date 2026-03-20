package models

type CreatePersonRequest struct {
	FamilyID   string `json:"family_id" binding:"required"`
	FirstName  string `json:"first_name" binding:"required"`
	LastName   string `json:"last_name"`
	Gender     string `json:"gender" binding:"required,oneof=male female"`
	BirthDate  string `json:"birth_date"`
	Biography  string `json:"biography"`
	Visibility string `json:"visibility"`
}

type CreateFamilyRequest struct {
	Name string `json:"name" binding:"required"`
}

type CreateStoryRequest struct {
	PersonID string `json:"person_id" binding:"required"`
	Title    string `json:"title" binding:"required"`
	Content  string `json:"content"`
}

type CreateEventRequest struct {
	PersonID    string `json:"person_id" binding:"required"`
	EventType   string `json:"event_type" binding:"required"`
	EventDate   string `json:"event_date"`
	Description string `json:"description"`
}

type CreateRelationshipRequest struct {
	Person1ID    string `json:"person1_id" binding:"required"`
	Person2ID    string `json:"person2_id" binding:"required"`
	RelationType string `json:"relation_type" binding:"required"`
}

type RegisterRequest struct {
	Email     string `json:"email" binding:"required,email"`
	Password  string `json:"password" binding:"required,min=8"`
	FirstName string `json:"first_name" binding:"required"`
	LastName  string `json:"last_name"`
	Gender    string `json:"gender" binding:"required,oneof=male female"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type UpdatePersonRequest struct {
	FirstName  *string `json:"first_name"`
	LastName   *string `json:"last_name"`
	Gender     *string `json:"gender"`
	BirthDate  *string `json:"birth_date"`
	Biography  *string `json:"biography"`
	Visibility *string `json:"visibility"`
}

type UpdateRelationshipRequest struct {
	RelationType string `json:"relation_type" binding:"required"`
}

type InviteRequest struct {
	Email string `json:"email" binding:"required,email"`
	Role  string `json:"role" binding:"required,oneof=admin editor viewer"`
}
