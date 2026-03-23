"use client"

import { use, useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
    Search, Bell, Plus, Users, GitBranch,
    X, User, UserPlus, Check, Send, Mail, ChevronRight,
} from "lucide-react"
import API_BASE from "../../../services/api"
import { createPerson } from "../../../services/personService"
import { createRelationship } from "../../../services/relationshipService"
import { inviteMember } from "../../../services/invitationService"
import { apiFetch } from "../../../lib/apiFetch"
import { getPersonId } from "../../../lib/auth"
import FamilyTree from "../../../components/FamilyTree"
import { PersonCardData } from "../../../components/PersonCard"
import { computeKinship } from "../../../lib/kinship"
import { useT } from "../../../lib/i18n"
import { useBreakpoint } from "../../../lib/useBreakpoint"

interface Props {
    params: Promise<{ id: string }>
}

interface GenealogyPerson {
    id: string
    first_name: string
    last_name: string
    gender: string
    birth_date?: string | null
    death_date?: string | null
    photo_url?: string | null
}

interface GenealogyTree {
    persons: GenealogyPerson[]
    parent_child: { parent_id: string; child_id: string }[]
    spouses: { person1_id: string; person2_id: string }[]
    siblings: { person1_id: string; person2_id: string }[]
}

interface FamilyInfo {
    id: string
    name: string
}

// ─── Relationship types ────────────────────────────────────────────────────────

interface RelType {
    id: string
    label: string
    emoji: string
    description: string
}

const RELATIONSHIP_TYPES: RelType[] = [
    { id: "parent",  label: "Parent",  emoji: "👴", description: "Father or mother of this person" },
    { id: "child",   label: "Child",   emoji: "👶", description: "Son or daughter of this person" },
    { id: "sibling", label: "Sibling", emoji: "👫", description: "Brother or sister" },
    { id: "spouse",  label: "Spouse",  emoji: "💍", description: "Husband or wife" },
]


// ─── AddRelativePanel ──────────────────────────────────────────────────────────

