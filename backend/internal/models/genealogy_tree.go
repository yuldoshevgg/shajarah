package models

type GenealogyPerson struct {
	ID        string  `json:"id"`
	FirstName string  `json:"first_name"`
	LastName  string  `json:"last_name"`
	Gender    string  `json:"gender"`
	BirthDate *string `json:"birth_date"`
	DeathDate *string `json:"death_date"`
	PhotoURL  *string `json:"photo_url"`
}

type ParentChildRelation struct {
	ParentID string `json:"parent_id"`
	ChildID  string `json:"child_id"`
}

type SpouseRelation struct {
	Person1ID string `json:"person1_id"`
	Person2ID string `json:"person2_id"`
}

type SiblingRelation struct {
	Person1ID string `json:"person1_id"`
	Person2ID string `json:"person2_id"`
}

type GenealogyTree struct {
	Persons     []GenealogyPerson     `json:"persons"`
	ParentChild []ParentChildRelation `json:"parent_child"`
	Spouses     []SpouseRelation      `json:"spouses"`
	Siblings    []SiblingRelation     `json:"siblings"`
}
