// Proper top-down family tree layout engine.
// Couple units (father + mother) are placed side-by-side.
// Children are centered under their parents.
// Generation 0 = oldest ancestors at top; each generation below adds V_GAP.

export const NODE_W = 130
export const NODE_H = 150
export const H_GAP = 48       // horizontal gap between sibling subtrees
export const V_GAP = 100      // vertical gap between generations
export const SPOUSE_GAP = 56  // gap between a couple's two cards (space for connector label)

export interface LayoutNode {
    id: string
    x: number  // left edge
    y: number  // top edge
}

export interface SpouseLine {
    id: string
    x1: number; y1: number
    x2: number; y2: number
}

export interface ChildGroup {
    id: string
    parentMidX: number
    parentBottomY: number
    connY: number       // y of horizontal connector bar
    childTopY: number   // y of child card tops
    childCenters: Array<{ id: string; cx: number }>
}

export interface SiblingLine {
    id: string
    x1: number; y1: number
    x2: number; y2: number
}

export interface LayoutResult {
    nodes: LayoutNode[]
    spouseLines: SpouseLine[]
    siblingLines: SiblingLine[]
    childGroups: ChildGroup[]
    width: number
    height: number
}

interface Unit {
    primary: string
    secondary?: string
    childIds: string[]
    gen: number
}

