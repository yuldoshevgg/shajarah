"use client"

import { Handle, Position, NodeProps } from "reactflow"

export interface PersonNodeData {
    firstName: string
    lastName: string
    gender: string
    birthDate?: string | null
    deathDate?: string | null
    photoUrl?: string | null
}

export default function PersonNode({ data, selected }: NodeProps<PersonNodeData>) {
    const isFemale = data.gender === "female"
    const bg = selected ? "#1e293b" : isFemale ? "#fdf2f8" : "#f0f9ff"
    const border = selected ? "#1e293b" : isFemale ? "#f9a8d4" : "#93c5fd"
    const nameColor = selected ? "#f8fafc" : "#0f172a"
    const dateColor = selected ? "#94a3b8" : "#64748b"
    const avatarBg = isFemale ? "#f9a8d4" : "#93c5fd"

    const initials = [data.firstName?.[0], data.lastName?.[0]].filter(Boolean).join("").toUpperCase()

    const dateStr = [
        data.birthDate ? `b. ${data.birthDate}` : null,
        data.deathDate ? `d. ${data.deathDate}` : null,
    ].filter(Boolean).join("  ")

    return (
        <div
            style={{
                background: bg,
                border: `2px solid ${border}`,
                borderRadius: 12,
                padding: "10px 12px",
                width: 180,
                minHeight: 84,
                display: "flex",
                alignItems: "center",
                gap: 10,
                cursor: "pointer",
                boxShadow: selected
                    ? "0 0 0 3px rgba(30,41,59,0.25)"
                    : "0 2px 8px rgba(0,0,0,0.08)",
                transition: "box-shadow 0.15s, border-color 0.15s",
            }}
        >
            {/* Top handle: parent-child edge source (this node is parent, edge goes UP to child) */}
            <Handle
                type="source"
                position={Position.Top}
                id="top"
                style={{ background: "transparent", border: "none", width: 8, height: 8 }}
            />
            {/* Bottom handle: parent-child edge target (this node is child, edge comes from parent below) */}
            <Handle
                type="target"
                position={Position.Bottom}
                id="bottom"
                style={{ background: "transparent", border: "none", width: 8, height: 8 }}
            />
            {/* Right handle: spouse connection */}
            <Handle
                type="source"
                position={Position.Right}
                id="right"
                style={{ background: "transparent", border: "none", width: 8, height: 8 }}
            />
            {/* Left handle: spouse connection */}
            <Handle
                type="target"
                position={Position.Left}
                id="left"
                style={{ background: "transparent", border: "none", width: 8, height: 8 }}
            />

            {/* Avatar */}
            {data.photoUrl ? (
                <img
                    src={data.photoUrl}
                    alt=""
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        objectFit: "cover",
                        flexShrink: 0,
                        border: `2px solid ${border}`,
                    }}
                />
            ) : (
                <div
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        background: avatarBg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#fff",
                        flexShrink: 0,
                    }}
                >
                    {initials || "?"}
                </div>
            )}

            {/* Info */}
            <div style={{ minWidth: 0, flex: 1 }}>
                <div
                    style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: nameColor,
                        lineHeight: 1.3,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                    }}
                >
                    {[data.firstName, data.lastName].filter(Boolean).join(" ") || "Unknown"}
                </div>
                {dateStr && (
                    <div
                        style={{
                            fontSize: 10,
                            color: dateColor,
                            marginTop: 2,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {dateStr}
                    </div>
                )}
            </div>
        </div>
    )
}
