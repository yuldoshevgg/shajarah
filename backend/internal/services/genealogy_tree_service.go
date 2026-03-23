package services

import (
	"context"

	"shajarah-backend/internal/database"
	"shajarah-backend/internal/models"
)

type GenealogyTreeService struct{}

func NewGenealogyTreeService() *GenealogyTreeService {
	return &GenealogyTreeService{}
}

func (s *GenealogyTreeService) InvalidateCache(_ string) {
	// no-op: caching removed to prevent stale tree data
}

func (s *GenealogyTreeService) GetFamilyGenealogyTree(ctx context.Context, familyID string) (*models.GenealogyTree, error) {
	return s.buildFamilyTree(ctx, familyID)
}

func (s *GenealogyTreeService) buildFamilyTree(ctx context.Context, familyID string) (*models.GenealogyTree, error) {
	tree := &models.GenealogyTree{
		Persons:     []models.GenealogyPerson{},
		ParentChild: []models.ParentChildRelation{},
		Spouses:     []models.SpouseRelation{},
		Siblings:    []models.SiblingRelation{},
	}

	rows, err := database.DB.Query(ctx, `
		SELECT
			p.id, p.first_name, p.last_name, p.gender,
			TO_CHAR(p.birth_date, 'YYYY-MM-DD'),
			TO_CHAR(p.death_date, 'YYYY-MM-DD'),
			(SELECT ph.url FROM photos ph WHERE ph.person_id = p.id ORDER BY ph.uploaded_at LIMIT 1)
		FROM persons p
		WHERE p.family_id = $1
		ORDER BY p.created_at
	`, familyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var gp models.GenealogyPerson
		if err := rows.Scan(&gp.ID, &gp.FirstName, &gp.LastName, &gp.Gender, &gp.BirthDate, &gp.DeathDate, &gp.PhotoURL); err != nil {
			return nil, err
		}
		tree.Persons = append(tree.Persons, gp)
	}

	rows2, err := database.DB.Query(ctx, `
		SELECT r.person1_id, r.person2_id, r.relation_type
		FROM relationships r
		WHERE r.person1_id IN (SELECT id FROM persons WHERE family_id = $1)
		   OR r.person2_id IN (SELECT id FROM persons WHERE family_id = $1)
	`, familyID)
	if err != nil {
		return nil, err
	}
	defer rows2.Close()

	spouseSet := make(map[string]bool)
	pcSet := make(map[string]bool)
	for rows2.Next() {
		var p1, p2, t string
		if err := rows2.Scan(&p1, &p2, &t); err != nil {
			return nil, err
		}
		switch t {
		case "parent":
			key := p1 + ":" + p2
			if !pcSet[key] {
				pcSet[key] = true
				tree.ParentChild = append(tree.ParentChild, models.ParentChildRelation{ParentID: p1, ChildID: p2})
			}
		case "spouse":
			k1 := p1 + ":" + p2
			k2 := p2 + ":" + p1
			if !spouseSet[k1] && !spouseSet[k2] {
				spouseSet[k1] = true
				tree.Spouses = append(tree.Spouses, models.SpouseRelation{Person1ID: p1, Person2ID: p2})
			}
		}
	}

	return tree, nil
}

