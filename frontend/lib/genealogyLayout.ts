// Custom genealogy layout engine
// Produces a BT (bottom-up) layout: oldest generation at bottom, youngest at top.
// Spouses are placed adjacent within the same generation row.

export const PERSON_NODE_WIDTH = 180
export const PERSON_NODE_HEIGHT = 84
const H_GAP = 48
const V_GAP = 100

interface LayoutPerson {
    id: string
}

interface ParentChild {
    parentId: string
    childId: string
}

interface Spouse {
    person1Id: string
    person2Id: string
}

export function computeGenealogyLayout(
    persons: LayoutPerson[],
    parentChild: ParentChild[],
    spouses: Spouse[],
): Map<string, { x: number; y: number }> {
    if (persons.length === 0) return new Map()

    const childrenOf = new Map<string, string[]>()
    const parentsOf = new Map<string, string[]>()
    const spouseOf = new Map<string, string[]>()

    for (const p of persons) {
        childrenOf.set(p.id, [])
        parentsOf.set(p.id, [])
        spouseOf.set(p.id, [])
    }

    for (const { parentId, childId } of parentChild) {
        childrenOf.get(parentId)?.push(childId)
        parentsOf.get(childId)?.push(parentId)
    }

    for (const { person1Id, person2Id } of spouses) {
        spouseOf.get(person1Id)?.push(person2Id)
        spouseOf.get(person2Id)?.push(person1Id)
    }

    // BFS generation assignment — roots (no parents) start at 0
    const generation = new Map<string, number>()
    const roots = persons.filter(p => (parentsOf.get(p.id) ?? []).length === 0)
    const startNodes = roots.length > 0 ? roots : [persons[0]]

    const queue: string[] = []
    for (const p of startNodes) {
        generation.set(p.id, 0)
        queue.push(p.id)
    }

    let head = 0
    while (head < queue.length) {
        const id = queue[head++]
        const gen = generation.get(id)!

        // Spouses share the same generation
        for (const sid of spouseOf.get(id) ?? []) {
            if (!generation.has(sid)) {
                generation.set(sid, gen)
                queue.push(sid)
            }
        }

        // Children are one generation lower (younger)
        for (const cid of childrenOf.get(id) ?? []) {
            if (!generation.has(cid)) {
                generation.set(cid, gen + 1)
                queue.push(cid)
            }
        }
    }

    // Assign disconnected persons to generation 0
    for (const p of persons) {
        if (!generation.has(p.id)) generation.set(p.id, 0)
    }

    // Group by generation
    const genMap = new Map<number, string[]>()
    for (const [id, gen] of generation) {
        if (!genMap.has(gen)) genMap.set(gen, [])
        genMap.get(gen)!.push(id)
    }

    // Sort each generation so spouses are adjacent
    for (const [gen, group] of genMap) {
        const sorted: string[] = []
        const seen = new Set<string>()
        for (const id of group) {
            if (seen.has(id)) continue
            seen.add(id)
            sorted.push(id)
            for (const sid of spouseOf.get(id) ?? []) {
                if (!seen.has(sid) && group.includes(sid)) {
                    seen.add(sid)
                    sorted.push(sid)
                }
            }
        }
        genMap.set(gen, sorted)
    }

    const maxGen = Math.max(...genMap.keys())
    const positions = new Map<string, { x: number; y: number }>()

    for (const [gen, group] of genMap) {
        const totalWidth = group.length * (PERSON_NODE_WIDTH + H_GAP) - H_GAP
        const startX = -totalWidth / 2
        // BT: generation 0 (oldest/roots) at bottom (large Y), higher generations go up (smaller Y)
        const y = (maxGen - gen) * (PERSON_NODE_HEIGHT + V_GAP)

        for (let i = 0; i < group.length; i++) {
            positions.set(group[i], {
                x: startX + i * (PERSON_NODE_WIDTH + H_GAP),
                y,
            })
        }
    }

    return positions
}
