"use client"

import { useState } from "react"
import { NODE_W, NODE_H } from "../lib/treeLayout"

export interface PersonCardData {
    id: string
    firstName: string
    lastName: string
    gender: string
    birthDate?: string | null
    deathDate?: string | null
    photoUrl?: string | null
    kinship?: string | null
}

interface Props {
    person: PersonCardData
    x: number
    y: number
    selected?: boolean
    onClick?: () => void
    onDoubleClick?: () => void
}

export default function PersonCard({ person, x, y, selected, onClick, onDoubleClick }: Props) {
    const [hovered, setHovered] = useState(false)

    const isFemale = person.gender === "female"
    const initials = [person.firstName?.[0], person.lastName?.[0]].filter(Boolean).join("").toUpperCase() || "?"
    const fullName = [person.firstName, person.lastName].filter(Boolean).join(" ") || "Unknown"

    const birthYear = person.birthDate ? new Date(person.birthDate).getFullYear() : null
    const deathYear = person.deathDate ? new Date(person.deathDate).getFullYear() : null
    const dateStr = birthYear
        ? deathYear ? `${birthYear} – ${deathYear}` : `b. ${birthYear}`
        : deathYear ? `d. ${deathYear}` : null

    const isMe = person.kinship === "Me"

    return (
        <div
            style={{
                position: "absolute",
                left: x,
                top: y,
                width: NODE_W,
                height: NODE_H,
                cursor: "pointer",
                userSelect: "none",
                zIndex: 2,
                transition: "transform 0.2s",
                transform: hovered ? "translateY(-4px)" : "translateY(0)",
            }}
            onClick={e => { e.stopPropagation(); onClick?.() }}
            onDoubleClick={e => { e.stopPropagation(); onDoubleClick?.() }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    background: isMe
                        ? "linear-gradient(135deg, #4CAF50, #2E7D32)"
                        : "#FFFFFF",
                    border: isMe
                        ? "2px solid rgba(255,255,255,0.3)"
                        : selected
                            ? "2px solid #4CAF50"
                            : "1.5px solid rgba(0,0,0,0.05)",
                    borderRadius: 18,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 5,
                    padding: "12px 10px",
                    boxShadow: isMe
                        ? "0 8px 24px rgba(76,175,80,0.4)"
                        : selected
                            ? "0 0 0 3px rgba(76,175,80,0.2), 0 8px 24px rgba(0,0,0,0.1)"
                            : hovered
                                ? "0 8px 24px rgba(0,0,0,0.12)"
                                : "0 4px 16px rgba(0,0,0,0.08)",
                    transition: "box-shadow 0.2s",
                    boxSizing: "border-box",
                }}
            >
                {/* Circular avatar */}
                <div
                    style={{
                        width: 56,
                        height: 56,
                        borderRadius: "50%",
                        background: isMe
                            ? "rgba(255,255,255,0.3)"
                            : isFemale ? "#fce7f3" : "#dbeafe",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        overflow: "hidden",
                        border: isMe
                            ? "3px solid rgba(255,255,255,0.5)"
                            : "3px solid #E8F5E9",
                    }}
                >
                    {person.photoUrl ? (
                        <img src={person.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                        <span style={{
                            fontSize: 20,
                            fontWeight: 700,
                            color: isMe ? "#fff" : isFemale ? "#be185d" : "#1d4ed8",
                        }}>
                            {initials}
                        </span>
                    )}
                </div>

                {/* Full name */}
                <span style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: isMe ? "#FFFFFF" : "#1A1A2E",
                    textAlign: "center",
                    lineHeight: 1.2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: "100%",
                    paddingInline: 4,
                }}>
                    {person.firstName || "Unknown"}
                </span>

                {/* Birth/death year */}
                {dateStr && (
                    <span style={{
                        fontSize: 10.5,
                        color: isMe ? "rgba(255,255,255,0.75)" : "#A0A0A0",
                        fontWeight: 500,
                    }}>
                        {dateStr}
                    </span>
                )}

                {/* Kinship badge */}
                {person.kinship && (
                    <span style={{
                        fontSize: 9.5,
                        fontWeight: 600,
                        color: isMe ? "rgba(255,255,255,0.9)" : "#5CAF60",
                        background: isMe ? "rgba(255,255,255,0.15)" : "#F0F8F1",
                        borderRadius: 6,
                        padding: "2px 8px",
                    }}>
                        {person.kinship}
                    </span>
                )}
            </div>
        </div>
    )
}
