"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
    ArrowLeft, Edit2, TreePine, Camera, Calendar, Mail,
    MapPin, Save, X, User,
} from "lucide-react"
import { apiFetch } from "@/lib/apiFetch"
import { getPersonId } from "@/lib/auth"
import API_BASE from "@/services/api"
import { updatePerson } from "@/services/personEditService"
import { getPerson, Person } from "@/services/personService"
import AppSidebar from "@/components/AppSidebar"

interface Props {
    params: Promise<{ id: string }>
}

interface Relative {
    id: string
    relation_type: string
    related_person: { id: string; first_name: string; last_name: string; gender: string }
}

interface LineagePerson {
    level: number
    person: { id: string; first_name: string; last_name: string; gender: string }
}

function formatDate(iso: string | null | undefined): string {
    if (!iso) return "—"
    return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
}

function birthYear(iso: string | null | undefined): string {
    if (!iso) return ""
    return new Date(iso).getFullYear().toString()
}

function relLabel(relType: string): string {
    const map: Record<string, string> = {
        father: "Father", mother: "Mother", parent: "Parent",
        sibling: "Sibling", brother: "Brother", sister: "Sister",
        spouse: "Spouse", child: "Child", son: "Son", daughter: "Daughter",
    }
    return map[relType] ?? relType.charAt(0).toUpperCase() + relType.slice(1)
}

