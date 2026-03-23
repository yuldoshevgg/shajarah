// Package services — kinship resolver
//
// Algorithm: BFS from root person through the family graph.
// Each edge is encoded as a single character in a "path string":
//
//   P = moved to a parent  (up one generation)
//   C = moved to a child   (down one generation)
//   S = moved to a spouse
//
// When the target is reached, pathToTitle(path, gender) maps the
// path string to a human-readable, gender-aware relationship title.
//
// Graph edges per node X are loaded from the relationships table:
//   relation_type='parent'  (person1=parent, person2=child) → P/C edges
//   relation_type='spouse'  (symmetric)                     → S edges

package services

import (
	"context"
	"fmt"
	"strings"

	"shajarah-backend/internal/database"
)

// ── Data structures ──────────────────────────────────────────────────────────

type KinshipNode struct {
	ID       string
	Gender   string   // "male" | "female" | ""
	Parents  []string // IDs of this person's parents (from relationships)
	Spouses  []string // IDs of this person's spouses (from relationships, symmetric)
	Children []string // populated after building the graph
}

type KinshipGraph struct {
	nodes map[string]*KinshipNode
}

// ── Service ──────────────────────────────────────────────────────────────────

type KinshipService struct{}

func NewKinshipService() *KinshipService { return &KinshipService{} }

// GetRelationship returns the relationship title of targetID as seen from rootID.
// e.g. GetRelationship(ctx, meID, uncleID) → "Uncle"
func (s *KinshipService) GetRelationship(ctx context.Context, rootID, targetID string) (string, error) {
	if rootID == targetID {
		return "Yourself", nil
	}

	// 1. Load the family graph for rootID's family
	g, err := s.loadGraph(ctx, rootID)
	if err != nil {
		return "", err
	}

	root, ok := g.nodes[rootID]
	if !ok {
		return "Unknown", nil
	}
	target, ok := g.nodes[targetID]
	if !ok {
		return "Unknown", nil
	}

	// 2. BFS
	path := bfs(g, root.ID, target.ID)
	if path == "" {
		return "Relative", nil
	}

	// 3. Map path + gender to title
	return pathToTitle(path, target.Gender), nil
}

// GetRelationshipMap returns a map of personID → relationship title for every
// other person in the same family, computed from rootID's point of view.
func (s *KinshipService) GetRelationshipMap(ctx context.Context, rootID string) (map[string]string, error) {
	g, err := s.loadGraph(ctx, rootID)
	if err != nil {
		return nil, err
	}

	result := make(map[string]string, len(g.nodes))
	for id, node := range g.nodes {
		if id == rootID {
			result[id] = "You"
			continue
		}
		path := bfs(g, rootID, id)
		if path == "" {
			result[id] = "Relative"
		} else {
			result[id] = pathToTitle(path, node.Gender)
		}
	}
	return result, nil
}

// ── Graph loader ─────────────────────────────────────────────────────────────

func (s *KinshipService) loadGraph(ctx context.Context, personID string) (*KinshipGraph, error) {
	// Get family_id for this person
	var familyID string
	err := database.DB.QueryRow(ctx,
		`SELECT COALESCE(family_id::text, '') FROM persons WHERE id = $1`, personID,
	).Scan(&familyID)
	if err != nil {
		return nil, fmt.Errorf("person not found: %w", err)
	}

	g := &KinshipGraph{nodes: make(map[string]*KinshipNode)}

	if familyID == "" {
		g.nodes[personID] = &KinshipNode{ID: personID}
		return g, nil
	}

	// Load all persons in the family
	rows, err := database.DB.Query(ctx,
		`SELECT id, COALESCE(gender, '') FROM persons WHERE family_id = $1`, familyID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		n := &KinshipNode{}
		if err := rows.Scan(&n.ID, &n.Gender); err != nil {
			return nil, err
		}
		g.nodes[n.ID] = n
	}

	// Load relationships and build adjacency
	relRows, err := database.DB.Query(ctx, `
		SELECT r.person1_id, r.person2_id, r.relation_type
		FROM relationships r
		WHERE r.person1_id IN (SELECT id FROM persons WHERE family_id = $1)
		   OR r.person2_id IN (SELECT id FROM persons WHERE family_id = $1)
	`, familyID)
	if err != nil {
		return nil, err
	}
	defer relRows.Close()

	for relRows.Next() {
		var p1, p2, rt string
		if err := relRows.Scan(&p1, &p2, &rt); err != nil {
			return nil, err
		}
		switch rt {
		case "parent":
			// p1 is parent of p2
			if child, ok := g.nodes[p2]; ok {
				child.Parents = append(child.Parents, p1)
			}
			if parent, ok := g.nodes[p1]; ok {
				parent.Children = append(parent.Children, p2)
			}
		case "spouse":
			// symmetric
			if n, ok := g.nodes[p1]; ok {
				n.Spouses = append(n.Spouses, p2)
			}
			if n, ok := g.nodes[p2]; ok {
				n.Spouses = append(n.Spouses, p1)
			}
		}
	}

	return g, nil
}

