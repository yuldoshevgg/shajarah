"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react"
import {
    computeTreeLayout,
    NODE_W,
    NODE_H,
    V_GAP,
} from "../lib/treeLayout"
import PersonCard, { PersonCardData } from "./PersonCard"

interface Props {
    persons: PersonCardData[]
    parentChild: { parentId: string; childId: string }[]
    spouses: { person1Id: string; person2Id: string }[]
    selectedId?: string | null
    onSelect?: (id: string) => void
    onOpen?: (id: string) => void
}

const PADDING = 80
const GREEN = "#81C784"
const GREEN_MID = "#A5D6A7"

export default function FamilyTree({ persons, parentChild, spouses, selectedId, onSelect, onOpen }: Props) {
    const layout = computeTreeLayout(
        persons.map(p => ({ id: p.id })),
        parentChild,
        spouses,
    )
    const personMap = new Map(persons.map(p => [p.id, p]))

    // Generation Y positions
    const genYMap = new Map<number, number>()
    for (const node of layout.nodes) {
        const gen = Math.round(node.y / (NODE_H + V_GAP))
        if (!genYMap.has(gen)) genYMap.set(gen, node.y)
    }
    const generations = [...genYMap.entries()].sort((a, b) => a[0] - b[0])

    // Pan / zoom state
    const [pan, setPan] = useState({ x: 0, y: 0 })
    const [scale, setScale] = useState(1)
    const containerRef = useRef<HTMLDivElement>(null)
    const isDragging = useRef(false)
    const lastPos = useRef({ x: 0, y: 0 })

    // Touch tracking
    const touchRef = useRef<{ id: number; startX: number; startY: number; originX: number; originY: number } | null>(null)
    const pinchRef = useRef<{ dist: number; originScale: number } | null>(null)

    // Reset on data change
    useEffect(() => {
        setPan({ x: 0, y: 0 })
        setScale(1)
    }, [persons.length])

    // ---- Mouse events ----
    const onWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault()
        const delta = -e.deltaY * 0.001
        setScale(s => Math.max(0.4, Math.min(2.5, s + delta)))
    }, [])

    const onMouseDown = useCallback((e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest("[data-card]")) return
        isDragging.current = true
        lastPos.current = { x: e.clientX, y: e.clientY }
        e.preventDefault()
    }, [])

    const onMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDragging.current) return
        const dx = e.clientX - lastPos.current.x
        const dy = e.clientY - lastPos.current.y
        lastPos.current = { x: e.clientX, y: e.clientY }
        setPan(p => ({ x: p.x + dx, y: p.y + dy }))
    }, [])

    const onMouseUp = useCallback(() => { isDragging.current = false }, [])

    // ---- Touch events ----
    const touchDist = (t1: React.Touch, t2: React.Touch) =>
        Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY)

    const onTouchStart = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 1) {
            const t = e.touches[0]
            touchRef.current = { id: t.identifier, startX: t.clientX, startY: t.clientY, originX: pan.x, originY: pan.y }
            pinchRef.current = null
        } else if (e.touches.length === 2) {
            pinchRef.current = { dist: touchDist(e.touches[0], e.touches[1]), originScale: scale }
            touchRef.current = null
        }
    }, [pan.x, pan.y, scale])

    const onTouchMove = useCallback((e: React.TouchEvent) => {
        e.preventDefault()
        if (e.touches.length === 1 && touchRef.current) {
            const t = e.touches[0]
            setPan({
                x: touchRef.current.originX + t.clientX - touchRef.current.startX,
                y: touchRef.current.originY + t.clientY - touchRef.current.startY,
            })
        } else if (e.touches.length === 2 && pinchRef.current) {
            const newDist = touchDist(e.touches[0], e.touches[1])
            setScale(Math.min(2.5, Math.max(0.4, pinchRef.current.originScale * newDist / pinchRef.current.dist)))
        }
    }, [])

    const onTouchEnd = useCallback(() => {
        touchRef.current = null
        pinchRef.current = null
    }, [])

    const handleZoomIn = (e: React.MouseEvent) => { e.stopPropagation(); setScale(s => Math.min(s + 0.2, 2.5)) }
    const handleZoomOut = (e: React.MouseEvent) => { e.stopPropagation(); setScale(s => Math.max(s - 0.2, 0.4)) }
    const handleReset = (e: React.MouseEvent) => { e.stopPropagation(); setScale(1); setPan({ x: 0, y: 0 }) }

    const svgW = layout.width + PADDING * 2
    const svgH = layout.height + PADDING * 2

    return (
        <div
            ref={containerRef}
            className="w-full h-full overflow-hidden select-none relative"
            style={{
                background: "radial-gradient(circle at 50% 50%, #F8FFF8 0%, #F0F7F0 100%)",
                cursor: isDragging.current ? "grabbing" : "grab",
                touchAction: "none",
            }}
            onWheel={onWheel}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onClick={() => onSelect?.("")}
        >
            {/* Subtle grid pattern */}
            <svg
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0.4 }}
            >
                <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#C8E6C9" strokeWidth="0.5" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* Transformable tree — centered in viewport */}
            <div
                style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                    transformOrigin: "center center",
                    width: svgW,
                    height: svgH,
                }}
            >
                {/* SVG: lines + gen labels */}
                <svg
                    style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }}
                    width={svgW}
                    height={svgH}
                >
                    {/* Generation labels */}
                    {generations.map(([gen, y]) => {
                        const labelY = y + PADDING + NODE_H / 2
                        const labelX = 8
                        const text = `Gen ${toRoman(gen + 1)}`
                        return (
                            <g key={`gen-${gen}`}>
                                <rect x={labelX} y={labelY - 11} width={54} height={22} rx={8} fill="#E8F5E9" />
                                <text
                                    x={labelX + 27} y={labelY + 4}
                                    textAnchor="middle"
                                    fontSize={10}
                                    fill="#4CAF50"
                                    fontWeight={700}
                                    fontFamily="system-ui, sans-serif"
                                    style={{ userSelect: "none" }}
                                >
                                    {text}
                                </text>
                            </g>
                        )
                    })}

                    {/* Spouse lines */}
                    {layout.spouseLines.map(sl => {
                        const x1 = sl.x1 + PADDING
                        const x2 = sl.x2 + PADDING
                        const y = sl.y1 + PADDING
                        const midX = (x1 + x2) / 2
                        return (
                            <g key={sl.id}>
                                <line x1={x1} y1={y} x2={x2} y2={y} stroke={GREEN} strokeWidth={2.5} />
                                <text
                                    x={midX} y={y - 4}
                                    textAnchor="middle"
                                    fontSize={11}
                                    fill={GREEN}
                                    fontWeight={600}
                                    fontFamily="system-ui"
                                    style={{ userSelect: "none" }}
                                >
                                    ♥
                                </text>
                                <text
                                    x={midX} y={y - 16}
                                    textAnchor="middle"
                                    fontSize={9.5}
                                    fill={GREEN}
                                    fontWeight={600}
                                    fontFamily="system-ui, sans-serif"
                                    style={{ userSelect: "none" }}
                                >
                                    Husband · Wife
                                </text>
                            </g>
                        )
                    })}

                    {/* Parent-child connectors */}
                    {layout.childGroups.map(cg => {
                        const px = cg.parentMidX + PADDING
                        const py = cg.parentBottomY + PADDING
                        const connY = cg.connY + PADDING
                        const childY = cg.childTopY + PADDING
                        const centers = cg.childCenters.map(c => c.cx + PADDING)

                        return (
                            <g key={cg.id} fill="none" strokeLinecap="round" strokeLinejoin="round">
                                {/* Vertical from parent */}
                                <line x1={px} y1={py} x2={px} y2={connY} stroke={GREEN_MID} strokeWidth={2.5} />
                                {/* Horizontal bar */}
                                {centers.length > 1 && (
                                    <line
                                        x1={Math.min(...centers)} y1={connY}
                                        x2={Math.max(...centers)} y2={connY}
                                        stroke={GREEN_MID} strokeWidth={2.5}
                                    />
                                )}
                                {/* Verticals to each child + label */}
                                {centers.map((cx, i) => {
                                    const childId = cg.childCenters[i]?.id
                                    const childPerson = childId ? personMap.get(childId) : undefined
                                    const label = childPerson?.kinship && childPerson.kinship !== "Me"
                                        ? childPerson.kinship
                                        : childPerson?.gender === "female" ? "Daughter" : "Son"
                                    const labelY = connY + (childY - connY) * 0.5
                                    return (
                                        <g key={i}>
                                            <line x1={cx} y1={connY} x2={cx} y2={childY - 4} stroke={GREEN_MID} strokeWidth={2.5} />
                                            {/* Arrow dot */}
                                            <circle cx={cx} cy={childY - 4} r={4} fill={GREEN} stroke="none" />
                                            {/* Label */}
                                            <text
                                                x={cx + 8} y={labelY}
                                                textAnchor="start"
                                                fontSize={9.5}
                                                fill={GREEN}
                                                fontWeight={600}
                                                fontFamily="system-ui, sans-serif"
                                                style={{ userSelect: "none" }}
                                            >
                                                {label}
                                            </text>
                                        </g>
                                    )
                                })}
                            </g>
                        )
                    })}
                </svg>

                {/* Person cards */}
                {layout.nodes.map(node => {
                    const person = personMap.get(node.id)
                    if (!person) return null
                    return (
                        <div key={node.id} data-card="1">
                            <PersonCard
                                person={person}
                                x={node.x + PADDING}
                                y={node.y + PADDING}
                                selected={node.id === selectedId}
                                onClick={() => onSelect?.(node.id)}
                                onDoubleClick={() => onOpen?.(node.id)}
                            />
                        </div>
                    )
                })}
            </div>

            {/* Hint — bottom left */}
            <div
                style={{
                    position: "absolute",
                    left: 24,
                    bottom: 24,
                    background: "rgba(255,255,255,0.85)",
                    borderRadius: 10,
                    padding: "8px 14px",
                    fontSize: 12,
                    color: "#888",
                    fontWeight: 500,
                    backdropFilter: "blur(4px)",
                    border: "1px solid rgba(0,0,0,0.05)",
                    pointerEvents: "none",
                }}
            >
                🖱️ Drag to pan · Scroll to zoom · Click a member to view profile
            </div>

            {/* Zoom controls — bottom right */}
            <div
                style={{
                    position: "absolute",
                    right: 24,
                    bottom: 24,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    zIndex: 10,
                }}
            >
                <div
                    style={{
                        background: "rgba(255,255,255,0.95)",
                        borderRadius: 14,
                        padding: 6,
                        boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                        border: "1px solid rgba(0,0,0,0.06)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        alignItems: "center",
                    }}
                >
                    {[
                        { icon: ZoomIn, action: handleZoomIn },
                        { icon: ZoomOut, action: handleZoomOut },
                        { icon: Maximize2, action: handleReset },
                    ].map(({ icon: Icon, action }, i) => (
                        <ZoomButton key={i} icon={Icon} onClick={action} />
                    ))}
                </div>
                <div
                    style={{
                        background: "rgba(255,255,255,0.95)",
                        borderRadius: 10,
                        padding: "6px 12px",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                        border: "1px solid rgba(0,0,0,0.06)",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#555",
                        textAlign: "center",
                    }}
                >
                    {Math.round(scale * 100)}%
                </div>
            </div>
        </div>
    )
}

function ZoomButton({ icon: Icon, onClick }: { icon: React.ComponentType<{ size: number; color: string }>, onClick: (e: React.MouseEvent) => void }) {
    const [hovered, setHovered] = useState(false)
    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: hovered ? "#F0F8F0" : "transparent",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.15s",
            }}
        >
            <Icon size={16} color="#555" />
        </button>
    )
}

function toRoman(n: number): string {
    const vals = [10, 9, 5, 4, 1]
    const syms = ["X", "IX", "V", "IV", "I"]
    let result = ""
    for (let i = 0; i < vals.length; i++) {
        while (n >= vals[i]) { result += syms[i]; n -= vals[i] }
    }
    return result
}
