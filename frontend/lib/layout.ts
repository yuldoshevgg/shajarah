import dagre from "dagre"
import { Node, Edge } from "reactflow"

export const NODE_WIDTH = 160
export const NODE_HEIGHT = 50

export function applyDagreLayout(nodes: Node[], edges: Edge[], direction: "TB" | "BT" | "LR" = "BT"): Node[] {
    const g = new dagre.graphlib.Graph()
    g.setDefaultEdgeLabel(() => ({}))
    g.setGraph({ rankdir: direction, ranksep: 80, nodesep: 60 })

    nodes.forEach(node => g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT }))
    edges.forEach(edge => g.setEdge(edge.source, edge.target))

    dagre.layout(g)

    return nodes.map(node => {
        const { x, y } = g.node(node.id)
        return {
            ...node,
            position: {
                x: x - NODE_WIDTH / 2,
                y: y - NODE_HEIGHT / 2,
            },
        }
    })
}