export default function PersonProfilePage({ params }: Props) {
    const { id } = use(params)
    const router = useRouter()

    const [person, setPerson]       = useState<Person | null>(null)
    const [canEdit, setCanEdit]     = useState(false)
    const [relatives, setRelatives] = useState<Record<string, Relative[]>>({})
    const [lineage, setLineage]     = useState<LineagePerson[]>([])
    const [relCount, setRelCount]   = useState(0)
    const [loading, setLoading]     = useState(true)
    const [error, setError]         = useState("")

    // edit state
    const [editing, setEditing]       = useState(false)
    const [firstName, setFirstName]   = useState("")
    const [lastName, setLastName]     = useState("")
    const [email, setEmail]           = useState("")
    const [birthDate, setBirthDate]   = useState("")
    const [biography, setBiography]   = useState("")
    const [location, setLocation]     = useState("")
    const [saving, setSaving]         = useState(false)

    useEffect(() => {
        Promise.all([
            getPerson(id),
            apiFetch(`${API_BASE}/auth/me`).then(r => r.ok ? r.json() : null).catch(() => null),
        ]).then(([p, me]) => {
            setPerson(p)
            setFirstName(p.first_name ?? "")
            setLastName(p.last_name ?? "")
            setEmail(p.email ?? "")
            setBirthDate(p.birth_date ? p.birth_date.split("T")[0] : "")
            setBiography(p.biography ?? "")

            // determine edit permission: own person OR family owner/admin
            const myPersonId: string | null = getPersonId()
            const myUserId: string | null   = me?.user?.id ?? null

            if (myPersonId === p.id) {
                setCanEdit(true)
            } else if (myUserId && p.family_id) {
                apiFetch(`${API_BASE}/families/${p.family_id}`)
                    .then(r => r.ok ? r.json() : null)
                    .then(family => {
                        if (family?.owner_id === myUserId) setCanEdit(true)
                    })
                    .catch(() => {})
            }

            // relatives
            apiFetch(`${API_BASE}/persons/${p.id}/relatives`)
                .then(r => r.json())
                .then(d => {
                    const grouped: Record<string, Relative[]> = d.relatives ?? {}
                    setRelatives(grouped)
                    setRelCount(Object.values(grouped).reduce((s, arr) => s + arr.length, 0))
                })
                .catch(() => {})

            // lineage
            apiFetch(`${API_BASE}/persons/${p.id}/lineage`)
                .then(r => r.json())
                .then((d: unknown) => {
                    const arr = Array.isArray(d) ? d : (d as { lineage?: LineagePerson[] })?.lineage ?? []
                    setLineage(arr)
                })
                .catch(() => {})
        }).catch(() => setError("Person not found")).finally(() => setLoading(false))
    }, [id])

    const startEdit = () => {
        if (!person) return
        setFirstName(person.first_name ?? "")
        setLastName(person.last_name ?? "")
        setEmail(person.email ?? "")
        setBirthDate(person.birth_date ? person.birth_date.split("T")[0] : "")
        setBiography(person.biography ?? "")
        setEditing(true)
    }

    const handleSave = async () => {
        if (!person) return
        setSaving(true); setError("")
        try {
            const updated = await updatePerson(person.id, {
                first_name: firstName,
                last_name: lastName,
                email: email || undefined,
                birth_date: birthDate || undefined,
                biography,
            })
            setPerson(updated)
            setEditing(false)
        } catch { setError("Failed to save") }
        finally { setSaving(false) }
    }

    // derived
    const parents  = [...(relatives["parent"] ?? []), ...(relatives["father"] ?? []), ...(relatives["mother"] ?? [])]
    const siblings = [...(relatives["sibling"] ?? []), ...(relatives["brother"] ?? []), ...(relatives["sister"] ?? [])]

    const maxGenLevel = lineage.length > 0 ? Math.max(...lineage.map(l => l.level)) + 1 : 0
    const initials    = person
        ? ([person.first_name?.[0], person.last_name?.[0]].filter(Boolean).join("").toUpperCase() || "?")
        : "?"
    const fullName    = person ? [person.first_name, person.last_name].filter(Boolean).join(" ") : ""

    const genTimeline = (() => {
        if (!Array.isArray(lineage) || lineage.length === 0) return []
        const byLevel: Record<number, LineagePerson[]> = {}
        for (const l of lineage) byLevel[l.level] = byLevel[l.level] ? [...byLevel[l.level], l] : [l]
        const levels = Object.keys(byLevel).map(Number).sort((a, b) => b - a)
        const maxLvl = levels[0]
        return levels.map(lvl => ({
            level: lvl,
            genNum: maxLvl - lvl + 1,
            fullNames: byLevel[lvl].map(l => [l.person.first_name, l.person.last_name].filter(Boolean).join(" ")).join(" & "),
            isMe: lvl === 0,
        }))
    })()

    if (loading) {
        return (
            <div style={{ display: "flex", height: "100vh", width: "100vw" }}>
                <AppSidebar activeSection="tree" />
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <p style={{ color: "#9E9E9E", fontSize: 14 }}>Loading…</p>
                </div>
            </div>
        )
    }

    if (error || !person) {
        return (
            <div style={{ display: "flex", height: "100vh", width: "100vw" }}>
                <AppSidebar activeSection="tree" />
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <p style={{ color: "#EF5350", fontSize: 14 }}>{error || "Person not found"}</p>
                </div>
            </div>
        )
    }

    return (
        <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden" }}>
            <AppSidebar activeSection="tree" activeFamilyId={person.family_id ?? undefined} />

            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

                {/* Header */}
                <header style={{
                    padding: "20px 32px", background: "#FFFFFF",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.05)", flexShrink: 0, zIndex: 10,
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <button
                            onClick={() => router.back()}
                            style={{
                                display: "flex", alignItems: "center", gap: 8,
                                background: "none", border: "none", cursor: "pointer",
                                color: "#555", fontSize: 14, fontWeight: 600, padding: 0,
                            }}
                        >
                            <ArrowLeft size={18} /> Back
                        </button>
                        <div style={{ marginLeft: 8 }}>
                            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1A1A2E", letterSpacing: -0.5 }}>
                                {canEdit ? "My Profile" : fullName}
                            </h1>
                            <p style={{ fontSize: 13, color: "#9E9E9E", marginTop: 2 }}>
                                {canEdit ? "Your place in the family tree" : "Family member profile"}
                            </p>
                        </div>
                    </div>

                    {canEdit && (
                        <div style={{ display: "flex", gap: 10 }}>
                            {editing ? (
                                <>
                                    <button
                                        onClick={() => setEditing(false)}
                                        style={{
                                            display: "flex", alignItems: "center", gap: 7,
                                            padding: "10px 18px", background: "#F5F5F5",
                                            border: "none", borderRadius: 10, cursor: "pointer",
                                            fontSize: 14, fontWeight: 600, color: "#555",
                                        }}
                                    >
                                        <X size={15} /> Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        style={{
                                            display: "flex", alignItems: "center", gap: 7,
                                            padding: "10px 20px",
                                            background: "linear-gradient(135deg, #4CAF50, #2E7D32)",
                                            color: "#fff", border: "none", borderRadius: 10, cursor: "pointer",
                                            fontSize: 14, fontWeight: 700,
                                            boxShadow: "0 4px 12px rgba(76,175,80,0.35)",
                                            opacity: saving ? 0.7 : 1,
                                        }}
                                    >
                                        <Save size={15} /> {saving ? "Saving…" : "Save Changes"}
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={startEdit}
                                    style={{
                                        display: "flex", alignItems: "center", gap: 7,
                                        padding: "10px 20px", background: "#F5F5F5",
                                        border: "none", borderRadius: 10, cursor: "pointer",
                                        fontSize: 14, fontWeight: 600, color: "#555",
                                    }}
                                >
                                    <Edit2 size={15} /> Edit Profile
                                </button>
                            )}
                        </div>
                    )}
                </header>

                {/* Body */}
                <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px", background: "#F7F5F0" }}>
                    <div style={{ maxWidth: 1100, margin: "0 auto" }}>

                        {error && (
                            <div style={{ background: "#FFEBEE", borderRadius: 10, padding: "10px 16px", marginBottom: 20, color: "#C62828", fontSize: 13 }}>
                                {error}
                            </div>
                        )}

                        {/* Hero */}
                        <div style={{
                            background: "linear-gradient(135deg, #1B5E20, #2E7D32, #4CAF50)",
                            borderRadius: 24, padding: "40px 44px", marginBottom: 28,
                            display: "flex", alignItems: "center", gap: 36,
                            position: "relative", overflow: "hidden",
                        }}>
                            <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "rgba(255,255,255,0.04)", right: -100, top: -100 }} />
                            <div style={{ position: "absolute", width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.04)", left: -60, bottom: -60 }} />

                            {/* Avatar */}
                            <div style={{ position: "relative", flexShrink: 0 }}>
                                <div style={{
                                    width: 110, height: 110, borderRadius: "50%",
                                    background: "rgba(255,255,255,0.2)",
                                    border: "4px solid rgba(255,255,255,0.5)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: 44, fontWeight: 800, color: "#fff",
                                }}>
                                    {initials}
                                </div>
                                {editing && (
                                    <div style={{
                                        position: "absolute", bottom: 2, right: 2,
                                        width: 34, height: 34, borderRadius: "50%",
                                        background: "white", display: "flex", alignItems: "center",
                                        justifyContent: "center", cursor: "pointer",
                                        boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
                                    }}>
                                        <Camera size={16} color="#4CAF50" />
                                    </div>
                                )}
                            </div>

                            {/* Name + tags */}
                            <div style={{ flex: 1, position: "relative", zIndex: 1 }}>
                                {editing ? (
                                    <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                                        <input
                                            value={firstName}
                                            onChange={e => setFirstName(e.target.value)}
                                            placeholder="First name"
                                            style={{
                                                fontSize: 24, fontWeight: 800, color: "#fff",
                                                background: "rgba(255,255,255,0.15)",
                                                border: "1px solid rgba(255,255,255,0.3)",
                                                borderRadius: 10, padding: "6px 14px", outline: "none", flex: 1,
                                            }}
                                        />
                                        <input
                                            value={lastName}
                                            onChange={e => setLastName(e.target.value)}
                                            placeholder="Last name"
                                            style={{
                                                fontSize: 24, fontWeight: 800, color: "#fff",
                                                background: "rgba(255,255,255,0.15)",
                                                border: "1px solid rgba(255,255,255,0.3)",
                                                borderRadius: 10, padding: "6px 14px", outline: "none", flex: 1,
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <h1 style={{ fontSize: 32, fontWeight: 800, color: "#fff", letterSpacing: -0.5, marginBottom: 10 }}>
                                        {fullName || "—"}
                                    </h1>
                                )}
                                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                    {person.gender && (
                                        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 16px", background: "rgba(255,255,255,0.2)", borderRadius: 20 }}>
                                            <User size={13} color="rgba(255,255,255,0.9)" />
                                            <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>
                                                {person.gender === "female" ? "Female" : "Male"}
                                            </span>
                                        </div>
                                    )}
                                    {person.birth_date && (
                                        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 16px", background: "rgba(255,255,255,0.15)", borderRadius: 20 }}>
                                            <Calendar size={13} color="rgba(255,255,255,0.8)" />
                                            <span style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.85)" }}>
                                                Born {birthYear(person.birth_date)}
                                            </span>
                                        </div>
                                    )}
                                    {canEdit && (
                                        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 16px", background: "rgba(255,255,255,0.2)", borderRadius: 20 }}>
                                            <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>Me</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Stats */}
                            <div style={{
                                display: "flex", background: "rgba(255,255,255,0.12)",
                                borderRadius: 18, padding: "20px 28px",
                                position: "relative", zIndex: 1, flexShrink: 0,
                            }}>
                                {[
                                    { label: "Relatives",   value: relCount },
                                    { label: "Memories",    value: 0 },
                                    { label: "Generations", value: maxGenLevel || (lineage.length > 0 ? 1 : 0) },
                                ].map((stat, i) => (
                                    <div key={stat.label} style={{
                                        textAlign: "center", padding: "0 24px",
                                        borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.2)" : "none",
                                    }}>
                                        <p style={{ fontSize: 28, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{stat.value}</p>
                                        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 6 }}>{stat.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Two-column layout */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

                            {/* Left column */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                                {/* Personal info */}
                                <div style={{ background: "#fff", borderRadius: 20, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
                                    <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1A1A2E", marginBottom: 20 }}>Personal Information</h3>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                        <InfoRow icon={Calendar} label="Birthday">
                                            {editing ? (
                                                <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} style={editInputStyle} />
                                            ) : (
                                                <span>{formatDate(person.birth_date)}</span>
                                            )}
                                        </InfoRow>
                                        <InfoRow icon={Mail} label="Email">
                                            {editing ? (
                                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={editInputStyle} />
                                            ) : (
                                                <span>{person.email || "—"}</span>
                                            )}
                                        </InfoRow>
                                        <InfoRow icon={MapPin} label="Location">
                                            {editing ? (
                                                <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="City, Country" style={editInputStyle} />
                                            ) : (
                                                <span>{location || "—"}</span>
                                            )}
                                        </InfoRow>
                                        <InfoRow icon={TreePine} label="Member Since">
                                            <span>{formatDate(person.created_at)}</span>
                                        </InfoRow>
                                    </div>
                                </div>

                                {/* Biography / About */}
                                <div style={{ background: "#fff", borderRadius: 20, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
                                    <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1A1A2E", marginBottom: 14 }}>
                                        {canEdit ? "About Me" : "Biography"}
                                    </h3>
                                    {editing ? (
                                        <textarea
                                            value={biography}
                                            onChange={e => setBiography(e.target.value)}
                                            rows={4}
                                            placeholder="Tell your family about yourself…"
                                            style={{
                                                width: "100%", fontSize: 15, color: "#555", lineHeight: 1.65,
                                                background: "#F5F5F5", border: "none", borderRadius: 12,
                                                padding: "12px 14px", outline: "none", resize: "none",
                                                boxSizing: "border-box", fontFamily: "inherit",
                                            }}
                                        />
                                    ) : (
                                        <p style={{ fontSize: 15, color: person.biography ? "#555" : "#BDBDBD", lineHeight: 1.65 }}>
                                            {person.biography || (canEdit ? "No bio yet. Click Edit Profile to add one." : "No biography added yet.")}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Right column */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                                {parents.length > 0 && (
                                    <div style={{ background: "#fff", borderRadius: 20, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
                                        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1A1A2E", marginBottom: 18 }}>
                                            {canEdit ? "My Parents" : "Parents"}
                                        </h3>
                                        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                                            {parents.map(rel => (
                                                <RelativeCard key={rel.id} rel={rel} onClick={() => router.push(`/person/${rel.related_person.id}`)} />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {siblings.length > 0 && (
                                    <div style={{ background: "#fff", borderRadius: 20, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
                                        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1A1A2E", marginBottom: 18 }}>
                                            {canEdit ? "My Siblings" : "Siblings"}
                                        </h3>
                                        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                                            {siblings.map(rel => (
                                                <RelativeCard key={rel.id} rel={rel} onClick={() => router.push(`/person/${rel.related_person.id}`)} />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {person.family_id && (
                                    <button
                                        onClick={() => router.push(`/family-tree/${person.family_id}`)}
                                        onMouseEnter={e => (e.currentTarget.style.background = "#D4EDDA")}
                                        onMouseLeave={e => (e.currentTarget.style.background = "#E8F5E9")}
                                        style={{
                                            width: "100%", padding: "18px",
                                            background: "#E8F5E9", color: "#2E7D32",
                                            border: "2px solid #C8E6C9", borderRadius: 18,
                                            fontSize: 16, fontWeight: 700, cursor: "pointer",
                                            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                                            transition: "background 0.15s",
                                        }}
                                    >
                                        <TreePine size={20} />
                                        {canEdit ? "View My Position in Family Tree" : "View in Family Tree"}
                                    </button>
                                )}

                                {genTimeline.length > 0 && (
                                    <div style={{
                                        background: "linear-gradient(135deg, #F3E5F5, #E8F5E9)",
                                        borderRadius: 20, padding: 22, boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                                    }}>
                                        <p style={{ fontSize: 13, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 12 }}>
                                            {canEdit ? "My Position" : "Position in Tree"}
                                        </p>
                                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                            {genTimeline.map(item => (
                                                <div key={item.level} style={{
                                                    display: "flex", alignItems: "center", gap: 12,
                                                    padding: "10px 12px",
                                                    background: item.isMe ? "#FFFFFF" : "transparent",
                                                    borderRadius: 12,
                                                    boxShadow: item.isMe ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
                                                }}>
                                                    <div style={{
                                                        width: 8, height: 8, borderRadius: "50%",
                                                        background: item.isMe ? "#4CAF50" : "#CCC", flexShrink: 0,
                                                    }} />
                                                    <div>
                                                        <p style={{ fontSize: 13, fontWeight: item.isMe ? 700 : 500, color: item.isMe ? "#1A1A2E" : "#888" }}>
                                                            {item.fullNames}
                                                        </p>
                                                        <p style={{ fontSize: 11, color: item.isMe ? "#4CAF50" : "#BDBDBD", marginTop: 1 }}>
                                                            Generation {item.genNum}{item.isMe ? " · You are here ✦" : ""}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ── Sub-components ────────────────────────────────────────────────────────────

const editInputStyle: React.CSSProperties = {
    fontSize: 15, color: "#1A1A2E", fontWeight: 500,
    background: "#F5F5F5", border: "none", borderRadius: 8,
    padding: "4px 10px", marginTop: 3, outline: "none", width: "100%",
}

function InfoRow({ icon: Icon, label, children }: {
    icon: React.ComponentType<{ size: number; color: string }>
    label: string
    children: React.ReactNode
}) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
                width: 40, height: 40, borderRadius: 11, background: "#E8F5E9",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
                <Icon size={18} color="#4CAF50" />
            </div>
            <div style={{ flex: 1 }}>
                <p style={{ fontSize: 11, color: "#9E9E9E", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {label}
                </p>
                <div style={{ fontSize: 15, color: "#1A1A2E", fontWeight: 500, marginTop: 3 }}>
                    {children}
                </div>
            </div>
        </div>
    )
}

function RelativeCard({ rel, onClick }: { rel: Relative; onClick: () => void }) {
    const [hovered, setHovered] = useState(false)
    const name    = [rel.related_person.first_name, rel.related_person.last_name].filter(Boolean).join(" ")
    const initial = rel.related_person.first_name?.[0]?.toUpperCase() ?? "?"
    return (
        <div
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                flex: 1, minWidth: 140,
                display: "flex", alignItems: "center", gap: 12,
                background: hovered ? "#F0F8F1" : "#F7F5F0",
                borderRadius: 14, padding: "14px 16px",
                cursor: "pointer", transition: "background 0.15s",
            }}
        >
            <div style={{
                width: 44, height: 44, borderRadius: "50%",
                background: "linear-gradient(135deg, #4CAF50, #2E7D32)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, fontWeight: 700, color: "#fff", flexShrink: 0,
                border: "2px solid #E8F5E9",
            }}>
                {initial}
            </div>
            <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#1A1A2E" }}>{name}</p>
                <p style={{ fontSize: 12, color: "#9E9E9E", marginTop: 2 }}>{relLabel(rel.relation_type)}</p>
            </div>
        </div>
    )
}
