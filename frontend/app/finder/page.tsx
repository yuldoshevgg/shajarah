"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
    ArrowLeft, Search, ChevronDown, ArrowUpDown, RefreshCw,
} from "lucide-react"
import { isAuthenticated } from "@/lib/auth"
import { getFamilies, Family } from "@/services/familyService"
import { getPersons, Person } from "@/services/personService"
import { apiFetch } from "@/lib/apiFetch"
import API_BASE from "@/services/api"
import AppSidebar from "@/components/AppSidebar"

// ── Person picker ────────────────────────────────────────────────────────────

function PersonPicker({
    label,
    persons,
    selected,
    onSelect,
    accentColor,
}: {
    label: string
    persons: Person[]
    selected: string
    onSelect: (id: string) => void
    accentColor: string
}) {
    const [open, setOpen] = useState(false)
    const person = persons.find(p => p.id === selected)

    return (
        <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#9E9E9E", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.8 }}>
                {label}
            </p>

            <div
                onClick={() => setOpen(s => !s)}
                style={{
                    background: selected ? "#F0F8F1" : "#F7F5F0",
                    borderRadius: 14, padding: "14px 18px",
                    display: "flex", alignItems: "center", gap: 12,
                    cursor: "pointer",
                    border: selected ? `2px solid ${accentColor}40` : "2px solid transparent",
                    transition: "all 0.2s", minHeight: 72,
                }}
            >
                {person ? (
                    <>
                        <div style={{
                            width: 44, height: 44, borderRadius: "50%", background: accentColor,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 18, fontWeight: 700, color: "#fff", flexShrink: 0,
                        }}>
                            {person.first_name[0]}
                        </div>
                        <div>
                            <p style={{ fontSize: 15, fontWeight: 700, color: "#1A1A2E" }}>
                                {person.first_name} {person.last_name}
                            </p>
                            <p style={{ fontSize: 12, color: "#9E9E9E" }}>
                                {person.birth_date ? new Date(person.birth_date).getFullYear() : "—"} · {person.gender}
                            </p>
                        </div>
                    </>
                ) : (
                    <>
                        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#E0E0E0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Search size={16} color="#9E9E9E" />
                        </div>
                        <span style={{ fontSize: 14, color: "#9E9E9E" }}>Select a family member</span>
                    </>
                )}
                <ChevronDown
                    size={18} color="#9E9E9E"
                    style={{ marginLeft: "auto", transform: open ? "rotate(180deg)" : "none", transition: "0.2s" }}
                />
            </div>

            {open && (
                <div style={{
                    background: "white", borderRadius: 14, marginTop: 6,
                    boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
                    overflow: "hidden", border: "1px solid #EBEBEB",
                    zIndex: 100, position: "relative", maxHeight: 280, overflowY: "auto",
                }}>
                    {persons.map(p => (
                        <div
                            key={p.id}
                            onClick={() => { onSelect(p.id); setOpen(false) }}
                            style={{
                                padding: "12px 16px", display: "flex", alignItems: "center", gap: 12,
                                cursor: "pointer", borderBottom: "1px solid #F5F5F5",
                                background: selected === p.id ? "#F0F8F1" : "transparent",
                                transition: "background 0.15s",
                            }}
                            onMouseEnter={e => { if (selected !== p.id) e.currentTarget.style.background = "#FAFAFA" }}
                            onMouseLeave={e => { e.currentTarget.style.background = selected === p.id ? "#F0F8F1" : "transparent" }}
                        >
                            <div style={{
                                width: 38, height: 38, borderRadius: "50%", background: "#4CAF50",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 16, fontWeight: 700, color: "#fff",
                            }}>
                                {p.first_name[0]}
                            </div>
                            <div>
                                <p style={{ fontSize: 14, fontWeight: 600, color: "#1A1A2E" }}>{p.first_name} {p.last_name}</p>
                                <p style={{ fontSize: 12, color: "#9E9E9E" }}>
                                    {p.gender} {p.birth_date ? `· ${new Date(p.birth_date).getFullYear()}` : ""}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function FinderPage() {
    const router = useRouter()
    const [family, setFamily] = useState<Family | null>(null)
    const [persons, setPersons] = useState<Person[]>([])
    const [personA, setPersonA] = useState("")
    const [personB, setPersonB] = useState("")
    const [result, setResult] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!isAuthenticated()) { router.push("/auth/login"); return }
        getFamilies().then(fs => {
            const f = fs[0]
            if (!f) return
            setFamily(f)
            getPersons(f.id).then(setPersons).catch(() => {})
        }).catch(() => {})
    }, [router])

    const pA = persons.find(p => p.id === personA)
    const pB = persons.find(p => p.id === personB)

    const handleFind = async () => {
        if (!personA || !personB || loading) return
        setLoading(true)
        try {
            const res = await apiFetch(`${API_BASE}/persons/${personA}/relationship-to/${personB}`)
            const data = await res.json()
            setResult(data.relation ?? "Unknown")
        } catch {
            setResult("Unknown")
        } finally {
            setLoading(false)
        }
    }

    const handleSwap = () => {
        setPersonA(personB)
        setPersonB(personA)
        setResult(null)
    }

    const handleReset = () => {
        setPersonA("")
        setPersonB("")
        setResult(null)
    }

    return (
        <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden" }}>
            <AppSidebar activeSection="finder" activeFamilyId={family?.id} />

            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {/* Header */}
                <header style={{
                    padding: "20px 32px", background: "#FFFFFF",
                    display: "flex", alignItems: "center", gap: 14,
                    boxShadow: "0 2px 12px rgba(0,0,0,0.05)", flexShrink: 0, zIndex: 10,
                }}>
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
                        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1A1A2E", letterSpacing: -0.5 }}>Relationship Finder</h1>
                        <p style={{ fontSize: 13, color: "#9E9E9E", marginTop: 3 }}>Discover how any two family members are connected</p>
                    </div>
                </header>

                {/* Body */}
                <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px", background: "#F7F5F0", display: "flex", justifyContent: "center" }}>
                    <div style={{ width: "100%", maxWidth: 900 }}>

                        {/* Hero banner */}
                        <div style={{
                            background: "linear-gradient(135deg, #1A1A2E, #2D2D5E)",
                            borderRadius: 24, padding: "28px 36px", marginBottom: 28,
                            display: "flex", alignItems: "center", gap: 24,
                            position: "relative", overflow: "hidden",
                        }}>
                            <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "rgba(255,255,255,0.03)", right: -80, bottom: -80 }} />
                            <div style={{
                                width: 70, height: 70, borderRadius: 20,
                                background: "rgba(255,255,255,0.08)",
                                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                            }}>
                                <span style={{ fontSize: 36 }}>🔗</span>
                            </div>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 8 }}>Find the Connection</h3>
                                <p style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
                                    Select two family members below and discover exactly how they are related to each other.
                                </p>
                            </div>
                            <div style={{ display: "flex", gap: 20, flexShrink: 0 }}>
                                {[
                                    { label: "Members",     value: persons.length },
                                    { label: "Generations", value: 3 },
                                ].map((s, i) => (
                                    <div key={s.label} style={{
                                        textAlign: "center", paddingLeft: i > 0 ? 20 : 0,
                                        borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.12)" : "none",
                                    }}>
                                        <p style={{ fontSize: 28, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{s.value}</p>
                                        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{s.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Pickers */}
                        <div style={{ background: "#FFFFFF", borderRadius: 22, padding: 28, boxShadow: "0 4px 20px rgba(0,0,0,0.06)", marginBottom: 20 }}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                                <PersonPicker
                                    label="Person A"
                                    persons={persons}
                                    selected={personA}
                                    onSelect={id => { setPersonA(id); setResult(null) }}
                                    accentColor="#4CAF50"
                                />

                                {/* Swap */}
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", paddingBottom: 14, paddingTop: 32, flexShrink: 0 }}>
                                    <button
                                        onClick={handleSwap}
                                        style={{
                                            width: 46, height: 46, borderRadius: "50%",
                                            background: "#F0F8F1", border: "2px solid #C8E6C9",
                                            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                                            transition: "background 0.15s",
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.background = "#DCF0DC")}
                                        onMouseLeave={e => (e.currentTarget.style.background = "#F0F8F1")}
                                    >
                                        <ArrowUpDown size={18} color="#4CAF50" />
                                    </button>
                                    <span style={{ fontSize: 10, color: "#9E9E9E", marginTop: 6, fontWeight: 600 }}>SWAP</span>
                                </div>

                                <PersonPicker
                                    label="Person B"
                                    persons={persons}
                                    selected={personB}
                                    onSelect={id => { setPersonB(id); setResult(null) }}
                                    accentColor="#9C27B0"
                                />
                            </div>

                            <button
                                onClick={handleFind}
                                disabled={!personA || !personB || loading}
                                style={{
                                    width: "100%", marginTop: 20, padding: "16px",
                                    background: personA && personB ? "linear-gradient(135deg, #4CAF50, #2E7D32)" : "#E0E0E0",
                                    color: "white", borderRadius: 14, border: "none",
                                    fontSize: 16, fontWeight: 700,
                                    cursor: personA && personB && !loading ? "pointer" : "not-allowed",
                                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                                    boxShadow: personA && personB ? "0 6px 20px rgba(76,175,80,0.35)" : "none",
                                    transition: "all 0.2s",
                                }}
                            >
                                <Search size={18} />
                                {loading ? "Discovering..." : "Discover Relationship"}
                            </button>
                        </div>

                        {/* Result */}
                        {result && pA && pB && (
                            <div style={{
                                background: "white", borderRadius: 22, padding: "36px 40px",
                                boxShadow: "0 8px 32px rgba(0,0,0,0.08)", textAlign: "center", marginBottom: 20,
                            }}>
                                <div style={{
                                    display: "inline-flex", alignItems: "center", gap: 6,
                                    background: "#E8F5E9", color: "#2E7D32",
                                    padding: "6px 18px", borderRadius: 20,
                                    fontSize: 12, fontWeight: 700, textTransform: "uppercase",
                                    letterSpacing: 0.8, marginBottom: 28,
                                }}>
                                    ✓ Relationship Found
                                </div>

                                {/* Visual connector */}
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 32 }}>
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                                        <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#4CAF50", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 32 }}>
                                            {pA.first_name[0]}
                                        </div>
                                        <div>
                                            <p style={{ fontSize: 15, fontWeight: 700, color: "#1A1A2E" }}>{pA.first_name} {pA.last_name}</p>
                                            <p style={{ fontSize: 12, color: "#9E9E9E" }}>{pA.gender}</p>
                                        </div>
                                    </div>

                                    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "0 24px" }}>
                                        <div style={{ height: 2, background: "linear-gradient(90deg, #4CAF50, #9C27B0)", width: "100%", borderRadius: 2, marginBottom: 12 }} />
                                        <span style={{ fontSize: 13, color: "#888", fontWeight: 500 }}>is the</span>
                                        <div style={{ height: 2, background: "linear-gradient(90deg, #4CAF50, #9C27B0)", width: "100%", borderRadius: 2, marginTop: 12 }} />
                                    </div>

                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                                        <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#9C27B0", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 32 }}>
                                            {pB.first_name[0]}
                                        </div>
                                        <div>
                                            <p style={{ fontSize: 15, fontWeight: 700, color: "#1A1A2E" }}>{pB.first_name} {pB.last_name}</p>
                                            <p style={{ fontSize: 12, color: "#9E9E9E" }}>{pB.gender}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Result pill */}
                                <div style={{
                                    background: "linear-gradient(135deg, #E8F5E9, #F0F8FF)",
                                    borderRadius: 18, padding: "24px 32px",
                                    display: "inline-block", border: "2px solid #C8E6C9", marginBottom: 24,
                                }}>
                                    <p style={{ fontSize: 14, color: "#555", marginBottom: 8 }}>
                                        <strong style={{ color: "#1A1A2E" }}>{pA.first_name}</strong> is the
                                    </p>
                                    <p style={{ fontSize: 40, fontWeight: 900, color: "#2E7D32", letterSpacing: -1, marginBottom: 8 }}>
                                        {result}
                                    </p>
                                    <p style={{ fontSize: 14, color: "#555" }}>
                                        of <strong style={{ color: "#1A1A2E" }}>{pB.first_name}</strong>
                                    </p>
                                </div>

                                <div>
                                    <button
                                        onClick={handleReset}
                                        style={{
                                            display: "inline-flex", alignItems: "center", gap: 8,
                                            background: "#F5F5F5", border: "none", color: "#555",
                                            fontSize: 14, fontWeight: 600, cursor: "pointer",
                                            borderRadius: 10, padding: "10px 20px", transition: "background 0.15s",
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.background = "#EBEBEB")}
                                        onMouseLeave={e => (e.currentTarget.style.background = "#F5F5F5")}
                                    >
                                        <RefreshCw size={15} /> Search Again
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Quick examples */}
                        {!result && persons.length >= 2 && (
                            <div style={{ background: "#fff", borderRadius: 22, padding: "24px 28px", boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
                                <p style={{ fontSize: 13, fontWeight: 700, color: "#9E9E9E", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 16 }}>
                                    Try These Examples
                                </p>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                                    {persons.slice(0, 4).flatMap((p, i) =>
                                        persons.slice(i + 1, i + 2).map(q => ({
                                            a: p.id, b: q.id,
                                            label: `${p.first_name} → ${q.first_name}`,
                                        }))
                                    ).map((ex, i) => (
                                        <button
                                            key={i}
                                            onClick={() => { setPersonA(ex.a); setPersonB(ex.b); setResult(null) }}
                                            style={{
                                                padding: "9px 18px", background: "#F7F5F0",
                                                border: "1.5px solid #E0E0E0", borderRadius: 10,
                                                fontSize: 13, fontWeight: 600, color: "#555",
                                                cursor: "pointer", transition: "all 0.15s",
                                            }}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.background = "#E8F5E9"
                                                e.currentTarget.style.borderColor = "#C8E6C9"
                                                e.currentTarget.style.color = "#2E7D32"
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.background = "#F7F5F0"
                                                e.currentTarget.style.borderColor = "#E0E0E0"
                                                e.currentTarget.style.color = "#555"
                                            }}
                                        >
                                            {ex.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
