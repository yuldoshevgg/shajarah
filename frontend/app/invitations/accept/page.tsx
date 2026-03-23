"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
    Check, X, TreePine, ArrowRight,
    Mail, Lock, Eye, EyeOff, User,
    Shield, Users, GitBranch, ChevronRight, Sparkles, Heart, Link2,
} from "lucide-react"
import {
    getInvitationPreview, InvitationPreview,
    acceptInvitation, joinFamilyByLink,
} from "@/services/invitationService"
import { register, login } from "@/services/authService"
import { isAuthenticated, getPersonId } from "@/lib/auth"
import { apiFetch } from "@/lib/apiFetch"
import API_BASE from "@/services/api"

// ── Types ─────────────────────────────────────────────────────────────────────

type Stage = "preview" | "auth" | "connect" | "success"
type AuthMode = "new" | "existing"

const RELATIONSHIPS = [
    "Father", "Mother", "Brother", "Sister", "Son", "Daughter",
    "Grandfather", "Grandmother", "Uncle", "Aunt", "Cousin", "Spouse",
]

// ── Confetti ──────────────────────────────────────────────────────────────────

function Confetti() {
    const pieces = [
        { left: "10%", top: "-5%", w: 10, h: 10, bg: "#4CAF50", delay: "0s",    dur: "3s" },
        { left: "20%", top: "-10%", w: 8,  h: 16, bg: "#FFD54F", delay: "0.3s", dur: "2.8s" },
        { left: "35%", top: "-3%",  w: 12, h: 8,  bg: "#EF5350", delay: "0.1s", dur: "3.2s" },
        { left: "50%", top: "-8%",  w: 9,  h: 12, bg: "#42A5F5", delay: "0.5s", dur: "2.6s" },
        { left: "65%", top: "-4%",  w: 11, h: 9,  bg: "#AB47BC", delay: "0.2s", dur: "3s" },
        { left: "78%", top: "-12%", w: 8,  h: 14, bg: "#4CAF50", delay: "0.4s", dur: "2.9s" },
        { left: "88%", top: "-6%",  w: 13, h: 8,  bg: "#FF7043", delay: "0.15s",dur: "3.1s" },
        { left: "5%",  top: "-15%", w: 7,  h: 11, bg: "#26C6DA", delay: "0.6s", dur: "2.7s" },
        { left: "43%", top: "-20%", w: 10, h: 6,  bg: "#FFD54F", delay: "0.35s",dur: "3.3s" },
        { left: "92%", top: "-9%",  w: 9,  h: 13, bg: "#EF5350", delay: "0.25s",dur: "2.5s" },
    ]
    return (
        <>
            {pieces.map((p, i) => (
                <div key={i} style={{
                    position: "absolute", borderRadius: 3,
                    left: p.left, top: p.top, width: p.w, height: p.h, background: p.bg,
                    animation: `confettiFall ${p.dur} ${p.delay} ease-in both`,
                }} />
            ))}
        </>
    )
}

// ── Decline modal ─────────────────────────────────────────────────────────────

function DeclineModal({ familyName, onConfirm, onCancel }: {
    familyName: string; onConfirm: () => void; onCancel: () => void
}) {
    return (
        <div
            style={{
                position: "fixed", inset: 0, zIndex: 1000,
                background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)",
                display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
            }}
            onClick={onCancel}
        >
            <div
                style={{
                    background: "#fff", borderRadius: 24, padding: "40px 44px",
                    maxWidth: 420, width: "100%",
                    boxShadow: "0 32px 80px rgba(0,0,0,0.2)",
                    textAlign: "center", animation: "fadeUp 0.25s ease both",
                }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ fontSize: 56, marginBottom: 16 }}>😔</div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1A1A2E", marginBottom: 8 }}>
                    Decline this invitation?
                </h2>
                <p style={{ fontSize: 14, color: "#888", lineHeight: 1.6, marginBottom: 28 }}>
                    You'll no longer have access to the <strong>{familyName}</strong> tree.
                    The inviter can send you a new one anytime.
                </p>
                <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={onCancel} style={{
                        flex: 1, padding: "13px", background: "#F5F5F5", color: "#555",
                        border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer",
                    }}>Keep Invitation</button>
                    <button onClick={onConfirm} style={{
                        flex: 1, padding: "13px", background: "#FFEBEE", color: "#C62828",
                        border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer",
                    }}>Yes, Decline</button>
                </div>
            </div>
        </div>
    )
}