function AddRelativePanel({
    anchor,
    familyId,
    existingPersons,
    onClose,
    onAdded,
}: {
    anchor: GenealogyPerson
    familyId: string
    existingPersons: GenealogyPerson[]
    onClose: () => void
    onAdded: (name: string) => void
}) {
    const { t } = useT()
    const [mode,       setMode]       = useState<"new" | "existing">("new")
    const [relType,    setRelType]    = useState("")
    // new-person fields
    const [firstName,  setFirstName]  = useState("")
    const [lastName,   setLastName]   = useState("")
    const [gender,     setGender]     = useState<"male" | "female" | "">("")
    const [email,      setEmail]      = useState("")
    // existing-person fields
    const [personSearch, setPersonSearch] = useState("")
    const [selectedId,   setSelectedId]   = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [error,      setError]      = useState("")
    const [done,       setDone]       = useState(false)
    const [addedName,  setAddedName]  = useState("")

    const relLabelMap: Record<string, string> = {
        parent:  t("tree_rel_parent"),
        child:   t("tree_rel_child"),
        sibling: t("tree_rel_sibling_label"),
        spouse:  t("rel_spouse"),
    }
    const relDescMap: Record<string, string> = {
        parent:  t("tree_rel_parent_desc"),
        child:   t("tree_rel_child_desc"),
        sibling: t("tree_rel_sibling_desc"),
        spouse:  t("tree_rel_spouse_desc"),
    }

    const candidates = existingPersons.filter(p => p.id !== anchor.id)
    const filtered = personSearch.trim()
        ? candidates.filter(p =>
            `${p.first_name} ${p.last_name}`.toLowerCase().includes(personSearch.toLowerCase()))
        : candidates

    const canSubmitNew      = relType && firstName.trim() && lastName.trim() && gender
    const canSubmitExisting = relType && selectedId

    const applyRelationship = async (targetId: string) => {
        const p1 = relType === "parent" ? targetId   : anchor.id
        const p2 = relType === "parent" ? anchor.id  : targetId
        const rel = (relType === "parent" || relType === "child") ? "parent" : relType
        await createRelationship({ person1_id: p1, person2_id: p2, relation_type: rel })
    }

    const handleSubmit = async () => {
        if (submitting) return
        if (mode === "existing" && !canSubmitExisting) return
        if (mode === "new" && !canSubmitNew) return
        setSubmitting(true)
        setError("")
        try {
            if (mode === "existing") {
                await applyRelationship(selectedId!)
                const person = existingPersons.find(p => p.id === selectedId)
                const name = [person?.first_name, person?.last_name].filter(Boolean).join(" ")
                setAddedName(name)
                setDone(true)
                setTimeout(() => onAdded(name), 1400)
            } else {
                const newPerson = await createPerson({
                    family_id: familyId,
                    first_name: firstName.trim(),
                    last_name: lastName.trim(),
                    gender: gender as string,
                    ...(email.trim() ? { email: email.trim() } : {}),
                })
                await applyRelationship(newPerson.id)
                if (email.trim()) {
                    inviteMember(familyId, email.trim(), "viewer").catch(() => {})
                }
                const name = `${firstName} ${lastName}`.trim()
                setAddedName(name)
                setDone(true)
                setTimeout(() => onAdded(name), 1400)
            }
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to add relative")
        } finally {
            setSubmitting(false)
        }
    }

    const anchorName = [anchor.first_name, anchor.last_name].filter(Boolean).join(" ")

    return (
        <>
            <div
                onClick={onClose}
                style={{
                    position: "fixed", inset: 0, zIndex: 100,
                    background: "rgba(0,0,0,0.18)",
                    backdropFilter: "blur(2px)",
                    animation: "panelFadeIn 0.2s ease both",
                }}
            />
            <div style={{
                position: "fixed", top: 0, right: 0, bottom: 0,
                width: 420, zIndex: 101,
                background: "#fff",
                boxShadow: "-8px 0 40px rgba(0,0,0,0.14)",
                display: "flex", flexDirection: "column",
                animation: "slideInRight 0.26s cubic-bezier(0.32,0.72,0,1) both",
                overflow: "hidden",
            }}>
                {/* Header */}
                <div style={{
                    padding: "20px 24px", flexShrink: 0,
                    borderBottom: "1px solid #F0F0F0",
                    display: "flex", alignItems: "center", gap: 12,
                }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: 12,
                        background: "linear-gradient(135deg, #4CAF50, #2E7D32)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                    }}>
                        <UserPlus size={18} color="#fff" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h2 style={{ fontSize: 16, fontWeight: 900, color: "#1A1A2E" }}>{t("tree_add_relative")}</h2>
                        <p style={{ fontSize: 12, color: "#9E9E9E", marginTop: 1 }}>
                            {t("tree_connected_to").replace("{name}", anchor.first_name)}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            width: 34, height: 34, borderRadius: 9,
                            background: "#F5F5F5", border: "none", cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0, transition: "background 0.15s",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#EBEBEB")}
                        onMouseLeave={e => (e.currentTarget.style.background = "#F5F5F5")}
                    >
                        <X size={16} color="#555" />
                    </button>
                </div>

                {/* Anchor strip */}
                <div style={{
                    padding: "14px 24px",
                    background: "linear-gradient(135deg, #F0FFF0, #E8F5E9)",
                    borderBottom: "1px solid #E0F0E0",
                    display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
                }}>
                    {anchor.photo_url ? (
                        <img
                            src={`${API_BASE}${anchor.photo_url}`}
                            alt={anchor.first_name}
                            style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2.5px solid #A5D6A7" }}
                        />
                    ) : (
                        <div style={{
                            width: 44, height: 44, borderRadius: "50%",
                            background: "linear-gradient(135deg, #4CAF50, #2E7D32)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 20, fontWeight: 700, color: "#fff",
                        }}>
                            {anchor.first_name[0]}
                        </div>
                    )}
                    <div>
                        <p style={{ fontSize: 13.5, fontWeight: 800, color: "#1A1A2E" }}>{anchorName}</p>
                        <p style={{ fontSize: 11.5, color: "#4CAF50", fontWeight: 600 }}>
                            {anchor.birth_date ? `b. ${anchor.birth_date.slice(0, 4)}` : "Family member"}
                        </p>
                    </div>
                    <div style={{
                        marginLeft: "auto", display: "flex", alignItems: "center", gap: 6,
                        fontSize: 11, color: "#4CAF50", fontWeight: 700,
                    }}>
                        {t("tree_anchor")} <ChevronRight size={12} />
                    </div>
                </div>

                {/* Scrollable body */}
                <div className="page-scroll" style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
                    {done ? (
                        <div style={{
                            display: "flex", flexDirection: "column", alignItems: "center",
                            justifyContent: "center", height: "100%", textAlign: "center", gap: 16,
                        }}>
                            <div style={{
                                width: 72, height: 72, borderRadius: "50%",
                                background: "linear-gradient(135deg, #4CAF50, #2E7D32)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                boxShadow: "0 8px 24px rgba(76,175,80,0.4)",
                                animation: "popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both",
                            }}>
                                <Check size={32} color="#fff" strokeWidth={2.5} />
                            </div>
                            <div>
                                <p style={{ fontSize: 20, fontWeight: 900, color: "#1A1A2E", marginBottom: 6 }}>
                                    {t("tree_added_name").replace("{name}", addedName)}
                                </p>
                                <p style={{ fontSize: 13, color: "#888", lineHeight: 1.55 }}>
                                    {t("tree_added_desc")
                                        .replace("{name}", addedName)
                                        .replace("{rel}", (relLabelMap[relType] ?? "").toLowerCase())
                                        .replace("{anchor}", anchor.first_name)}
                                    {email && t("tree_invite_note")}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>

                            {/* Mode toggle */}
                            <div style={{ display: "flex", background: "#F0F0F0", borderRadius: 12, padding: 4 }}>
                                {(["new", "existing"] as const).map(m => (
                                    <button key={m} onClick={() => setMode(m)} style={{
                                        flex: 1, padding: "10px 8px", borderRadius: 9, border: "none",
                                        background: mode === m ? "#fff" : "transparent",
                                        color: mode === m ? "#1A1A2E" : "#888",
                                        fontWeight: mode === m ? 700 : 500, fontSize: 13, cursor: "pointer",
                                        boxShadow: mode === m ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                                        transition: "all 0.2s",
                                    }}>
                                        {m === "new" ? t("tree_new_person_btn") : t("tree_existing_person_btn")}
                                    </button>
                                ))}
                            </div>

                            {/* ① Relationship type */}
                            <div>
                                <p style={{
                                    fontSize: 11.5, fontWeight: 700, color: "#BDBDBD",
                                    letterSpacing: 0.7, textTransform: "uppercase", marginBottom: 12,
                                }}>
                                    {t("tree_rel_to").replace("{name}", anchor.first_name)}
                                </p>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
                                    {RELATIONSHIP_TYPES.map(rt => {
                                        const sel = relType === rt.id
                                        return (
                                            <button
                                                key={rt.id}
                                                onClick={() => setRelType(rt.id)}
                                                style={{
                                                    display: "flex", flexDirection: "column", gap: 6,
                                                    padding: "13px 14px",
                                                    background: sel ? "#E8F5E9" : "#FAFAFA",
                                                    border: `1.5px solid ${sel ? "#4CAF50" : "#EEEEEE"}`,
                                                    borderRadius: 13, cursor: "pointer", textAlign: "left",
                                                    transition: "all 0.14s", position: "relative",
                                                }}
                                                onMouseEnter={e => { if (!sel) { e.currentTarget.style.borderColor = "#C8E6C9"; e.currentTarget.style.background = "#F5FBF5" } }}
                                                onMouseLeave={e => { if (!sel) { e.currentTarget.style.borderColor = "#EEEEEE"; e.currentTarget.style.background = "#FAFAFA" } }}
                                            >
                                                {sel && (
                                                    <div style={{
                                                        position: "absolute", top: 8, right: 8,
                                                        width: 17, height: 17, borderRadius: "50%",
                                                        background: "#4CAF50",
                                                        display: "flex", alignItems: "center", justifyContent: "center",
                                                    }}>
                                                        <Check size={9} color="#fff" strokeWidth={3} />
                                                    </div>
                                                )}
                                                <span style={{ fontSize: 24 }}>{rt.emoji}</span>
                                                <div>
                                                    <p style={{ fontSize: 13, fontWeight: 700, color: sel ? "#2E7D32" : "#1A1A2E" }}>{relLabelMap[rt.id]}</p>
                                                    <p style={{ fontSize: 11, color: "#AAAAAA", marginTop: 2, lineHeight: 1.4 }}>{relDescMap[rt.id]}</p>
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* ② Person details */}
                            <div>
                                <p style={{
                                    fontSize: 11.5, fontWeight: 700, color: "#BDBDBD",
                                    letterSpacing: 0.7, textTransform: "uppercase", marginBottom: 12,
                                }}>
                                    {t("tree_their_details")}
                                </p>

                                {mode === "existing" ? (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                        {/* Search */}
                                        <input
                                            type="text"
                                            value={personSearch}
                                            onChange={e => setPersonSearch(e.target.value)}
                                            placeholder={t("tree_search_member")}
                                            style={{
                                                width: "100%", padding: "11px 13px",
                                                background: "#F7F5F0", border: "1.5px solid #EBEBEB",
                                                borderRadius: 11, fontSize: 14, color: "#1A1A2E",
                                                outline: "none", boxSizing: "border-box",
                                            }}
                                            onFocus={e => (e.target.style.borderColor = "#A5D6A7")}
                                            onBlur={e => (e.target.style.borderColor = "#EBEBEB")}
                                        />
                                        {/* Person list */}
                                        <div style={{
                                            maxHeight: 240, overflowY: "auto",
                                            border: "1.5px solid #EBEBEB", borderRadius: 11,
                                            background: "#FAFAFA",
                                        }}>
                                            {filtered.length === 0 ? (
                                                <p style={{ fontSize: 13, color: "#AAAAAA", textAlign: "center", padding: "20px 0" }}>
                                                    {t("tree_no_matching")}
                                                </p>
                                            ) : filtered.map(p => {
                                                const sel = selectedId === p.id
                                                const fullName = [p.first_name, p.last_name].filter(Boolean).join(" ")
                                                return (
                                                    <button
                                                        key={p.id}
                                                        onClick={() => setSelectedId(p.id)}
                                                        style={{
                                                            width: "100%", display: "flex", alignItems: "center", gap: 10,
                                                            padding: "10px 14px", background: sel ? "#E8F5E9" : "none",
                                                            border: "none", borderBottom: "1px solid #F0F0F0",
                                                            cursor: "pointer", textAlign: "left", transition: "background 0.12s",
                                                        }}
                                                        onMouseEnter={e => { if (!sel) e.currentTarget.style.background = "#F5FBF5" }}
                                                        onMouseLeave={e => { if (!sel) e.currentTarget.style.background = "none" }}
                                                    >
                                                        <div style={{
                                                            width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                                                            background: "linear-gradient(135deg, #4CAF50, #2E7D32)",
                                                            display: "flex", alignItems: "center", justifyContent: "center",
                                                            fontSize: 14, fontWeight: 700, color: "#fff",
                                                        }}>
                                                            {p.first_name[0]}
                                                        </div>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <p style={{ fontSize: 13.5, fontWeight: sel ? 700 : 500, color: sel ? "#2E7D32" : "#1A1A2E" }}>{fullName}</p>
                                                            <p style={{ fontSize: 11, color: "#AAAAAA" }}>
                                                                {p.gender} {p.birth_date ? `· b. ${p.birth_date.slice(0, 4)}` : ""}
                                                            </p>
                                                        </div>
                                                        {sel && <Check size={16} color="#4CAF50" strokeWidth={2.5} />}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                        {error && (
                                            <p style={{ fontSize: 13, color: "#F44336", textAlign: "center" }}>{error}</p>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

                                        {/* Name */}
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                            {[
                                                { label: t("me_first_name"), val: firstName, set: setFirstName, ph: "e.g. Layla" },
                                                { label: t("me_last_name"),  val: lastName,  set: setLastName,  ph: "e.g. Hassan" },
                                            ].map(f => (
                                                <div key={f.label}>
                                                    <label style={{
                                                        fontSize: 11, fontWeight: 700, color: "#BDBDBD",
                                                        letterSpacing: 0.5, textTransform: "uppercase",
                                                        display: "block", marginBottom: 6,
                                                    }}>
                                                        {f.label} <span style={{ color: "#EF5350" }}>*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={f.val}
                                                        onChange={e => f.set(e.target.value)}
                                                        placeholder={f.ph}
                                                        style={{
                                                            width: "100%", padding: "11px 13px",
                                                            background: "#F7F5F0", border: "1.5px solid #EBEBEB",
                                                            borderRadius: 11, fontSize: 14, color: "#1A1A2E",
                                                            outline: "none", boxSizing: "border-box",
                                                        }}
                                                        onFocus={e => (e.target.style.borderColor = "#A5D6A7")}
                                                        onBlur={e => (e.target.style.borderColor = "#EBEBEB")}
                                                    />
                                                </div>
                                            ))}
                                        </div>

                                        {/* Gender */}
                                        <div>
                                            <label style={{
                                                fontSize: 11, fontWeight: 700, color: "#BDBDBD",
                                                letterSpacing: 0.5, textTransform: "uppercase",
                                                display: "block", marginBottom: 6,
                                            }}>
                                                {t("tree_gender_label")} <span style={{ color: "#EF5350" }}>*</span>
                                            </label>
                                            <div style={{ display: "flex", gap: 8 }}>
                                                {[
                                                    { val: "male",   label: t("male"),   emoji: "👨" },
                                                    { val: "female", label: t("female"), emoji: "👩" },
                                                ].map(opt => (
                                                    <button
                                                        key={opt.val}
                                                        onClick={() => setGender(opt.val as "male" | "female")}
                                                        style={{
                                                            flex: 1, padding: "11px",
                                                            background: gender === opt.val ? "#E8F5E9" : "#FAFAFA",
                                                            border: `1.5px solid ${gender === opt.val ? "#4CAF50" : "#EEEEEE"}`,
                                                            borderRadius: 11, cursor: "pointer",
                                                            display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                                                            fontSize: 13, fontWeight: gender === opt.val ? 700 : 500,
                                                            color: gender === opt.val ? "#2E7D32" : "#888",
                                                            transition: "all 0.14s",
                                                        }}
                                                    >
                                                        <span style={{ fontSize: 18 }}>{opt.emoji}</span> {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Email */}
                                        <div>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                                <label style={{
                                                    fontSize: 11, fontWeight: 700, color: "#BDBDBD",
                                                    letterSpacing: 0.5, textTransform: "uppercase",
                                                }}>
                                                    Email
                                                </label>
                                                <span style={{ fontSize: 10.5, color: "#BDBDBD", background: "#F5F5F5", borderRadius: 5, padding: "2px 7px" }}>
                                                    {t("tree_email_optional")}
                                                </span>
                                            </div>
                                            <div style={{
                                                display: "flex", alignItems: "center", gap: 9,
                                                background: "#F7F5F0", border: `1.5px solid ${email ? "#A5D6A7" : "#EBEBEB"}`,
                                                borderRadius: 11, padding: "11px 13px",
                                            }}>
                                                <Mail size={15} color={email ? "#4CAF50" : "#C0C0C0"} />
                                                <input
                                                    type="email"
                                                    value={email}
                                                    onChange={e => setEmail(e.target.value)}
                                                    placeholder="their@email.com"
                                                    style={{ flex: 1, border: "none", background: "none", outline: "none", fontSize: 14, color: "#1A1A2E" }}
                                                />
                                            </div>
                                            {email && (
                                                <p style={{ fontSize: 11, color: "#4CAF50", fontWeight: 600, marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}>
                                                    <Send size={10} /> {t("tree_invite_email_note")}
                                                </p>
                                            )}
                                        </div>

                                        {error && (
                                            <p style={{ fontSize: 13, color: "#F44336", textAlign: "center" }}>{error}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {!done && (
                    <div style={{
                        padding: "16px 24px",
                        borderTop: "1px solid #F0F0F0",
                        flexShrink: 0,
                        display: "flex", gap: 10,
                    }}>
                        <button
                            onClick={onClose}
                            style={{
                                padding: "13px 20px",
                                background: "#F5F5F5", color: "#888",
                                border: "none", borderRadius: 12,
                                fontSize: 14, fontWeight: 600, cursor: "pointer",
                            }}
                        >
                            {t("cancel")}
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!(mode === "new" ? canSubmitNew : canSubmitExisting) || submitting}
                            style={{
                                flex: 1, padding: "13px",
                                background: (mode === "new" ? canSubmitNew : canSubmitExisting) && !submitting ? "linear-gradient(135deg, #4CAF50, #2E7D32)" : "#E0E0E0",
                                color: (mode === "new" ? canSubmitNew : canSubmitExisting) && !submitting ? "#fff" : "#AAAAAA",
                                border: "none", borderRadius: 12,
                                fontSize: 14, fontWeight: 800,
                                cursor: (mode === "new" ? canSubmitNew : canSubmitExisting) && !submitting ? "pointer" : "not-allowed",
                                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                                boxShadow: (mode === "new" ? canSubmitNew : canSubmitExisting) && !submitting ? "0 4px 14px rgba(76,175,80,0.3)" : "none",
                                transition: "all 0.2s",
                            }}
                        >
                            {submitting ? (
                                <>
                                    <div style={{
                                        width: 15, height: 15, borderRadius: "50%",
                                        border: "2px solid rgba(255,255,255,0.3)",
                                        borderTopColor: "#fff",
                                        animation: "spin 0.7s linear infinite",
                                    }} />
                                    {t("tree_adding")}
                                </>
                            ) : mode === "existing" ? (
                                <><UserPlus size={15} /> {t("tree_add_btn").replace("{name}", selectedId ? (existingPersons.find(p => p.id === selectedId)?.first_name ?? "…") : "…")}</>
                            ) : (
                                <><UserPlus size={15} /> {t("tree_add_btn").replace("{name}", firstName || "…")}</>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </>
    )
}

// ─── NodeContextMenu ───────────────────────────────────────────────────────────

function NodeContextMenu({
    person,
    pos,
    selfId,
    onViewProfile,
    onAddRelative,
    onClose,
}: {
    person: GenealogyPerson
    pos: { x: number; y: number }
    selfId: string | null
    onViewProfile: () => void
    onAddRelative: () => void
    onClose: () => void
}) {
    const { t } = useT()
    const fullName = [person.first_name, person.last_name].filter(Boolean).join(" ")
    return (
        <>
            <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 200 }} />
            <div style={{
                position: "fixed",
                left: pos.x,
                top: pos.y,
                transform: "translate(-50%, calc(-100% - 14px))",
                zIndex: 201,
                background: "#fff",
                borderRadius: 16,
                boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
                border: "1px solid rgba(0,0,0,0.07)",
                minWidth: 200,
                overflow: "hidden",
                animation: "ctxPopUp 0.18s cubic-bezier(0.34,1.56,0.64,1) both",
            }}>
                {/* Person header */}
                <div style={{
                    padding: "12px 16px",
                    background: "linear-gradient(135deg, #F0FFF0, #E8F5E9)",
                    borderBottom: "1px solid #E0F0E0",
                    display: "flex", alignItems: "center", gap: 10,
                }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: "50%",
                        background: "linear-gradient(135deg, #4CAF50, #2E7D32)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 15, fontWeight: 700, color: "#fff", flexShrink: 0,
                    }}>
                        {person.first_name[0]}
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 13.5, fontWeight: 800, color: "#1A1A2E", whiteSpace: "nowrap" }}>{fullName}</p>
                        {person.birth_date && (
                            <p style={{ fontSize: 11, color: "#4CAF50", fontWeight: 600 }}>b. {person.birth_date.slice(0, 4)}</p>
                        )}
                    </div>
                </div>
                {/* Actions */}
                <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 2 }}>
                    <button
                        onClick={onViewProfile}
                        style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "10px 12px", background: "none", border: "none",
                            borderRadius: 10, cursor: "pointer", width: "100%", textAlign: "left",
                            fontSize: 13.5, fontWeight: 600, color: "#1A1A2E",
                            transition: "background 0.13s",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#F5F5F5")}
                        onMouseLeave={e => (e.currentTarget.style.background = "none")}
                    >
                        <User size={15} color="#555" />
                        {person.id === selfId ? t("nav_my_profile") : t("view_profile")}
                        <ChevronRight size={13} color="#CCCCCC" style={{ marginLeft: "auto" }} />
                    </button>
                    <button
                        onClick={onAddRelative}
                        style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "10px 12px", background: "none", border: "none",
                            borderRadius: 10, cursor: "pointer", width: "100%", textAlign: "left",
                            fontSize: 13.5, fontWeight: 600, color: "#2E7D32",
                            transition: "background 0.13s",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#F0FFF0")}
                        onMouseLeave={e => (e.currentTarget.style.background = "none")}
                    >
                        <UserPlus size={15} color="#4CAF50" />
                        {t("tree_add_relative_ctx")}
                        <ChevronRight size={13} color="#CCCCCC" style={{ marginLeft: "auto" }} />
                    </button>
                </div>
            </div>
        </>
    )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function FamilyTreePage({ params }: Props) {
    const router = useRouter()
    const { t } = useT()
    const { isMobile } = useBreakpoint()
    const { id: familyId } = use(params)

    const [tree, setTree] = useState<GenealogyTree>({ persons: [], parent_child: [], spouses: [], siblings: [] })
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [search, setSearch] = useState("")
    const [searchOpen, setSearchOpen] = useState(false)
    const [familyInfo, setFamilyInfo] = useState<FamilyInfo | null>(null)
    const [generationCount, setGenerationCount] = useState(0)


    // Add relative panel
    const [addAnchor, setAddAnchor] = useState<GenealogyPerson | null>(null)

    // Context menu (click on card)
    const [contextPersonId, setContextPersonId] = useState<string | null>(null)
    const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 })
    const lastClickPos = useRef({ x: 0, y: 0 })

    // Toast
    const [toast, setToast] = useState<string | null>(null)
    const showToast = (msg: string) => {
        setToast(msg)
        setTimeout(() => setToast(null), 2600)
    }

    const loadFamilyTree = useCallback(() => {
        apiFetch(`${API_BASE}/families/${familyId}/tree`)
            .then(r => r.json())
            .then((data: GenealogyTree) => {
                setTree(data)
                const childIds = new Set(data.parent_child.map(r => r.child_id))
                const roots = data.persons.filter(p => !childIds.has(p.id))
                let maxDepth = 0
                const dfs = (id: string, depth: number) => {
                    if (depth > maxDepth) maxDepth = depth
                    const children = data.parent_child.filter(r => r.parent_id === id).map(r => r.child_id)
                    for (const c of children) dfs(c, depth + 1)
                }
                for (const r of roots) dfs(r.id, 1)
                setGenerationCount(maxDepth || (data.persons.length > 0 ? 1 : 0))
            })
            .catch(console.error)
    }, [familyId])

    useEffect(() => {
        loadFamilyTree()
        apiFetch(`${API_BASE}/families/${familyId}`)
            .then(r => r.json())
            .then((data: FamilyInfo) => setFamilyInfo(data))
            .catch(() => {})
    }, [familyId, loadFamilyTree])

    // Resolve own person ID client-side (localStorage unavailable during SSR)
    const [selfId, setSelfId] = useState<string | null>(null)
    useEffect(() => { setSelfId(getPersonId()) }, [])

    const kinshipMap = computeKinship(
        tree.persons.map(p => ({ id: p.id, gender: p.gender })),
        tree.parent_child.map(r => ({ parentId: r.parent_id, childId: r.child_id })),
        tree.spouses.map(s => ({ person1Id: s.person1_id, person2Id: s.person2_id })),
        selfId,
    )

    function toCardData(p: GenealogyPerson): PersonCardData {
        return {
            id: p.id,
            firstName: p.first_name,
            lastName: p.last_name,
            gender: p.gender,
            birthDate: p.birth_date,
            deathDate: p.death_date,
            photoUrl: p.photo_url ? `${API_BASE}${p.photo_url}` : null,
            kinship: kinshipMap.get(p.id) ?? null,
        }
    }

    const handleSearch = (v: string) => {
        setSearch(v)
        if (!v.trim()) return
        const match = tree.persons.find(p =>
            `${p.first_name} ${p.last_name}`.toLowerCase().includes(v.toLowerCase())
        )
        if (match) setSelectedId(match.id)
    }

    const memberCount = tree.persons.length
    const familyTitle = familyInfo ? familyInfo.name : "Family Tree"

    return (
        <div className="flex flex-col" style={{ height: "100vh" }}>

            {/* Toast */}
            {toast && (
                <div style={{
                    position: "fixed", bottom: isMobile ? 80 : 28, left: "50%", transform: "translateX(-50%)",
                    background: "#1A1A2E", color: "#fff", borderRadius: 40, padding: "11px 22px",
                    fontSize: 13.5, fontWeight: 600, boxShadow: "0 8px 28px rgba(0,0,0,0.22)",
                    zIndex: 9999, whiteSpace: "nowrap", animation: "toastFadeUp 0.22s ease both",
                }}>
                    {toast}
                </div>
            )}

            {/* ── Header ── */}
            <header
                className="flex items-center justify-between flex-shrink-0"
                style={{ padding: isMobile ? "12px 16px" : "20px 32px", background: "#FFFFFF", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", zIndex: 10 }}
            >
                <div style={{ minWidth: 0, flex: 1 }}>
                    <h1 style={{ fontSize: isMobile ? 17 : 24, fontWeight: 800, color: "#1A1A2E", letterSpacing: -0.5, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {familyTitle}
                    </h1>
                    <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 16, marginTop: 2 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Users size={12} color="#888" />
                            <span style={{ fontSize: 12, color: "#888" }}>{t("tree_members_count").replace("{n}", String(memberCount))}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <GitBranch size={12} color="#888" />
                            <span style={{ fontSize: 12, color: "#888" }}>{t("tree_generations_count").replace("{n}", String(generationCount || "—"))}</span>
                        </div>
                    </div>
                </div>

                <div style={{ display: "flex", gap: isMobile ? 8 : 10, alignItems: "center", flexShrink: 0 }}>
                    {isMobile ? (
                        /* Mobile: icon-only search + add button */
                        <>
                            <button
                                onClick={() => setSearchOpen(v => !v)}
                                style={{
                                    width: 36, height: 36, borderRadius: 10, background: "#F5F5F5",
                                    border: "none", cursor: "pointer",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                }}
                            >
                                <Search size={16} color="#555" />
                            </button>
                            <button
                                onClick={() => router.push("/invite")}
                                style={{
                                    display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
                                    background: "linear-gradient(135deg, #4CAF50, #2E7D32)",
                                    color: "white", border: "none", borderRadius: 10,
                                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                                    boxShadow: "0 4px 14px rgba(76,175,80,0.3)",
                                }}
                            >
                                <Plus size={15} strokeWidth={2.5} /> {t("tree_add_member")}
                            </button>
                        </>
                    ) : (
                        /* Desktop: full controls */
                        <>
                            {searchOpen ? (
                                <input
                                    autoFocus
                                    style={{
                                        padding: "10px 14px", background: "#F5F5F5", border: "none",
                                        borderRadius: 10, fontSize: 13, fontWeight: 500, color: "#333",
                                        outline: "none", width: 180,
                                    }}
                                    placeholder={t("tree_search_member")}
                                    value={search}
                                    onChange={e => handleSearch(e.target.value)}
                                    onBlur={() => { if (!search) setSearchOpen(false) }}
                                />
                            ) : (
                                <button
                                    onClick={() => setSearchOpen(true)}
                                    style={{
                                        display: "flex", alignItems: "center", gap: 7,
                                        padding: "10px 18px", background: "#F5F5F5",
                                        border: "none", borderRadius: 10, cursor: "pointer",
                                        fontSize: 13, fontWeight: 600, color: "#555",
                                    }}
                                >
                                    <Search size={15} /> {t("search")}
                                </button>
                            )}
                            <button
                                onClick={() => router.push("/reminders")}
                                style={{
                                    width: 40, height: 40, borderRadius: 10, background: "#FFF8E1",
                                    border: "none", cursor: "pointer",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    position: "relative",
                                }}
                            >
                                <Bell size={17} color="#FF9800" />
                                <div style={{ position: "absolute", top: 7, right: 7, width: 8, height: 8, borderRadius: "50%", background: "#FF5252", border: "1.5px solid white" }} />
                            </button>
                            <button
                                onClick={() => router.push("/invite")}
                                style={{
                                    display: "flex", alignItems: "center", gap: 8, padding: "10px 20px",
                                    background: "linear-gradient(135deg, #4CAF50, #2E7D32)",
                                    color: "white", border: "none", borderRadius: 10,
                                    fontSize: 14, fontWeight: 700, cursor: "pointer",
                                    boxShadow: "0 4px 14px rgba(76,175,80,0.35)",
                                }}
                            >
                                <Plus size={16} strokeWidth={2.5} /> {t("tree_add_member")}
                            </button>
                        </>
                    )}
                </div>
            </header>

            {/* Mobile search bar (below header) */}
            {isMobile && searchOpen && (
                <div style={{ padding: "8px 16px", background: "#fff", borderBottom: "1px solid #F0F0F0" }}>
                    <input
                        autoFocus
                        style={{
                            width: "100%", padding: "10px 14px", background: "#F5F5F5", border: "none",
                            borderRadius: 10, fontSize: 13, fontWeight: 500, color: "#333",
                            outline: "none", boxSizing: "border-box",
                        }}
                        placeholder={t("tree_search_member")}
                        value={search}
                        onChange={e => handleSearch(e.target.value)}
                        onBlur={() => { if (!search) setSearchOpen(false) }}
                    />
                </div>
            )}

            {/* ── Tree canvas ── */}
            <div
                className="flex-1 overflow-hidden"
                style={{ position: "relative" }}
                onMouseDown={e => { lastClickPos.current = { x: e.clientX, y: e.clientY } }}
            >
                <FamilyTree
                    persons={tree.persons.map(toCardData)}
                    parentChild={tree.parent_child.map(r => ({ parentId: r.parent_id, childId: r.child_id }))}
                    spouses={tree.spouses.map(s => ({ person1Id: s.person1_id, person2Id: s.person2_id }))}
                    siblings={(tree.siblings ?? []).map(s => ({ person1Id: s.person1_id, person2Id: s.person2_id }))}
                    selectedId={selectedId}
                    onSelect={id => { setSelectedId(id || null); if (!id) { setSearch(""); setContextPersonId(null) } }}
                    onOpen={id => {
                        setContextPersonId(prev => prev === id ? null : id)
                        setContextMenuPos({ x: lastClickPos.current.x, y: lastClickPos.current.y })
                    }}
                />

                {/* Context menu */}
                {contextPersonId && (() => {
                    const contextPerson = tree.persons.find(p => p.id === contextPersonId) ?? null
                    if (!contextPerson) return null
                    return (
                        <NodeContextMenu
                            person={contextPerson}
                            pos={contextMenuPos}
                            selfId={selfId}
                            onViewProfile={() => {
                                setContextPersonId(null)
                                router.push(contextPersonId === selfId ? "/me" : `/person/${contextPersonId}`)
                            }}
                            onAddRelative={() => {
                                setContextPersonId(null)
                                setAddAnchor(contextPerson)
                            }}
                            onClose={() => setContextPersonId(null)}
                        />
                    )
                })()}

                {/* Hint */}
                {!isMobile && (
                    <div style={{
                        position: "absolute", left: 24, bottom: 24,
                        background: "rgba(255,255,255,0.85)", borderRadius: 10, padding: "6px 12px",
                        fontSize: 12, color: "#888", fontWeight: 500,
                        backdropFilter: "blur(4px)", border: "1px solid rgba(0,0,0,0.05)",
                        pointerEvents: "none",
                    }}>
                        {t("tree_drag_hint")}
                    </div>
                )}
            </div>

            {/* ── Bottom stats ── */}
            <div
                className="flex-shrink-0"
                style={{
                    padding: isMobile ? "12px 16px" : "14px 32px",
                    paddingBottom: isMobile ? "calc(12px + env(safe-area-inset-bottom) + 68px)" : "14px",
                    background: "#FFFFFF", borderTop: "1px solid rgba(0,0,0,0.06)",
                    display: isMobile ? "grid" : "flex",
                    gridTemplateColumns: isMobile ? "1fr 1fr" : undefined,
                    gap: isMobile ? 12 : 32,
                    alignItems: isMobile ? undefined : "center",
                }}
            >
                {[
                    { label: t("tree_total_members"), value: memberCount, emoji: "👥" },
                    { label: t("me_generations"),     value: generationCount || "—", emoji: "🌳" },
                    { label: t("memories_title"),     value: 0, emoji: "📸" },
                    { label: t("reminders_title"),    value: 0, emoji: "🔔" },
                ].map(stat => (
                    <div key={stat.label} style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 10 }}>
                        <div style={{
                            width: isMobile ? 34 : 38, height: isMobile ? 34 : 38,
                            borderRadius: 10, background: "#F0F8F1",
                            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}>
                            <span style={{ fontSize: isMobile ? 16 : 18 }}>{stat.emoji}</span>
                        </div>
                        <div>
                            <p style={{ fontSize: isMobile ? 16 : 18, fontWeight: 800, color: "#1A1A2E", lineHeight: 1 }}>{stat.value}</p>
                            <p style={{ fontSize: 10, color: "#888", marginTop: 2 }}>{stat.label}</p>
                        </div>
                    </div>
                ))}

                {!isMobile && (
                    <div style={{ marginLeft: "auto" }}>
                        <button
                            onClick={() => router.push("/invite")}
                            style={{
                                display: "flex", alignItems: "center", gap: 8,
                                padding: "10px 20px", background: "#E8F5E9", color: "#2E7D32",
                                border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer",
                            }}
                        >
                            <Plus size={15} /> {t("tree_invite_family")}
                        </button>
                    </div>
                )}
            </div>

            {/* Add Relative Panel */}
            {addAnchor && (
                <AddRelativePanel
                    anchor={addAnchor}
                    familyId={familyId}
                    existingPersons={tree.persons}
                    onClose={() => setAddAnchor(null)}
                    onAdded={name => {
                        setAddAnchor(null)
                        loadFamilyTree()
                        showToast(t("tree_added_toast").replace("{name}", name))
                    }}
                />
            )}

            <style>{`
                @keyframes ctxPopUp {
                    from { opacity: 0; transform: translate(-50%, calc(-100% - 6px)) scale(0.92); }
                    to   { opacity: 1; transform: translate(-50%, calc(-100% - 14px)) scale(1); }
                }
                @keyframes slideInRight {
                    from { transform: translateX(100%); }
                    to   { transform: translateX(0); }
                }
                @keyframes panelFadeIn {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                @keyframes popIn {
                    from { opacity: 0; transform: scale(0.5); }
                    to   { opacity: 1; transform: scale(1); }
                }
                @keyframes toastFadeUp {
                    from { opacity: 0; transform: translate(-50%, 10px); }
                    to   { opacity: 1; transform: translate(-50%, 0); }
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    )
}
