package services

import (
	"context"
	"sync"
	"time"

	"shajarah-backend/internal/database"
	"shajarah-backend/internal/models"
)

type treeCache struct {
	data      *models.FamilyTree
	expiresAt time.Time
}

type FamilyTreeService struct {
	mu    sync.Mutex
	cache map[string]treeCache
}

func NewFamilyTreeService() *FamilyTreeService {
	return &FamilyTreeService{cache: map[string]treeCache{}}
}

func (s *FamilyTreeService) InvalidateCache(familyID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.cache, familyID)
}

func (s *FamilyTreeService) GetFamilyTree(ctx context.Context, familyID string) (*models.FamilyTree, error) {
	s.mu.Lock()
	if entry, ok := s.cache[familyID]; ok && time.Now().Before(entry.expiresAt) {
		s.mu.Unlock()
		return entry.data, nil
	}
	s.mu.Unlock()

	tree := models.FamilyTree{}

	rows, err := database.DB.Query(ctx, `
		SELECT id, first_name, last_name, gender
		FROM persons
		WHERE family_id = $1
	`, familyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var id, firstName, lastName, gender string
		if err := rows.Scan(&id, &firstName, &lastName, &gender); err != nil {
			return nil, err
		}
		label := firstName
		if lastName != "" {
			label = firstName + " " + lastName
		}
		tree.Nodes = append(tree.Nodes, models.TreeNode{
			ID:       id,
			Label:    label,
			Gender:   gender,
			LastName: lastName,
		})
	}

	rows2, err := database.DB.Query(ctx, `
		SELECT r.person1_id, r.person2_id, r.relation_type
		FROM relationships r
		JOIN persons p ON p.id = r.person1_id
		WHERE p.family_id = $1
	`, familyID)
	if err != nil {
		return nil, err
	}
	defer rows2.Close()

	for rows2.Next() {
		var p1, p2, t string
		if err := rows2.Scan(&p1, &p2, &t); err != nil {
			return nil, err
		}
		tree.Edges = append(tree.Edges, models.TreeEdge{
			Source: p1,
			Target: p2,
			Type:   t,
		})
	}

	s.mu.Lock()
	s.cache[familyID] = treeCache{data: &tree, expiresAt: time.Now().Add(5 * time.Minute)}
	s.mu.Unlock()

	return &tree, nil
}
