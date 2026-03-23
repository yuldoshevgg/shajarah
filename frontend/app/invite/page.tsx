"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
    Mail, Send, Link2, Copy, Check, RefreshCw,
    Users, Sparkles, ArrowLeft,
} from "lucide-react"
import { isAuthenticated } from "@/lib/auth"
import { getFamilies, Family } from "@/services/familyService"
import { inviteMember, getInvitations, Invitation } from "@/services/invitationService"
import AppSidebar from "@/components/AppSidebar"

type InviteStatus = "pending" | "accepted" | "expired"

const STATUS_CFG: Record<InviteStatus, { label: string; bg: string; color: string; dot: string }> = {
    pending:  { label: "Pending",  bg: "#FFF8E1", color: "#E65100", dot: "#FFA726" },
    accepted: { label: "Accepted", bg: "#E8F5E9", color: "#2E7D32", dot: "#66BB6A" },
    expired:  { label: "Expired",  bg: "#F5F5F5", color: "#757575", dot: "#BDBDBD" },
}

export default function InvitePage() {
    const router = useRouter()
    const [family, setFamily] = useState<Family | null>(null)
    const [invitations, setInvitations] = useState<Invitation[]>([])
    const [email, setEmail] = useState("")
    const [message, setMessage] = useState("")
    const [copied, setCopied] = useState(false)
    const [sending, setSending] = useState(false)
    const [sentFlash, setSentFlash] = useState(false)
    const [toast, setToast] = useState<string | null>(null)
    const [error, setError] = useState("")
    const [shareLink, setShareLink] = useState("")

    useEffect(() => {
        if (!isAuthenticated()) { router.push("/auth/login"); return }
        getFamilies().then(fs => {
            const f = fs[0]
            if (!f) return
            setFamily(f)
            getInvitations(f.id).then(setInvitations).catch(() => {})
        }).catch(() => {})
    }, [router])

    useEffect(() => {
        if (family?.id) setShareLink(`${window.location.origin}/invitations/accept?family=${family.id}`)
    }, [family?.id])

    const showToast = (msg: string) => {
        setToast(msg)
        setTimeout(() => setToast(null), 2600)
    }

    const valid = email.trim().length > 0 && email.includes("@")

    const handleSend = async () => {
        if (!valid || !family || sending) return
        setError("")
        setSending(true)
        try {
            const inv = await inviteMember(family.id, email.trim(), "viewer")
            setInvitations(prev => [inv, ...prev])
            setEmail("")
            setMessage("")
            setSentFlash(true)
            setTimeout(() => setSentFlash(false), 800)
            showToast("Invitation sent!")
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to send invitation")
        } finally {
            setSending(false)
        }
    }

    const handleCopyLink = () => {
        navigator.clipboard.writeText(shareLink).catch(() => {})
        setCopied(true)
        setTimeout(() => setCopied(false), 2200)
        showToast("Link copied to clipboard!")
    }

    const handleResend = (id: string) => {
        setInvitations(prev => prev.map(inv => inv.id === id ? { ...inv, status: "pending" } : inv))
        showToast("Invitation resent!")
    }

    const pendingCount  = invitations.filter(i => i.status === "pending").length
    const acceptedCount = invitations.filter(i => i.status === "accepted").length

    return (
        <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden" }}>
            <AppSidebar activeSection="invite" activeFamilyId={family?.id} />

            {/* Toast */}
            {toast && (
                <div style={{
                    position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
                    background: "#1A1A2E", color: "#fff", borderRadius: 40, padding: "11px 22px",
                    fontSize: 13.5, fontWeight: 600, boxShadow: "0 8px 28px rgba(0,0,0,0.22)",
                    zIndex: 9999, whiteSpace: "nowrap",
                }}>
                    {toast}
                </div>
            )}

            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

                {/* Header */}
                <div style={{
                    padding: "22px 36px", background: "#fff",
                    borderBottom: "1px solid #F0F0F0",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
                    flexShrink: 0,
                }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                            <button
                                onClick={() => router.back()}
                                style={{ display: "flex", alignItems: "center", gap: 7, background: "none", border: "none", cursor: "pointer", color: "#555", fontSize: 14, fontWeight: 600, padding: 0 }}
                            >
                                <ArrowLeft size={17} />
                            </button>
                            <div>
                                <h1 style={{ fontSize: 24, fontWeight: 900, color: "#1A1A2E", letterSpacing: -0.5 }}>
                                    Invite to Family Tree
                                </h1>
                                <p style={{ fontSize: 14, color: "#9E9E9E", marginTop: 3 }}>
                                    Send an invitation by email or share a link to grow your family tree
                                </p>
                            </div>
                        </div>

                        {/* Quick stats */}
                        <div style={{ display: "flex", gap: 12 }}>
                            {[
                                { label: "Sent",     value: invitations.length, bg: "#F3E5F5", color: "#7B1FA2" },
                                { label: "Accepted", value: acceptedCount,       bg: "#E8F5E9", color: "#2E7D32" },
                                { label: "Pending",  value: pendingCount,        bg: "#FFF8E1", color: "#E65100" },
                            ].map(s => (
                                <div key={s.label} style={{ textAlign: "center", background: s.bg, borderRadius: 12, padding: "9px 18px" }}>
                                    <p style={{ fontSize: 20, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</p>
                                    <p style={{ fontSize: 10.5, color: "#888", marginTop: 2 }}>{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflow: "auto", padding: "32px 36px", background: "#F7F5F0" }}>
                    <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>

                        {/* Two columns: Email + Link */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

                            {/* Email invite card */}
                            <div style={{
                                background: "#fff", borderRadius: 22, padding: "28px",
                                boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid #F0F0F0",
                                display: "flex", flexDirection: "column", gap: 18,
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    <div style={{
                                        width: 42, height: 42, borderRadius: 13,
                                        background: "linear-gradient(135deg, #E8F5E9, #C8E6C9)",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                    }}>
                                        <Mail size={20} color="#2E7D32" />
                                    </div>
                                    <div>
                                        <h2 style={{ fontSize: 16, fontWeight: 800, color: "#1A1A2E" }}>Send by Email</h2>
                                        <p style={{ fontSize: 12, color: "#9E9E9E", marginTop: 1 }}>Invite someone directly to your tree</p>
                                    </div>
                                </div>

                                {/* Email input */}
                                <div>
                                    <label style={{ fontSize: 11.5, fontWeight: 700, color: "#BDBDBD", letterSpacing: 0.7, textTransform: "uppercase", display: "block", marginBottom: 8 }}>
                                        Email address
                                    </label>
                                    <div style={{
                                        display: "flex", alignItems: "center", gap: 10,
                                        background: "#F7F5F0", borderRadius: 12,
                                        border: `1.5px solid ${email && !valid ? "#EF9A9A" : valid ? "#A5D6A7" : "#EBEBEB"}`,
                                        padding: "12px 14px", transition: "border-color 0.2s",
                                    }}>
                                        <Mail size={16} color={valid ? "#4CAF50" : "#C0C0C0"} />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={e => { setEmail(e.target.value); setError("") }}
                                            onKeyDown={e => e.key === "Enter" && handleSend()}
                                            placeholder="family@example.com"
                                            style={{ flex: 1, border: "none", background: "none", outline: "none", fontSize: 14.5, color: "#1A1A2E" }}
                                        />
                                        {valid && <Check size={15} color="#4CAF50" strokeWidth={3} />}
                                    </div>
                                </div>

                                {/* Message */}
                                <div>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                        <label style={{ fontSize: 11.5, fontWeight: 700, color: "#BDBDBD", letterSpacing: 0.7, textTransform: "uppercase" }}>
                                            Personal message
                                        </label>
                                        <span style={{ fontSize: 11, color: "#BDBDBD" }}>optional</span>
                                    </div>
                                    <textarea
                                        value={message}
                                        onChange={e => setMessage(e.target.value)}
                                        placeholder="Hey! I'm building our family tree on Shajarah. Come join us and help me fill in the memories 🌿"
                                        rows={4}
                                        style={{
                                            width: "100%", padding: "12px 14px",
                                            background: "#F7F5F0", border: "1.5px solid #EBEBEB",
                                            borderRadius: 12, fontSize: 13.5, color: "#1A1A2E",
                                            resize: "none", outline: "none", fontFamily: "inherit",
                                            lineHeight: 1.55, boxSizing: "border-box", transition: "border-color 0.2s",
                                        }}
                                        onFocus={e => (e.target.style.borderColor = "#A5D6A7")}
                                        onBlur={e => (e.target.style.borderColor = "#EBEBEB")}
                                    />
                                </div>

                                {error && <p style={{ fontSize: 13, color: "#F44336", marginTop: -8 }}>{error}</p>}

                                {/* Send button */}
                                <button
                                    onClick={handleSend}
                                    disabled={!valid || sending}
                                    style={{
                                        display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
                                        padding: "14px",
                                        background: valid && !sending ? "linear-gradient(135deg, #4CAF50, #2E7D32)" : "#E0E0E0",
                                        color: valid && !sending ? "#fff" : "#AAAAAA",
                                        border: "none", borderRadius: 13,
                                        fontSize: 15, fontWeight: 800,
                                        cursor: valid && !sending ? "pointer" : "not-allowed",
                                        boxShadow: valid && !sending ? "0 6px 18px rgba(76,175,80,0.3)" : "none",
                                        transition: "all 0.2s",
                                    }}
                                >
                                    {sending ? (
                                        <>
                                            <div style={{
                                                width: 16, height: 16, borderRadius: "50%",
                                                border: "2px solid rgba(255,255,255,0.3)",
                                                borderTopColor: "#fff",
                                                animation: "spin 0.7s linear infinite",
                                            }} />
                                            Sending…
                                        </>
                                    ) : (
                                        <><Send size={16} /> Send Invitation</>
                                    )}
                                </button>
                            </div>

                            {/* Share link card */}
                            <div style={{
                                background: "#fff", borderRadius: 22, padding: "28px",
                                boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid #F0F0F0",
                                display: "flex", flexDirection: "column", gap: 18,
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    <div style={{
                                        width: 42, height: 42, borderRadius: 13,
                                        background: "linear-gradient(135deg, #EDE7F6, #D1C4E9)",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                    }}>
                                        <Link2 size={20} color="#6A1B9A" />
                                    </div>
                                    <div>
                                        <h2 style={{ fontSize: 16, fontWeight: 800, color: "#1A1A2E" }}>Share Link</h2>
                                        <p style={{ fontSize: 12, color: "#9E9E9E", marginTop: 1 }}>Anyone with the link can request to join</p>
                                    </div>
                                </div>

                                {/* Link box */}
                                <div>
                                    <label style={{ fontSize: 11.5, fontWeight: 700, color: "#BDBDBD", letterSpacing: 0.7, textTransform: "uppercase", display: "block", marginBottom: 8 }}>
                                        Your family invite link
                                    </label>
                                    <div style={{
                                        display: "flex", alignItems: "center", gap: 10,
                                        background: "#F7F5F0", borderRadius: 12,
                                        border: "1.5px solid #EBEBEB", padding: "12px 14px",
                                    }}>
                                        <Link2 size={15} color="#BDBDBD" style={{ flexShrink: 0 }} />
                                        <span style={{ flex: 1, fontSize: 13, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {shareLink || "Loading…"}
                                        </span>
                                    </div>
                                </div>

                                {/* Copy button */}
                                <button
                                    onClick={handleCopyLink}
                                    style={{
                                        display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
                                        padding: "14px",
                                        background: copied
                                            ? "linear-gradient(135deg, #4CAF50, #2E7D32)"
                                            : "linear-gradient(135deg, #7B1FA2, #4A148C)",
                                        color: "#fff", border: "none", borderRadius: 13,
                                        fontSize: 15, fontWeight: 800, cursor: "pointer",
                                        boxShadow: "0 6px 18px rgba(106,27,154,0.28)",
                                        transition: "all 0.25s",
                                    }}
                                >
                                    {copied
                                        ? <><Check size={16} strokeWidth={3} /> Copied!</>
                                        : <><Copy size={16} /> Copy Link</>}
                                </button>

                                {/* Info note */}
                                <div style={{ background: "#F3E5F5", borderRadius: 12, padding: "14px 16px", border: "1px solid #E1BEE7" }}>
                                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                                        <Sparkles size={15} color="#7B1FA2" style={{ flexShrink: 0, marginTop: 1 }} />
                                        <div>
                                            <p style={{ fontSize: 12.5, fontWeight: 700, color: "#4A148C", marginBottom: 3 }}>How it works</p>
                                            <p style={{ fontSize: 12, color: "#7B1FA2", lineHeight: 1.55 }}>
                                                When someone opens this link, they&apos;ll create an account and you&apos;ll receive a request to connect them to your tree.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* Sent invitations list */}
                        <div style={{
                            background: "#fff", borderRadius: 22, padding: "24px 28px",
                            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                            border: `1.5px solid ${sentFlash ? "#A5D6A7" : "#F0F0F0"}`,
                            transition: "border-color 0.4s",
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: "#E8F5E9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <Users size={17} color="#2E7D32" />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: 15, fontWeight: 800, color: "#1A1A2E" }}>Sent Invitations</h3>
                                    <p style={{ fontSize: 12, color: "#9E9E9E", marginTop: 1 }}>{invitations.length} invitations total</p>
                                </div>
                            </div>

                            {invitations.length === 0 ? (
                                <div style={{ textAlign: "center", padding: "32px", color: "#BDBDBD" }}>
                                    <p style={{ fontSize: 28, marginBottom: 10 }}>📬</p>
                                    <p style={{ fontSize: 14, fontWeight: 600 }}>No invitations sent yet</p>
                                    <p style={{ fontSize: 12, marginTop: 4 }}>Send your first invitation above</p>
                                </div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    {invitations.map(inv => {
                                        const status = (inv.status === "accepted" ? "accepted" : inv.status === "expired" ? "expired" : "pending") as InviteStatus
                                        const cfg = STATUS_CFG[status]
                                        return (
                                            <div
                                                key={inv.id}
                                                style={{
                                                    display: "flex", alignItems: "center", gap: 14,
                                                    padding: "13px 16px",
                                                    background: "#FAFAFA", borderRadius: 14,
                                                    border: `1px solid ${status === "pending" ? "#FFE082" : "#F0F0F0"}`,
                                                }}
                                            >
                                                <div style={{
                                                    width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
                                                    background: status === "accepted"
                                                        ? "linear-gradient(135deg, #4CAF50, #2E7D32)"
                                                        : "linear-gradient(135deg, #BDBDBD, #9E9E9E)",
                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                    fontSize: 17, fontWeight: 800, color: "#fff",
                                                }}>
                                                    {inv.role[0].toUpperCase()}
                                                </div>

                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <p style={{ fontSize: 13.5, fontWeight: 700, color: "#1A1A2E", marginBottom: 2 }}>Invited as {inv.role}</p>
                                                    <p style={{ fontSize: 11, color: "#BDBDBD" }}>Sent {new Date(inv.created_at).toLocaleDateString()}</p>
                                                </div>

                                                <div style={{
                                                    display: "flex", alignItems: "center", gap: 6,
                                                    background: cfg.bg, color: cfg.color,
                                                    borderRadius: 20, padding: "5px 12px",
                                                    fontSize: 11.5, fontWeight: 700, flexShrink: 0,
                                                }}>
                                                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot }} />
                                                    {cfg.label}
                                                </div>

                                                {(status === "pending" || status === "expired") && (
                                                    <button
                                                        onClick={() => handleResend(inv.id)}
                                                        style={{
                                                            display: "flex", alignItems: "center", gap: 5,
                                                            background: "none", border: "1px solid #E0E0E0",
                                                            borderRadius: 8, padding: "6px 12px",
                                                            fontSize: 12, fontWeight: 600, color: "#888", cursor: "pointer",
                                                            transition: "all 0.15s", flexShrink: 0,
                                                        }}
                                                        onMouseEnter={e => { e.currentTarget.style.borderColor = "#4CAF50"; e.currentTarget.style.color = "#4CAF50" }}
                                                        onMouseLeave={e => { e.currentTarget.style.borderColor = "#E0E0E0"; e.currentTarget.style.color = "#888" }}
                                                    >
                                                        <RefreshCw size={11} /> Resend
                                                    </button>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    )
}