// ── BFS traversal ─────────────────────────────────────────────────────────────

type bfsState struct {
	id   string
	path string
}

func bfs(g *KinshipGraph, rootID, targetID string) string {
	visited := map[string]bool{rootID: true}
	queue := []bfsState{{rootID, ""}}

	for len(queue) > 0 {
		cur := queue[0]
		queue = queue[1:]

		node := g.nodes[cur.id]
		if node == nil {
			continue
		}

		// Guard: stop going deeper than 8 hops to avoid runaway on large trees
		if len(cur.path) >= 8 {
			continue
		}

		// Neighbours and their step characters
		type neighbour struct {
			id   string
			step byte
		}
		var neighbours []neighbour

		// Up: parents
		for _, pid := range node.Parents {
			neighbours = append(neighbours, neighbour{pid, 'P'})
		}
		// Down: children
		for _, cid := range node.Children {
			neighbours = append(neighbours, neighbour{cid, 'C'})
		}
		// Lateral: spouses
		for _, sid := range node.Spouses {
			neighbours = append(neighbours, neighbour{sid, 'S'})
		}

		for _, nb := range neighbours {
			if visited[nb.id] {
				continue
			}
			newPath := cur.path + string(nb.step)
			if nb.id == targetID {
				return newPath
			}
			visited[nb.id] = true
			queue = append(queue, bfsState{nb.id, newPath})
		}
	}

	return "" // not found / disconnected
}

// ── Path → Title mapping ──────────────────────────────────────────────────────

func pathToTitle(path, gender string) string {
	male := strings.ToLower(gender) == "male"

	// ── Direct lookup table (covers most common relationships) ────────────────

	lookup := map[string][2]string{ // [male, female]
		// 1st degree
		"P":  {"Father", "Mother"},
		"C":  {"Son", "Daughter"},
		"S":  {"Husband", "Wife"},
		// 2nd degree
		"PP":  {"Grandfather", "Grandmother"},
		"CC":  {"Grandson", "Granddaughter"},
		"PC":  {"Brother", "Sister"},
		"SP":  {"Father-in-Law", "Mother-in-Law"},
		"SC":  {"Step-Son", "Step-Daughter"},
		"CS":  {"Son-in-Law", "Daughter-in-Law"},
		"PS":  {"Step-Father", "Step-Mother"},
		// 3rd degree
		"PPP":  {"Great-Grandfather", "Great-Grandmother"},
		"CCC":  {"Great-Grandson", "Great-Granddaughter"},
		"PPC":  {"Uncle", "Aunt"},
		"PCC":  {"Nephew", "Niece"},
		"SPC":  {"Brother-in-Law", "Sister-in-Law"}, // spouse's sibling
		"PCS":  {"Brother-in-Law", "Sister-in-Law"}, // sibling's spouse
		"CSP":  {"Brother-in-Law", "Sister-in-Law"},
		"SSP":  {"Father-in-Law", "Mother-in-Law"},  // spouse's step-parent
		// 4th degree
		"PPPP":  {"Great-Great-Grandfather", "Great-Great-Grandmother"},
		"CCCC":  {"Great-Great-Grandson", "Great-Great-Granddaughter"},
		"PPPC":  {"Great-Uncle", "Great-Aunt"},
		"PPCC":  {"Cousin", "Cousin"},
		"PCCC":  {"Grand-Nephew", "Grand-Niece"},
		"SPCC":  {"Step-Nephew", "Step-Niece"},
		// 5th degree
		"PPPCC": {"First Cousin Once Removed", "First Cousin Once Removed"},
		"PPCCC": {"First Cousin Once Removed", "First Cousin Once Removed"},
		"PPPPC": {"Great-Great-Uncle", "Great-Great-Aunt"},
		// 6th degree
		"PPPPCC": {"Second Cousin", "Second Cousin"},
		"PPPCCC": {"Second Cousin Once Removed", "Second Cousin Once Removed"},
	}

	if titles, ok := lookup[path]; ok {
		if male {
			return titles[0]
		}
		return titles[1]
	}

	// ── Algorithmic fallback for deeper / unlisted paths ──────────────────────
	return computeGenerational(path, male)
}