export function computeTreeLayout(
    persons: { id: string; gender?: string }[],
    parentChild: { parentId: string; childId: string }[],
    spouses: { person1Id: string; person2Id: string }[],
    siblings: { person1Id: string; person2Id: string }[] = [],
): LayoutResult {
    if (persons.length === 0) {
        return { nodes: [], spouseLines: [], siblingLines: [], childGroups: [], width: 0, height: 0 }
    }

    const ids = new Set(persons.map(p => p.id))
    const genderOf = new Map(persons.map(p => [p.id, p.gender ?? ""]))

    // --- Build relationship maps ---
    const parentsOf = new Map<string, string[]>()
    const childrenOf = new Map<string, string[]>()
    const spouseOf = new Map<string, string>()

    for (const id of ids) {
        parentsOf.set(id, [])
        childrenOf.set(id, [])
    }
    for (const { parentId, childId } of parentChild) {
        if (!ids.has(parentId) || !ids.has(childId)) continue
        parentsOf.get(childId)!.push(parentId)
        childrenOf.get(parentId)!.push(childId)
    }
    for (const { person1Id: a, person2Id: b } of spouses) {
        if (ids.has(a) && ids.has(b)) {
            if (!spouseOf.has(a)) spouseOf.set(a, b)
            if (!spouseOf.has(b)) spouseOf.set(b, a)
        }
    }

    // --- BFS generation assignment from roots (no parents) ---
    const genOf = new Map<string, number>()
    const roots = [...ids].filter(id => (parentsOf.get(id)?.length ?? 0) === 0)
    const bfsQ: Array<[string, number]> = roots.map(id => [id, 0])
    while (bfsQ.length > 0) {
        const [id, g] = bfsQ.shift()!
        if ((genOf.get(id) ?? -1) >= g) continue
        genOf.set(id, g)
        const spouse = spouseOf.get(id)
        if (spouse && !genOf.has(spouse)) bfsQ.push([spouse, g])
        for (const child of childrenOf.get(id) ?? []) bfsQ.push([child, g + 1])
    }
    for (const id of ids) if (!genOf.has(id)) genOf.set(id, 0)

    // --- Backward gen constraint pass ---
    // Roots with no parents get gen=0 from BFS, but if their children are at gen=2
    // (because another parent has a grandparent), they should be pulled up to gen=1.
    // Repeat until stable (O(depth) iterations, bounded).
    {
        let changed = true
        while (changed) {
            changed = false
            for (const { parentId, childId } of parentChild) {
                if (!ids.has(parentId) || !ids.has(childId)) continue
                const expected = (genOf.get(childId) ?? 0) - 1
                if ((genOf.get(parentId) ?? 0) < expected) {
                    genOf.set(parentId, expected)
                    changed = true
                }
            }
            // Keep explicit spouses at the same generation
            for (const [a, b] of spouseOf) {
                const ga = genOf.get(a) ?? 0
                const gb = genOf.get(b) ?? 0
                const max = Math.max(ga, gb)
                if (ga < max) { genOf.set(a, max); changed = true }
                if (gb < max) { genOf.set(b, max); changed = true }
            }
        }
    }

    // --- Build couple units (each person belongs to exactly one unit) ---
    const units = new Map<string, Unit>()
    const personToUnit = new Map<string, string>()  // personId → unit primary id
    const processed = new Set<string>()

    for (const id of ids) {
        if (processed.has(id)) continue
        const spouse = spouseOf.get(id)
        let primary: string
        let secondary: string | undefined

        if (spouse && ids.has(spouse) && !processed.has(spouse)) {
            // Male on the left (primary), female on the right (secondary)
            const isMale   = genderOf.get(id)    !== "female"
            const spIsMale = genderOf.get(spouse) !== "female"
            primary   = isMale || (!isMale && !spIsMale) ? id : spouse
            secondary = isMale || (!isMale && !spIsMale) ? spouse : id
            processed.add(primary)
            processed.add(secondary)
        } else if (spouse && processed.has(spouse)) {
            continue  // already handled when spouse was processed
        } else {
            primary = id
            processed.add(id)
        }

        // Children = union of both persons' direct children
        const children = new Set<string>()
        for (const c of childrenOf.get(primary) ?? []) children.add(c)
        if (secondary) for (const c of childrenOf.get(secondary) ?? []) children.add(c)

        units.set(primary, { primary, secondary, childIds: [...children], gen: genOf.get(primary) ?? 0 })
        personToUnit.set(primary, primary)
        if (secondary) personToUnit.set(secondary, primary)
    }

    // --- Sibling generation alignment ---
    // Siblings must share the same generation. If one has an inferred gen (from parents)
    // and the other is a disconnected root (gen=0 by default), pull the root up.
    for (const { person1Id: a, person2Id: b } of siblings) {
        if (!ids.has(a) || !ids.has(b)) continue
        const ga = genOf.get(a) ?? 0
        const gb = genOf.get(b) ?? 0
        const max = Math.max(ga, gb)
        genOf.set(a, max)
        genOf.set(b, max)
    }

    // --- Implicit couple detection: merge solo parent units that share a child ---
    // When father and mother are in the tree but not explicitly marked as spouses,
    // unify them into one couple unit so the child is positioned correctly.
    {
        const childToParentUnits = new Map<string, string[]>()
        for (const [uid, unit] of units) {
            for (const cid of unit.childIds) {
                if (!childToParentUnits.has(cid)) childToParentUnits.set(cid, [])
                childToParentUnits.get(cid)!.push(uid)
            }
        }
        const mergedSet = new Set<string>()
        for (const parentUids of childToParentUnits.values()) {
            const solos = parentUids.filter(uid => {
                const u = units.get(uid)
                return u && !u.secondary && !mergedSet.has(uid)
            })
            if (solos.length < 2) continue
            const [uid1, uid2] = solos
            // Male on the left (primary), female on the right (secondary)
            const uid1IsMale = genderOf.get(uid1) !== "female"
            const primary   = uid1IsMale ? uid1 : uid2
            const secondary = uid1IsMale ? uid2 : uid1
            const u1 = units.get(primary)!
            const u2 = units.get(secondary)!
            const merged: Unit = {
                primary,
                secondary,
                childIds: [...new Set([...u1.childIds, ...u2.childIds])],
                gen: Math.max(u1.gen, u2.gen),
            }
            units.set(primary, merged)
            units.delete(secondary)
            personToUnit.set(secondary, primary)
            mergedSet.add(primary)
            mergedSet.add(secondary)
            // Register as spouses so the ♥ connector line is drawn
            if (!spouseOf.has(primary))   spouseOf.set(primary, secondary)
            if (!spouseOf.has(secondary)) spouseOf.set(secondary, primary)
        }
    }

    // --- For each unit, resolve its direct child units ---
    const getChildUnits = (unitId: string): string[] => {
        const unit = units.get(unitId)!
        const seen = new Set<string>()
        const result: string[] = []
        for (const childId of unit.childIds) {
            const childUnitId = personToUnit.get(childId)
            if (childUnitId && !seen.has(childUnitId)) {
                seen.add(childUnitId)
                result.push(childUnitId)
            }
        }
        return result
    }

    // --- Compute subtree width (memoized) ---
    const widthCache = new Map<string, number>()
    const subtreeWidth = (unitId: string): number => {
        if (widthCache.has(unitId)) return widthCache.get(unitId)!
        const unit = units.get(unitId)!
        const ownW = unit.secondary ? NODE_W * 2 + SPOUSE_GAP : NODE_W
        const childUnits = getChildUnits(unitId)
        if (childUnits.length === 0) {
            widthCache.set(unitId, ownW)
            return ownW
        }
        const childSpan = childUnits.reduce((sum, cuid, i) =>
            sum + subtreeWidth(cuid) + (i > 0 ? H_GAP : 0), 0)
        const w = Math.max(ownW, childSpan)
        widthCache.set(unitId, w)
        return w
    }

    // --- Assign X positions top-down, centering each unit over its children ---
    const unitLeftEdge = new Map<string, number>()  // unit primary → left edge of bounding box

    const assignX = (unitId: string, left: number) => {
        const totalW = subtreeWidth(unitId)
        const center = left + totalW / 2
        const unit = units.get(unitId)!
        const unitW = unit.secondary ? NODE_W * 2 + SPOUSE_GAP : NODE_W
        unitLeftEdge.set(unitId, center - unitW / 2)

        const childUnits = getChildUnits(unitId)
        if (childUnits.length === 0) return
        const childSpan = childUnits.reduce((sum, cuid, i) =>
            sum + subtreeWidth(cuid) + (i > 0 ? H_GAP : 0), 0)
        let cx = center - childSpan / 2
        for (const cuid of childUnits) {
            assignX(cuid, cx)
            cx += subtreeWidth(cuid) + H_GAP
        }
    }

    // Root units = units that are not a child of any other unit
    const nonRootUnits = new Set<string>()
    for (const [, unit] of units) {
        for (const childId of unit.childIds) {
            const cu = personToUnit.get(childId)
            if (cu) nonRootUnits.add(cu)
        }
    }
    const rootUnits = [...units.keys()].filter(uid => !nonRootUnits.has(uid))

    let rootLeft = 0
    for (const uid of rootUnits) {
        assignX(uid, rootLeft)
        rootLeft += subtreeWidth(uid) + H_GAP
    }

    // --- Build final node positions ---
    const nodePos = new Map<string, LayoutNode>()
    for (const [unitId, unit] of units) {
        const left = unitLeftEdge.get(unitId) ?? 0
        const y = unit.gen * (NODE_H + V_GAP)
        nodePos.set(unit.primary, { id: unit.primary, x: left, y })
        if (unit.secondary) {
            nodePos.set(unit.secondary, { id: unit.secondary, x: left + NODE_W + SPOUSE_GAP, y })
        }
    }
    const nodes = [...nodePos.values()]

    // --- Spouse lines ---
    const spouseLines: SpouseLine[] = []
    const spouseSeen = new Set<string>()
    for (const [a, b] of spouseOf) {
        const key = [a, b].sort().join(":")
        if (spouseSeen.has(key)) continue
        spouseSeen.add(key)
        const pa = nodePos.get(a)
        const pb = nodePos.get(b)
        if (!pa || !pb) continue
        const [L, R] = pa.x <= pb.x ? [pa, pb] : [pb, pa]
        spouseLines.push({ id: `sp-${key}`, x1: L.x + NODE_W, y1: L.y + NODE_H / 2, x2: R.x, y2: R.y + NODE_H / 2 })
    }

    // --- Sibling lines ---
    const siblingLines: SiblingLine[] = []
    const siblingSeen = new Set<string>()
    for (const { person1Id: a, person2Id: b } of siblings) {
        const key = [a, b].sort().join(":")
        if (siblingSeen.has(key)) continue
        siblingSeen.add(key)
        const pa = nodePos.get(a)
        const pb = nodePos.get(b)
        if (!pa || !pb) continue
        const [L, R] = pa.x <= pb.x ? [pa, pb] : [pb, pa]
        // Connect above the cards so the line is always visible
        const topY = Math.min(L.y, R.y) - 14
        siblingLines.push({ id: `sib-${key}`, x1: L.x, y1: topY, x2: R.x + NODE_W, y2: topY })
    }

    // --- Child groups (H-tree connectors) ---
    const childGroups: ChildGroup[] = []
    for (const [unitId, unit] of units) {
        if (unit.childIds.length === 0) continue
        const left = unitLeftEdge.get(unitId) ?? 0
        const unitW = unit.secondary ? NODE_W * 2 + SPOUSE_GAP : NODE_W
        const unitCenterX = left + unitW / 2
        const uy = unit.gen * (NODE_H + V_GAP)
        const parentBottomY = uy + NODE_H
        const childGenY = (unit.gen + 1) * (NODE_H + V_GAP)
        const connY = parentBottomY + V_GAP * 0.42

        const childCenters = unit.childIds
            .map(cid => {
                const pos = nodePos.get(cid)
                return pos ? { id: cid, cx: pos.x + NODE_W / 2 } : null
            })
            .filter((c): c is { id: string; cx: number } => c !== null)
            .sort((a, b) => a.cx - b.cx)

        if (childCenters.length === 0) continue

        childGroups.push({
            id: `cg-${unitId}`,
            parentMidX: unitCenterX,
            parentBottomY,
            connY,
            childTopY: childGenY,
            childCenters,
        })
    }

    // --- Canvas dimensions ---
    const allX = nodes.map(n => n.x)
    const allY = nodes.map(n => n.y)
    const width = allX.length > 0 ? Math.max(...allX) + NODE_W : NODE_W
    const height = allY.length > 0 ? Math.max(...allY) + NODE_H : NODE_H

    return { nodes, spouseLines, siblingLines, childGroups, width, height }
}
