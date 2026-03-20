package models

type TreeNode struct {
	ID       string `json:"id"`
	Label    string `json:"label"`
	Gender   string `json:"gender"`
	LastName string `json:"last_name"`
}

type TreeEdge struct {
	Source string `json:"source"`
	Target string `json:"target"`
	Type   string `json:"type"`
}

type FamilyTree struct {
	Nodes []TreeNode `json:"nodes"`
	Edges []TreeEdge `json:"edges"`
}
