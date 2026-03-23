package services

import (
	"context"
	"strings"

	"shajarah-backend/internal/database"
)

type InferredRelative struct {
	PersonID   string `json:"person_id"`
	FirstName  string `json:"first_name"`
	LastName   string `json:"last_name"`
	Gender     string `json:"gender"`
	Relation   string `json:"relation"`
}

type InferenceService struct{}

func NewInferenceService() *InferenceService {
	return &InferenceService{}
}

type relEdge struct {
	from     string
	to       string
	relType  string
}

func (s *InferenceService) GetInferredRelatives(ctx context.Context, personID string) ([]InferredRelative, error) {
	familyID, err := s.getFamilyID(ctx, personID)
	if err != nil {
		return nil, err
	}

	persons, err := s.loadPersons(ctx, familyID)
	if err != nil {
		return nil, err
	}

	edges, err := s.loadEdges(ctx, familyID)
	if err != nil {
		return nil, err
	}

	adj := map[string][]relEdge{}
	for _, e := range edges {
		adj[e.from] = append(adj[e.from], e)
		if e.relType == "spouse" || e.relType == "sibling" {
			adj[e.to] = append(adj[e.to], relEdge{e.to, e.from, e.relType})
		}
		if e.relType == "parent" {
			adj[e.to] = append(adj[e.to], relEdge{e.to, e.from, "child"})
		}
	}

	directRels := map[string]bool{}
	for _, e := range adj[personID] {
		directRels[e.to] = true
	}
	directRels[personID] = true

	results := []InferredRelative{}
	seen := map[string]string{}

	rules := []struct {
		hop1 string
		hop2 string
		label string
	}{
		{"parent", "parent", "grandparent"},
		{"child", "child", "grandchild"},
		{"parent", "sibling", "uncle/aunt"},
		{"sibling", "child", "nephew/niece"},
		{"parent", "spouse", "stepparent"},
		{"spouse", "parent", "parent-in-law"},
		{"spouse", "sibling", "sibling-in-law"},
		{"child", "spouse", "child-in-law"},
	}

	for _, r := range rules {
		for _, e1 := range adj[personID] {
			if e1.relType != r.hop1 {
				continue
			}
			for _, e2 := range adj[e1.to] {
				if e2.relType != r.hop2 {
					continue
				}
				if directRels[e2.to] {
					continue
				}
				if _, already := seen[e2.to]; already {
					continue
				}
				p, ok := persons[e2.to]
				if !ok {
					continue
				}
				seen[e2.to] = r.label
				results = append(results, InferredRelative{
					PersonID:  e2.to,
					FirstName: p[0],
					LastName:  p[1],
					Gender:    p[2],
					Relation:  r.label,
				})
			}
		}
	}

	return results, nil
}

func (s *InferenceService) getFamilyID(ctx context.Context, personID string) (string, error) {
	var fid string
	err := database.DB.QueryRow(ctx, `SELECT family_id FROM persons WHERE id = $1`, personID).Scan(&fid)
	return fid, err
}

func (s *InferenceService) loadPersons(ctx context.Context, familyID string) (map[string][3]string, error) {
	rows, err := database.DB.Query(ctx,
		`SELECT id, first_name, last_name, gender FROM persons WHERE family_id = $1`, familyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	m := map[string][3]string{}
	for rows.Next() {
		var id, fn, ln, g string
		if err := rows.Scan(&id, &fn, &ln, &g); err != nil {
			return nil, err
		}
		m[id] = [3]string{fn, ln, g}
	}
	return m, nil
}

func (s *InferenceService) FindRelationship(ctx context.Context, fromID, toID string) (string, error) {
	if fromID == toID {
		return "Same Person", nil
	}

	familyID, err := s.getFamilyID(ctx, fromID)
	if err != nil {
		return "", err
	}

	edges, err := s.loadEdges(ctx, familyID)
	if err != nil {
		return "", err
	}

	type step struct {
		to  string
		rel string
	}
	adj := map[string][]step{}
	for _, e := range edges {
		adj[e.from] = append(adj[e.from], step{e.to, e.relType})
		switch e.relType {
		case "parent":
			adj[e.to] = append(adj[e.to], step{e.from, "child"})
		case "sibling", "spouse":
			adj[e.to] = append(adj[e.to], step{e.from, e.relType})
		}
	}

	type state struct {
		id   string
		path []string
	}

	visited := map[string]bool{fromID: true}
	queue := []state{{fromID, nil}}

	for len(queue) > 0 {
		cur := queue[0]
		queue = queue[1:]
		if len(cur.path) >= 5 {
			continue
		}
		for _, s := range adj[cur.id] {
			if visited[s.to] {
				continue
			}
			newPath := append(append([]string{}, cur.path...), s.rel)
			if s.to == toID {
				return pathToLabel(newPath), nil
			}
			visited[s.to] = true
			queue = append(queue, state{s.to, newPath})
		}
	}

	return "Distant Relative", nil
}

func pathToLabel(path []string) string {
	labels := map[string]string{
		"parent":                     "Parent",
		"child":                      "Child",
		"sibling":                    "Sibling",
		"spouse":                     "Spouse",
		"parent-parent":              "Grandparent",
		"child-child":                "Grandchild",
		"parent-sibling":             "Uncle/Aunt",
		"sibling-child":              "Nephew/Niece",
		"parent-parent-parent":       "Great-Grandparent",
		"child-child-child":          "Great-Grandchild",
		"parent-sibling-child":       "Cousin",
		"child-spouse":               "Child-in-Law",
		"spouse-parent":              "Parent-in-Law",
		"spouse-sibling":             "Sibling-in-Law",
		"parent-spouse":              "Step-Parent",
		"sibling-spouse":             "Sibling-in-Law",
		"parent-parent-sibling":      "Great-Uncle/Aunt",
		"parent-sibling-child-child": "Second Cousin",
	}
	if l, ok := labels[strings.Join(path, "-")]; ok {
		return l
	}
	return "Relative"
}

func (s *InferenceService) loadEdges(ctx context.Context, familyID string) ([]relEdge, error) {
	rows, err := database.DB.Query(ctx, `
		SELECT r.person1_id, r.person2_id, r.relation_type
		FROM relationships r
		JOIN persons p ON p.id = r.person1_id
		WHERE p.family_id = $1
	`, familyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var edges []relEdge
	for rows.Next() {
		var e relEdge
		if err := rows.Scan(&e.from, &e.to, &e.relType); err != nil {
			return nil, err
		}
		edges = append(edges, e)
	}
	return edges, nil
}