// computeGenerational handles paths of the form P*C* (pure lineal or collateral)
// and falls back to "Relative" for mixed/in-law paths beyond the lookup table.
func computeGenerational(path string, male bool) string {
	// Count leading P's and trailing C's
	ups := 0
	for ups < len(path) && path[ups] == 'P' {
		ups++
	}
	downs := 0
	for i := len(path) - 1; i >= 0 && path[i] == 'C'; i-- {
		downs++
	}

	// Pure upward (lineal ancestor)
	if ups == len(path) {
		return ancestorTitle(ups, male)
	}

	// Pure downward (lineal descendant)
	if downs == len(path) {
		return descendantTitle(downs, male)
	}

	// Collateral: P*C* pattern
	if ups+downs == len(path) {
		return collateralTitle(ups, downs, male)
	}

	// Anything else (in-law chains, mixed) — generic fallback
	return "Relative"
}

func ancestorTitle(gens int, male bool) string {
	switch gens {
	case 1:
		return pick(male, "Father", "Mother")
	case 2:
		return pick(male, "Grandfather", "Grandmother")
	}
	prefix := strings.Repeat("Great-", gens-2)
	return prefix + pick(male, "Grandfather", "Grandmother")
}

func descendantTitle(gens int, male bool) string {
	switch gens {
	case 1:
		return pick(male, "Son", "Daughter")
	case 2:
		return pick(male, "Grandson", "Granddaughter")
	}
	prefix := strings.Repeat("Great-", gens-2)
	return prefix + pick(male, "Grandson", "Granddaughter")
}

// collateralTitle handles P^u C^d paths (sibling, uncle, cousin, etc.)
func collateralTitle(ups, downs int, male bool) string {
	switch {
	// Sibling
	case ups == 1 && downs == 1:
		return pick(male, "Brother", "Sister")

	// Uncle / Aunt
	case ups == 2 && downs == 1:
		return pick(male, "Uncle", "Aunt")

	// Nephew / Niece
	case ups == 1 && downs == 2:
		return pick(male, "Nephew", "Niece")

	// Cousin (1st)
	case ups == 2 && downs == 2:
		return "Cousin"

	// Great-Uncle / Great-Aunt
	case ups == 3 && downs == 1:
		return pick(male, "Great-Uncle", "Great-Aunt")

	// Grand-Nephew / Grand-Niece
	case ups == 1 && downs == 3:
		return pick(male, "Grand-Nephew", "Grand-Niece")

	// 1st Cousin Once Removed
	case (ups == 2 && downs == 3) || (ups == 3 && downs == 2):
		return "1st Cousin Once Removed"

	// 2nd Cousin
	case ups == 3 && downs == 3:
		return "2nd Cousin"

	// 2nd Cousin Once Removed
	case (ups == 3 && downs == 4) || (ups == 4 && downs == 3):
		return "2nd Cousin Once Removed"

	// 3rd Cousin
	case ups == 4 && downs == 4:
		return "3rd Cousin"
	}

	// General formula: nth cousin, mth removed
	minDepth := min(ups, downs) - 1 // cousin degree (1st, 2nd, …)
	removed := abs(ups - downs)      // times removed

	degree := ordinal(minDepth)
	if removed == 0 {
		return fmt.Sprintf("%s Cousin", degree)
	}
	return fmt.Sprintf("%s Cousin %dx Removed", degree, removed)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func pick(male bool, m, f string) string {
	if male {
		return m
	}
	return f
}

func ordinal(n int) string {
	switch n {
	case 1:
		return "1st"
	case 2:
		return "2nd"
	case 3:
		return "3rd"
	}
	return fmt.Sprintf("%dth", n)
}

func abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
