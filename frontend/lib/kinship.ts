// Computes kinship labels for each person in the tree relative to `selfId`.
// Returns a Map<personId, label> e.g. "Father", "Grandmother", "Me", etc.

export function computeKinship(
    persons: { id: string; gender: string }[],
    parentChild: { parentId: string; childId: string }[],
    spouses: { person1Id: string; person2Id: string }[],
    selfId: string | null,
): Map<string, string> {
    const result = new Map<string, string>()
    if (!selfId) return result

    const ids = new Set(persons.map(p => p.id))
    const genderOf = new Map(persons.map(p => [p.id, p.gender]))

    // Build adjacency
    const parentsOf = new Map<string, string[]>()
    const childrenOf = new Map<string, string[]>()
    const spouseOf = new Map<string, string>()

    for (const id of ids) {
        parentsOf.set(id, [])
        childrenOf.set(id, [])
    }
    for (const { parentId, childId } of parentChild) {
        if (ids.has(parentId) && ids.has(childId)) {
            parentsOf.get(childId)!.push(parentId)
            childrenOf.get(parentId)!.push(childId)
        }
    }
    for (const { person1Id: a, person2Id: b } of spouses) {
        if (ids.has(a) && ids.has(b)) {
            if (!spouseOf.has(a)) spouseOf.set(a, b)
            if (!spouseOf.has(b)) spouseOf.set(b, a)
        }
    }

    // BFS to find path from self to each person
    // State: { id, upCount, downCount, throughSpouse }
    // We encode the direction as: up moves = # generations above self, down moves = # generations below self
    // We track "sibling" via up→down transitions

    type State = {
        id: string
        up: number   // generations above self
        down: number // generations below self
        lateral: boolean // went through a spouse/sibling hop
    }

    const visited = new Map<string, State>()
    const queue: State[] = [{ id: selfId, up: 0, down: 0, lateral: false }]
    visited.set(selfId, queue[0])

    while (queue.length > 0) {
        const cur = queue.shift()!

        // Go up (to parents)
        for (const pid of parentsOf.get(cur.id) ?? []) {
            if (!visited.has(pid)) {
                const next: State = { id: pid, up: cur.up + 1, down: cur.down, lateral: cur.lateral }
                visited.set(pid, next)
                queue.push(next)
            }
        }

        // Go down (to children)
        for (const cid of childrenOf.get(cur.id) ?? []) {
            if (!visited.has(cid)) {
                const next: State = { id: cid, up: cur.up, down: cur.down + 1, lateral: cur.lateral }
                visited.set(cid, next)
                queue.push(next)
            }
        }

        // Go lateral (to spouse)
        const spouse = spouseOf.get(cur.id)
        if (spouse && !visited.has(spouse)) {
            const next: State = { id: spouse, up: cur.up, down: cur.down, lateral: true }
            visited.set(spouse, next)
            queue.push(next)
        }
    }

    for (const [id, state] of visited) {
        const isFemale = genderOf.get(id) === "female"
        const { up, down, lateral } = state

        let label: string

        if (up === 0 && down === 0 && !lateral) {
            label = "Me"
        } else if (up === 0 && down === 0 && lateral) {
            // Spouse
            label = isFemale ? "Wife" : "Husband"
        } else if (up === 1 && down === 0 && !lateral) {
            label = isFemale ? "Mother" : "Father"
        } else if (up === 2 && down === 0 && !lateral) {
            label = isFemale ? "Grandmother" : "Grandfather"
        } else if (up === 3 && down === 0 && !lateral) {
            label = isFemale ? "Great-grandmother" : "Great-grandfather"
        } else if (up === 0 && down === 1 && !lateral) {
            label = isFemale ? "Daughter" : "Son"
        } else if (up === 0 && down === 2 && !lateral) {
            label = isFemale ? "Granddaughter" : "Grandson"
        } else if (up === 1 && down === 1) {
            // parent's child = sibling
            label = isFemale ? "Sister" : "Brother"
        } else if (up === 2 && down === 1) {
            label = isFemale ? "Aunt" : "Uncle"
        } else if (up === 1 && down === 2) {
            label = isFemale ? "Niece" : "Nephew"
        } else if (up === 1 && down === 0 && lateral) {
            // parent's spouse (step-parent)
            label = isFemale ? "Step-mother" : "Step-father"
        } else {
            // fallback
            label = isFemale ? "Female Relative" : "Male Relative"
        }

        result.set(id, label)
    }

    return result
}