func (s *GenealogyTreeService) GetAncestorTree(ctx context.Context, personID string) (*models.GenealogyTree, error) {
	tree := &models.GenealogyTree{
		Persons:     []models.GenealogyPerson{},
		ParentChild: []models.ParentChildRelation{},
		Spouses:     []models.SpouseRelation{},
	}

	// Recursive CTE to get the target person + all ancestors
	rows, err := database.DB.Query(ctx, `
		WITH RECURSIVE ancestors AS (
			SELECT p.id, p.first_name, p.last_name, p.gender,
				TO_CHAR(p.birth_date, 'YYYY-MM-DD') AS birth_date,
				TO_CHAR(p.death_date, 'YYYY-MM-DD') AS death_date
			FROM persons p
			WHERE p.id = $1

			UNION

			SELECT p.id, p.first_name, p.last_name, p.gender,
				TO_CHAR(p.birth_date, 'YYYY-MM-DD'),
				TO_CHAR(p.death_date, 'YYYY-MM-DD')
			FROM ancestors a
			JOIN relationships r ON (r.person2_id = a.id AND r.relation_type = 'parent')
			JOIN persons p ON p.id = r.person1_id
		)
		SELECT DISTINCT id, first_name, last_name, gender, birth_date, death_date
		FROM ancestors
	`, personID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	personIDs := make([]string, 0)
	for rows.Next() {
		var gp models.GenealogyPerson
		if err := rows.Scan(&gp.ID, &gp.FirstName, &gp.LastName, &gp.Gender, &gp.BirthDate, &gp.DeathDate); err != nil {
			return nil, err
		}
		tree.Persons = append(tree.Persons, gp)
		personIDs = append(personIDs, gp.ID)
	}

	if len(personIDs) == 0 {
		return tree, nil
	}

	// Fetch photos for ancestor persons
	photoRows, err := database.DB.Query(ctx, `
		SELECT DISTINCT ON (person_id) person_id, url
		FROM photos
		WHERE person_id = ANY($1)
		ORDER BY person_id, uploaded_at
	`, personIDs)
	if err == nil {
		defer photoRows.Close()
		photoMap := make(map[string]string)
		for photoRows.Next() {
			var pid, url string
			if err := photoRows.Scan(&pid, &url); err == nil {
				photoMap[pid] = url
			}
		}
		for i := range tree.Persons {
			if url, ok := photoMap[tree.Persons[i].ID]; ok {
				tree.Persons[i].PhotoURL = &url
			}
		}
	}

	// Fetch relationships between ancestor persons
	relRows, err := database.DB.Query(ctx, `
		SELECT person1_id, person2_id, relation_type
		FROM relationships
		WHERE person1_id = ANY($1) AND person2_id = ANY($1)
	`, personIDs)
	if err != nil {
		return nil, err
	}
	defer relRows.Close()

	spouseSet2 := make(map[string]bool)
	pcSet2 := make(map[string]bool)
	for relRows.Next() {
		var p1, p2, t string
		if err := relRows.Scan(&p1, &p2, &t); err != nil {
			return nil, err
		}
		switch t {
		case "parent":
			key := p1 + ":" + p2
			if !pcSet2[key] {
				pcSet2[key] = true
				tree.ParentChild = append(tree.ParentChild, models.ParentChildRelation{ParentID: p1, ChildID: p2})
			}
		case "spouse":
			k1 := p1 + ":" + p2
			k2 := p2 + ":" + p1
			if !spouseSet2[k1] && !spouseSet2[k2] {
				spouseSet2[k1] = true
				tree.Spouses = append(tree.Spouses, models.SpouseRelation{Person1ID: p1, Person2ID: p2})
			}
		}
	}

	return tree, nil
}

// GetDescendantsTree returns all descendants of a person as a GenealogyTree.
func (s *GenealogyTreeService) GetDescendantsTree(ctx context.Context, personID string) (*models.GenealogyTree, error) {
	tree := &models.GenealogyTree{
		Persons:     []models.GenealogyPerson{},
		ParentChild: []models.ParentChildRelation{},
		Spouses:     []models.SpouseRelation{},
	}

	rows, err := database.DB.Query(ctx, `
		WITH RECURSIVE descendants AS (
			SELECT p.id, p.first_name, p.last_name, p.gender,
				TO_CHAR(p.birth_date, 'YYYY-MM-DD') AS birth_date,
				TO_CHAR(p.death_date, 'YYYY-MM-DD') AS death_date
			FROM persons p WHERE p.id = $1

			UNION

			SELECT p.id, p.first_name, p.last_name, p.gender,
				TO_CHAR(p.birth_date, 'YYYY-MM-DD'),
				TO_CHAR(p.death_date, 'YYYY-MM-DD')
			FROM descendants d
			JOIN relationships r ON (r.person1_id = d.id AND r.relation_type = 'parent')
			JOIN persons p ON p.id = r.person2_id
		)
		SELECT DISTINCT id, first_name, last_name, gender, birth_date, death_date
		FROM descendants
	`, personID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	personIDs := make([]string, 0)
	for rows.Next() {
		var gp models.GenealogyPerson
		if err := rows.Scan(&gp.ID, &gp.FirstName, &gp.LastName, &gp.Gender, &gp.BirthDate, &gp.DeathDate); err != nil {
			return nil, err
		}
		tree.Persons = append(tree.Persons, gp)
		personIDs = append(personIDs, gp.ID)
	}

	if len(personIDs) == 0 {
		return tree, nil
	}

	// Photos
	photoRows, err := database.DB.Query(ctx, `
		SELECT DISTINCT ON (person_id) person_id, url FROM photos
		WHERE person_id = ANY($1) ORDER BY person_id, uploaded_at
	`, personIDs)
	if err == nil {
		defer photoRows.Close()
		photoMap := make(map[string]string)
		for photoRows.Next() {
			var pid, url string
			if err := photoRows.Scan(&pid, &url); err == nil {
				photoMap[pid] = url
			}
		}
		for i := range tree.Persons {
			if url, ok := photoMap[tree.Persons[i].ID]; ok {
				tree.Persons[i].PhotoURL = &url
			}
		}
	}

	// Relationships between descendants
	relRows, err := database.DB.Query(ctx, `
		SELECT person1_id, person2_id, relation_type FROM relationships
		WHERE person1_id = ANY($1) AND person2_id = ANY($1)
	`, personIDs)
	if err != nil {
		return nil, err
	}
	defer relRows.Close()

	spouseSet := make(map[string]bool)
	pcSet := make(map[string]bool)
	for relRows.Next() {
		var p1, p2, t string
		if err := relRows.Scan(&p1, &p2, &t); err != nil {
			return nil, err
		}
		switch t {
		case "parent":
			key := p1 + ":" + p2
			if !pcSet[key] {
				pcSet[key] = true
				tree.ParentChild = append(tree.ParentChild, models.ParentChildRelation{ParentID: p1, ChildID: p2})
			}
		case "spouse":
			k1 := p1 + ":" + p2
			k2 := p2 + ":" + p1
			if !spouseSet[k1] && !spouseSet[k2] {
				spouseSet[k1] = true
				tree.Spouses = append(tree.Spouses, models.SpouseRelation{Person1ID: p1, Person2ID: p2})
			}
		}
	}

	return tree, nil
}

// LineagePerson is one step in a lineage path.
type LineagePerson struct {
	Level  int                  `json:"level"`
	Person models.GenealogyPerson `json:"person"`
}

// GetLineage returns all ancestors with their generation distance from the focus person.
// Level 0 = self, 1 = parents, 2 = grandparents, etc.
func (s *GenealogyTreeService) GetLineage(ctx context.Context, personID string) ([]LineagePerson, error) {
	rows, err := database.DB.Query(ctx, `
		WITH RECURSIVE lineage AS (
			SELECT p.id, p.first_name, p.last_name, p.gender,
				TO_CHAR(p.birth_date, 'YYYY-MM-DD') AS birth_date,
				TO_CHAR(p.death_date, 'YYYY-MM-DD') AS death_date,
				0 AS level
			FROM persons p WHERE p.id = $1

			UNION

			SELECT p.id, p.first_name, p.last_name, p.gender,
				TO_CHAR(p.birth_date, 'YYYY-MM-DD'),
				TO_CHAR(p.death_date, 'YYYY-MM-DD'),
				l.level + 1
			FROM lineage l
			JOIN relationships r ON (r.person2_id = l.id AND r.relation_type = 'parent')
			JOIN persons p ON p.id = r.person1_id
			WHERE l.level < 20
		)
		SELECT DISTINCT ON (id) id, first_name, last_name, gender, birth_date, death_date, level
		FROM lineage
		ORDER BY id, level
	`, personID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var lineage []LineagePerson
	for rows.Next() {
		var gp models.GenealogyPerson
		var level int
		if err := rows.Scan(&gp.ID, &gp.FirstName, &gp.LastName, &gp.Gender, &gp.BirthDate, &gp.DeathDate, &level); err != nil {
			return nil, err
		}
		lineage = append(lineage, LineagePerson{Level: level, Person: gp})
	}
	return lineage, nil
}

func (s *GenealogyTreeService) GetDirectChildren(ctx context.Context, personID string) ([]models.GenealogyPerson, error) {
	rows, err := database.DB.Query(ctx, `
		SELECT DISTINCT p.id, p.first_name, p.last_name, p.gender,
			TO_CHAR(p.birth_date, 'YYYY-MM-DD'),
			TO_CHAR(p.death_date, 'YYYY-MM-DD'),
			(SELECT ph.url FROM photos ph WHERE ph.person_id = p.id ORDER BY ph.uploaded_at LIMIT 1)
		FROM relationships r
		JOIN persons p ON (r.person1_id = $1 AND r.relation_type = 'parent' AND p.id = r.person2_id)
	`, personID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var children []models.GenealogyPerson
	for rows.Next() {
		var gp models.GenealogyPerson
		if err := rows.Scan(&gp.ID, &gp.FirstName, &gp.LastName, &gp.Gender, &gp.BirthDate, &gp.DeathDate, &gp.PhotoURL); err != nil {
			return nil, err
		}
		children = append(children, gp)
	}
	return children, nil
}