// ── Stage 1: Preview ──────────────────────────────────────────────────────────

function PreviewStage({ preview, familyId, onAccept, onDecline }: {
    preview: InvitationPreview | null
    familyId?: string
    onAccept: () => void
    onDecline: () => void
}) {
    const familyName = preview?.family_name ?? "This Family"
    const inviterName = preview?.inviter_name ?? "Someone"
    const invitedAs = preview?.invited_as ?? "member"
    const memberCount = preview?.member_count ?? 0

    return (
        <div style={{ width: "100%", maxWidth: 560, animation: "fadeUp 0.4s ease both" }}>
            {/* Inviter pill */}
            <div style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)",
                borderRadius: 40, padding: "8px 16px 8px 8px",
                border: "1px solid rgba(255,255,255,0.6)", marginBottom: 28,
                boxShadow: "0 4px 20px rgba(0,0,0,0.07)",
            }}>
                <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: "linear-gradient(135deg, #4CAF50, #2E7D32)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700, color: "#fff",
                }}>
                    {inviterName[0].toUpperCase()}
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#444" }}>
                    <span style={{ color: "#2E7D32" }}>{inviterName}</span> invited you
                </span>
            </div>

            {/* Card */}
            <div style={{
                background: "#fff", borderRadius: 28, overflow: "hidden",
                boxShadow: "0 24px 72px rgba(0,0,0,0.14), 0 4px 20px rgba(0,0,0,0.06)",
            }}>
                {/* Hero */}
                <div style={{
                    background: "linear-gradient(145deg, #4CAF50, #2E7D32)",
                    padding: "40px 40px 48px", position: "relative", overflow: "hidden", textAlign: "center",
                }}>
                    <div style={{ position: "absolute", width: 240, height: 240, borderRadius: "50%", background: "rgba(255,255,255,0.06)", top: -80, right: -60 }} />
                    <div style={{ position: "absolute", width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.05)", bottom: -40, left: -40 }} />
                    <div style={{
                        width: 88, height: 88, borderRadius: 28,
                        background: "rgba(255,255,255,0.2)", backdropFilter: "blur(4px)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 44, margin: "0 auto 18px",
                        border: "2px solid rgba(255,255,255,0.3)",
                        boxShadow: "0 8px 28px rgba(0,0,0,0.15)",
                        position: "relative", zIndex: 1,
                    }}>
                        👨‍👩‍👧‍👦
                    </div>
                    <h1 style={{ fontSize: 28, fontWeight: 900, color: "#fff", letterSpacing: -0.5, marginBottom: 8, position: "relative", zIndex: 1 }}>
                        {familyName}
                    </h1>
                    <p style={{ fontSize: 15, color: "rgba(255,255,255,0.8)", position: "relative", zIndex: 1 }}>
                        You've been invited as <strong style={{ color: "#fff" }}>{invitedAs}</strong>
                    </p>
                    <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 24, position: "relative", zIndex: 1 }}>
                        {memberCount > 0 && (
                            <div style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "6px 14px" }}>
                                <Users size={13} color="rgba(255,255,255,0.9)" />
                                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>{memberCount} Members</span>
                            </div>
                        )}
                        <div style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "6px 14px" }}>
                            <GitBranch size={13} color="rgba(255,255,255,0.9)" />
                            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>Family Tree</span>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div style={{ padding: "32px 40px 36px" }}>
                    {/* What you'll get */}
                    <div style={{ background: "#F8FFF8", borderRadius: 16, padding: "18px 20px", border: "1px solid #DCF0DC", marginBottom: 28 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                            <Sparkles size={15} color="#4CAF50" />
                            <p style={{ fontSize: 13, fontWeight: 700, color: "#2E7D32" }}>What you'll get access to</p>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            {["🌳 Interactive family tree", "📸 Family memories & photos", "🔔 Birthday reminders", "🧬 Relationship finder"].map(item => (
                                <div key={item} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                    <Check size={13} color="#4CAF50" strokeWidth={2.5} style={{ flexShrink: 0 }} />
                                    <span style={{ fontSize: 12.5, color: "#555" }}>{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Expiry */}
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 24, justifyContent: "center" }}>
                        <Shield size={13} color="#9E9E9E" />
                        <p style={{ fontSize: 12, color: "#9E9E9E" }}>
                            {preview ? "Invitation is active" : "Join as a member"}
                        </p>
                    </div>

                    {/* Buttons */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <button
                            onClick={onAccept}
                            style={{
                                width: "100%", padding: "17px",
                                background: "linear-gradient(135deg, #4CAF50, #2E7D32)",
                                color: "#fff", border: "none", borderRadius: 16,
                                fontSize: 16, fontWeight: 800, cursor: "pointer",
                                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                                boxShadow: "0 8px 24px rgba(76,175,80,0.4)", transition: "transform 0.15s, box-shadow 0.15s",
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(76,175,80,0.5)" }}
                            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(76,175,80,0.4)" }}
                        >
                            <Heart size={18} fill="white" strokeWidth={0} /> Accept Invitation <ArrowRight size={18} />
                        </button>
                        {preview && (
                            <button
                                onClick={onDecline}
                                style={{
                                    width: "100%", padding: "14px", background: "transparent", color: "#BDBDBD",
                                    border: "1.5px solid #EBEBEB", borderRadius: 16,
                                    fontSize: 14, fontWeight: 600, cursor: "pointer",
                                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                                    transition: "border-color 0.15s, color 0.15s",
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = "#EF5350"; e.currentTarget.style.color = "#EF5350" }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = "#EBEBEB"; e.currentTarget.style.color = "#BDBDBD" }}
                            >
                                <X size={15} /> Decline Invitation
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

// ── Stage 2: Auth ─────────────────────────────────────────────────────────────

function AuthStage({ preview, familyId, token, onSuccess }: {
    preview: InvitationPreview | null
    familyId?: string
    token?: string
    onSuccess: (ownerPersonId?: string, ownerName?: string) => void
}) {
    const [mode, setMode] = useState<AuthMode>("new")
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [gender, setGender] = useState<"male" | "female">("male")
    const [email, setEmail] = useState(preview?.invited_email ?? "")
    const [password, setPass] = useState("")
    const [showPass, setShowPass] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const handleSubmit = async () => {
        if (!email || !password || (mode === "new" && !firstName)) return
        setLoading(true)
        setError("")
        try {
            if (mode === "new") {
                await register(email, password, firstName, lastName, gender)
            } else {
                await login(email, password)
            }
            // Now accept the invitation
            if (token) {
                await acceptInvitation(token)
                onSuccess()
            } else if (familyId) {
                const result = await joinFamilyByLink(familyId)
                onSuccess(result.owner_person_id, result.owner_name)
            } else {
                onSuccess()
            }
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Something went wrong")
        } finally {
            setLoading(false)
        }
    }

    const familyName = preview?.family_name ?? "the family"

    return (
        <div style={{ width: "100%", maxWidth: 500, animation: "fadeUp 0.4s ease both" }}>
            {/* Context pill */}
            <div style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)",
                borderRadius: 40, padding: "8px 16px",
                border: "1px solid rgba(255,255,255,0.6)", marginBottom: 28,
                boxShadow: "0 4px 20px rgba(0,0,0,0.07)",
            }}>
                <span style={{ fontSize: 22 }}>👨‍👩‍👧‍👦</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#555" }}>
                    Joining <span style={{ color: "#2E7D32" }}>{familyName}</span>
                </span>
            </div>

            <div style={{ background: "#fff", borderRadius: 28, overflow: "hidden", boxShadow: "0 24px 72px rgba(0,0,0,0.14), 0 4px 20px rgba(0,0,0,0.06)" }}>
                {/* Top bar */}
                <div style={{ background: "linear-gradient(145deg, #4CAF50, #2E7D32)", padding: "28px 40px", textAlign: "center" }}>
                    <div style={{ width: 60, height: 60, borderRadius: 18, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", border: "2px solid rgba(255,255,255,0.3)" }}>
                        <TreePine size={28} color="#fff" strokeWidth={1.8} />
                    </div>
                    <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 4, letterSpacing: -0.3 }}>One last step</h2>
                    <p style={{ fontSize: 14, color: "rgba(255,255,255,0.8)" }}>
                        {mode === "new" ? "Create an account to join your family tree" : "Sign in to accept your invitation"}
                    </p>
                </div>

                {/* Form */}
                <div style={{ padding: "32px 40px 36px" }}>
                    {/* Toggle */}
                    <div style={{ display: "flex", background: "#F0F0F0", borderRadius: 14, padding: 4, marginBottom: 26 }}>
                        {(["new", "existing"] as AuthMode[]).map(m => (
                            <button key={m} onClick={() => setMode(m)} style={{
                                flex: 1, padding: "11px 8px", borderRadius: 11, border: "none",
                                background: mode === m ? "#fff" : "transparent",
                                color: mode === m ? "#1A1A2E" : "#888",
                                fontWeight: mode === m ? 700 : 500, fontSize: 13.5, cursor: "pointer",
                                boxShadow: mode === m ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                                transition: "all 0.2s", whiteSpace: "nowrap",
                            }}>
                                {m === "new" ? "New to Shajarah" : "I have an account"}
                            </button>
                        ))}
                    </div>

                    {/* Fields */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
                        {mode === "new" && (
                            <>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                    {[
                                        { ph: "First name", val: firstName, set: setFirstName },
                                        { ph: "Last name", val: lastName, set: setLastName },
                                    ].map(f => (
                                        <div key={f.ph} style={{ display: "flex", alignItems: "center", gap: 10, background: "#F7F5F0", borderRadius: 12, padding: "14px 16px", border: "1.5px solid #EBEBEB" }}>
                                            <User size={16} color="#9E9E9E" />
                                            <input type="text" placeholder={f.ph} value={f.val} onChange={e => f.set(e.target.value)}
                                                style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 14, color: "#1A1A2E" }} />
                                        </div>
                                    ))}
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                    {(["male", "female"] as const).map(g => (
                                        <button key={g} type="button" onClick={() => setGender(g)} style={{
                                            padding: "12px", borderRadius: 12, border: `1.5px solid ${gender === g ? "#4CAF50" : "#EBEBEB"}`,
                                            background: gender === g ? "#E8F5E9" : "#F7F5F0",
                                            color: gender === g ? "#2E7D32" : "#888",
                                            fontSize: 14, fontWeight: gender === g ? 700 : 500, cursor: "pointer",
                                            display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                                            transition: "all 0.15s",
                                        }}>
                                            {g === "male" ? "♂ Male" : "♀ Female"}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                        <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#F0F8F0", borderRadius: 12, padding: "14px 16px", border: "1.5px solid #C8E6C9" }}>
                            <Mail size={17} color="#4CAF50" />
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                                style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 15, color: "#1A1A2E", fontWeight: 500 }} />
                            {preview?.invited_email && (
                                <div style={{ background: "#E8F5E9", borderRadius: 6, padding: "3px 8px", fontSize: 10, fontWeight: 700, color: "#2E7D32" }}>PRE-FILLED</div>
                            )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#F7F5F0", borderRadius: 12, padding: "14px 16px", border: "1.5px solid #EBEBEB" }}>
                            <Lock size={17} color="#9E9E9E" />
                            <input type={showPass ? "text" : "password"}
                                placeholder={mode === "new" ? "Create a password" : "Your password"}
                                value={password} onChange={e => setPass(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                                style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 15, color: "#1A1A2E" }} />
                            <button onClick={() => setShowPass(s => !s)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#9E9E9E" }}>
                                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {error && <p style={{ fontSize: 13, color: "#F44336", marginBottom: 14, textAlign: "center" }}>{error}</p>}

                    <button onClick={handleSubmit} disabled={loading} style={{
                        width: "100%", padding: "17px",
                        background: loading ? "#A5D6A7" : "linear-gradient(135deg, #4CAF50, #2E7D32)",
                        color: "#fff", border: "none", borderRadius: 16,
                        fontSize: 16, fontWeight: 800, cursor: loading ? "wait" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                        boxShadow: loading ? "none" : "0 8px 24px rgba(76,175,80,0.4)", transition: "all 0.2s",
                    }}>
                        {loading ? (
                            <><div style={{ width: 18, height: 18, borderRadius: "50%", border: "2.5px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite" }} /> Joining family…</>
                        ) : (
                            <>{mode === "new" ? "Create Account & Join" : "Sign In & Accept"}<ArrowRight size={18} /></>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Stage 3: Connect ──────────────────────────────────────────────────────────

function ConnectStage({ ownerName, ownerPersonId, familyName, onDone }: {
    ownerName: string
    ownerPersonId: string
    familyName: string
    onDone: () => void
}) {
    const [selected, setSelected] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const handleConnect = async () => {
        if (!selected || !ownerPersonId) { onDone(); return }
        setLoading(true)
        setError("")
        try {
            const myPersonId = getPersonId()
            if (!myPersonId) throw new Error("Could not find your profile")
            const res = await apiFetch(`${API_BASE}/relationships`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    person1_id: ownerPersonId,
                    person2_id: myPersonId,
                    relation_type: selected.toLowerCase(),
                }),
            })
            if (!res.ok) {
                const d = await res.json()
                throw new Error(d.error ?? "Failed to create relationship")
            }
            onDone()
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Something went wrong")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ width: "100%", maxWidth: 500, animation: "fadeUp 0.4s ease both" }}>
            <div style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)",
                borderRadius: 40, padding: "8px 16px",
                border: "1px solid rgba(255,255,255,0.6)", marginBottom: 28,
                boxShadow: "0 4px 20px rgba(0,0,0,0.07)",
            }}>
                <span style={{ fontSize: 22 }}>🌳</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#555" }}>
                    Connect to <span style={{ color: "#2E7D32" }}>{familyName}</span>
                </span>
            </div>

            <div style={{ background: "#fff", borderRadius: 28, overflow: "hidden", boxShadow: "0 24px 72px rgba(0,0,0,0.14), 0 4px 20px rgba(0,0,0,0.06)" }}>
                <div style={{ background: "linear-gradient(145deg, #4CAF50, #2E7D32)", padding: "28px 40px", textAlign: "center" }}>
                    <div style={{ width: 60, height: 60, borderRadius: 18, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", border: "2px solid rgba(255,255,255,0.3)" }}>
                        <Link2 size={28} color="#fff" strokeWidth={1.8} />
                    </div>
                    <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 4, letterSpacing: -0.3 }}>One more thing</h2>
                    <p style={{ fontSize: 14, color: "rgba(255,255,255,0.85)" }}>
                        How are you related to <strong style={{ color: "#fff" }}>{ownerName || "the family owner"}</strong>?
                    </p>
                </div>

                <div style={{ padding: "28px 32px 32px" }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#BDBDBD", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 14 }}>
                        Select your relationship
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 20 }}>
                        {RELATIONSHIPS.map(rel => (
                            <button
                                key={rel}
                                onClick={() => setSelected(rel)}
                                style={{
                                    padding: "11px 8px", borderRadius: 12,
                                    border: `1.5px solid ${selected === rel ? "#4CAF50" : "#EBEBEB"}`,
                                    background: selected === rel ? "#E8F5E9" : "#FAFAFA",
                                    color: selected === rel ? "#2E7D32" : "#555",
                                    fontSize: 13, fontWeight: selected === rel ? 700 : 500,
                                    cursor: "pointer", transition: "all 0.15s",
                                }}
                            >
                                {rel}
                            </button>
                        ))}
                    </div>

                    {error && <p style={{ fontSize: 13, color: "#F44336", marginBottom: 12, textAlign: "center" }}>{error}</p>}

                    <button
                        onClick={handleConnect}
                        disabled={loading}
                        style={{
                            width: "100%", padding: "16px",
                            background: loading ? "#A5D6A7" : "linear-gradient(135deg, #4CAF50, #2E7D32)",
                            color: "#fff", border: "none", borderRadius: 16,
                            fontSize: 15, fontWeight: 800, cursor: loading ? "wait" : "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                            boxShadow: loading ? "none" : "0 8px 24px rgba(76,175,80,0.4)", marginBottom: 10,
                        }}
                    >
                        {loading
                            ? <><div style={{ width: 18, height: 18, borderRadius: "50%", border: "2.5px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite" }} /> Connecting…</>
                            : <>{selected ? "Connect & Continue" : "Skip for now"} <ArrowRight size={18} /></>
                        }
                    </button>
                    <button
                        onClick={onDone}
                        style={{ width: "100%", padding: "12px", background: "transparent", border: "none", color: "#BDBDBD", fontSize: 13, cursor: "pointer" }}
                    >
                        I'll do this later
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Stage 4: Success ──────────────────────────────────────────────────────────

function SuccessStage({ familyName, invitedAs, onGoToTree }: {
    familyName: string; invitedAs: string; onGoToTree: () => void
}) {
    return (
        <div style={{ width: "100%", maxWidth: 520, textAlign: "center", animation: "fadeUp 0.5s ease both" }}>
            <div style={{
                width: 110, height: 110, borderRadius: "50%",
                background: "linear-gradient(135deg, #4CAF50, #2E7D32)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 32px",
                boxShadow: "0 12px 40px rgba(76,175,80,0.45)",
                animation: "popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both",
            }}>
                <Check size={52} color="#fff" strokeWidth={3} />
            </div>

            <h1 style={{ fontSize: 36, fontWeight: 900, color: "#fff", letterSpacing: -0.8, marginBottom: 12, lineHeight: 1.1, textShadow: "0 2px 16px rgba(0,0,0,0.15)" }}>
                You're in the family! 🎉
            </h1>
            <p style={{ fontSize: 17, color: "rgba(255,255,255,0.88)", lineHeight: 1.6, marginBottom: 40, maxWidth: 400, margin: "0 auto 40px" }}>
                Welcome to <strong style={{ color: "#fff" }}>{familyName}</strong>!
                You're now connected as <strong style={{ color: "#fff" }}>{invitedAs}</strong>.
            </p>

            {/* What's next */}
            <div style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", borderRadius: 20, padding: "20px 24px", marginBottom: 32, textAlign: "left", border: "1px solid rgba(255,255,255,0.2)" }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 14 }}>What's next?</p>
                {[
                    { icon: "👤", text: "Complete your profile to appear on the tree" },
                    { icon: "🌳", text: "Explore the interactive family tree" },
                    { icon: "📸", text: "Add memories and photos" },
                ].map((item, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: i < 2 ? 12 : 0 }}>
                        <span style={{ fontSize: 20, flexShrink: 0 }}>{item.icon}</span>
                        <span style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>{item.text}</span>
                        <ChevronRight size={14} color="rgba(255,255,255,0.4)" style={{ marginLeft: "auto", flexShrink: 0 }} />
                    </div>
                ))}
            </div>

            <button
                onClick={onGoToTree}
                style={{
                    width: "100%", padding: "18px", background: "#fff",
                    color: "#2E7D32", border: "none", borderRadius: 18,
                    fontSize: 17, fontWeight: 800, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                    boxShadow: "0 8px 28px rgba(0,0,0,0.15)", transition: "transform 0.15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-2px)")}
                onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
            >
                <TreePine size={20} color="#4CAF50" /> Open My Family Tree <ArrowRight size={18} />
            </button>
        </div>
    )
}

// ── Main ──────────────────────────────────────────────────────────────────────

function AcceptContent() {
    const router = useRouter()
    const params = useSearchParams()
    const token = params.get("token") ?? ""
    const familyId = params.get("family") ?? ""

    const [stage, setStage] = useState<Stage>("preview")
    const [preview, setPreview] = useState<InvitationPreview | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [declined, setDeclined] = useState(false)
    const [showDeclineModal, setShowDeclineModal] = useState(false)
    const [joinedFamilyId, setJoinedFamilyId] = useState("")
    const [ownerPersonId, setOwnerPersonId] = useState("")
    const [ownerName, setOwnerName] = useState("")

    useEffect(() => {
        if (!token && !familyId) {
            setError("Invalid invitation link.")
            setLoading(false)
            return
        }
        if (token) {
            getInvitationPreview(token)
                .then(p => { setPreview(p); setLoading(false) })
                .catch(e => { setError(e.message); setLoading(false) })
        } else {
            setLoading(false) // family share-link flow — no preview data needed
        }
    }, [token, familyId])

    const handleAccept = async () => {
        if (!isAuthenticated()) {
            setStage("auth")
            return
        }
        try {
            if (token) {
                const result = await acceptInvitation(token)
                setJoinedFamilyId(result.family_id)
                setStage("success")
            } else {
                const result = await joinFamilyByLink(familyId)
                setJoinedFamilyId(result.family_id)
                // For share-link joins, offer the connect step if the owner is known.
                if (result.owner_person_id) {
                    setOwnerPersonId(result.owner_person_id)
                    setOwnerName(result.owner_name)
                    setStage("connect")
                } else {
                    setStage("success")
                }
            }
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to join family")
        }
    }

    const handleAuthSuccess = (ownerPid?: string, ownerN?: string) => {
        setJoinedFamilyId(preview?.family_id ?? familyId)
        if (ownerPid) {
            setOwnerPersonId(ownerPid)
            setOwnerName(ownerN ?? "")
            setStage("connect")
        } else {
            setStage("success")
        }
    }

    const bgColors: Record<Stage, string> = {
        preview: "radial-gradient(ellipse at 50% -10%, #C8E6C9 0%, #F0F7F0 40%, #F7F5F0 100%)",
        auth:    "radial-gradient(ellipse at 30% -10%, #C8E6C9 0%, #F0F7F0 40%, #F7F5F0 100%)",
        connect: "radial-gradient(ellipse at 70% -10%, #C8E6C9 0%, #F0F7F0 40%, #F7F5F0 100%)",
        success: "linear-gradient(160deg, #2E7D32 0%, #4CAF50 50%, #66BB6A 100%)",
    }

    if (loading) {
        return (
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: bgColors.preview }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid #C8E6C9", borderTopColor: "#4CAF50", animation: "spin 0.8s linear infinite" }} />
            </div>
        )
    }

    if (error) {
        return (
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: bgColors.preview, padding: 24 }}>
                <div style={{ background: "#fff", borderRadius: 24, padding: "48px 44px", maxWidth: 400, width: "100%", textAlign: "center", boxShadow: "0 24px 72px rgba(0,0,0,0.12)" }}>
                    <div style={{ fontSize: 56, marginBottom: 16 }}>🔗</div>
                    <h2 style={{ fontSize: 22, fontWeight: 800, color: "#1A1A2E", marginBottom: 8 }}>Invitation Error</h2>
                    <p style={{ fontSize: 15, color: "#888", marginBottom: 28 }}>{error}</p>
                    <button onClick={() => router.push("/families")} style={{ padding: "14px 32px", background: "linear-gradient(135deg, #4CAF50, #2E7D32)", color: "#fff", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                        Go to Families
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div style={{
            minHeight: "100vh", background: bgColors[stage],
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: "48px 24px", transition: "background 0.6s ease",
            position: "relative", overflow: "hidden",
        }}>
            {/* Confetti */}
            {stage === "success" && (
                <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
                    <Confetti />
                </div>
            )}

            {/* Decorative blobs */}
            {stage !== "success" && (
                <>
                    <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "rgba(76,175,80,0.07)", top: -120, right: -80, pointerEvents: "none" }} />
                    <div style={{ position: "absolute", width: 280, height: 280, borderRadius: "50%", background: "rgba(76,175,80,0.05)", bottom: -80, left: -60, pointerEvents: "none" }} />
                </>
            )}

            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32, position: "relative", zIndex: 1 }}>
                <div style={{ width: 36, height: 36, borderRadius: 11, background: stage === "success" ? "rgba(255,255,255,0.25)" : "linear-gradient(135deg, #4CAF50, #2E7D32)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: stage === "success" ? "none" : "0 4px 14px rgba(76,175,80,0.35)" }}>
                    <span style={{ fontSize: 20 }}>🌿</span>
                </div>
                <span style={{ fontSize: 18, fontWeight: 800, color: stage === "success" ? "#fff" : "#1A1A2E", letterSpacing: -0.4 }}>Shajarah</span>
            </div>

            {/* Stage content */}
            <div style={{ position: "relative", zIndex: 1, width: "100%", display: "flex", justifyContent: "center" }}>
                {declined ? (
                    <div style={{ textAlign: "center", maxWidth: 400, animation: "fadeUp 0.4s ease both" }}>
                        <div style={{ fontSize: 72, marginBottom: 20 }}>🙏</div>
                        <h2 style={{ fontSize: 26, fontWeight: 800, color: "#1A1A2E", marginBottom: 12 }}>Invitation Declined</h2>
                        <p style={{ fontSize: 15, color: "#888", lineHeight: 1.6, marginBottom: 28 }}>
                            You've declined the invitation to join <strong>{preview?.family_name}</strong>.
                        </p>
                        <button onClick={() => router.push("/families")} style={{ padding: "14px 32px", background: "linear-gradient(135deg, #4CAF50, #2E7D32)", color: "#fff", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "0 6px 20px rgba(76,175,80,0.35)" }}>
                            Go to Shajarah
                        </button>
                    </div>
                ) : stage === "preview" ? (
                    <PreviewStage
                        preview={preview}
                        familyId={familyId}
                        onAccept={handleAccept}
                        onDecline={() => setShowDeclineModal(true)}
                    />
                ) : stage === "auth" ? (
                    <AuthStage
                        preview={preview}
                        familyId={familyId}
                        token={token}
                        onSuccess={handleAuthSuccess}
                    />
                ) : stage === "connect" ? (
                    <ConnectStage
                        ownerName={ownerName}
                        ownerPersonId={ownerPersonId}
                        familyName={preview?.family_name ?? "the family"}
                        onDone={() => setStage("success")}
                    />
                ) : (
                    <SuccessStage
                        familyName={preview?.family_name ?? "the family"}
                        invitedAs={preview?.invited_as ?? "member"}
                        onGoToTree={() => router.push(joinedFamilyId ? `/family-tree/${joinedFamilyId}` : "/families")}
                    />
                )}
            </div>

            {/* Stage dots */}
            {!declined && stage !== "success" && (
                <div style={{ display: "flex", gap: 8, marginTop: 32, position: "relative", zIndex: 1 }}>
                    {(["preview", "auth", "connect", "success"] as Stage[]).map(s => (
                        <div key={s} style={{ width: s === stage ? 24 : 8, height: 8, borderRadius: 4, background: s === stage ? "#4CAF50" : "rgba(76,175,80,0.25)", transition: "all 0.25s" }} />
                    ))}
                </div>
            )}

            {/* Decline modal */}
            {showDeclineModal && (
                <DeclineModal
                    familyName={preview?.family_name ?? "this family"}
                    onConfirm={() => { setShowDeclineModal(false); setDeclined(true) }}
                    onCancel={() => setShowDeclineModal(false)}
                />
            )}

            <style>{`
                @keyframes fadeUp { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }
                @keyframes popIn  { from { opacity:0; transform:scale(0.4) } to { opacity:1; transform:scale(1) } }
                @keyframes spin   { to { transform:rotate(360deg) } }
                @keyframes confettiFall { 0% { transform:translateY(0) rotate(0deg); opacity:1 } 100% { transform:translateY(100vh) rotate(720deg); opacity:0 } }
            `}</style>
        </div>
    )
}

export default function AcceptInvitationPage() {
    return (
        <Suspense fallback={
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(ellipse at 50% -10%, #C8E6C9 0%, #F0F7F0 40%, #F7F5F0 100%)" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid #C8E6C9", borderTopColor: "#4CAF50", animation: "spin 0.8s linear infinite" }} />
            </div>
        }>
            <AcceptContent />
        </Suspense>
    )
}
