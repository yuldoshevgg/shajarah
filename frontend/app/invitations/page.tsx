"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
    Check, X, ArrowRight, Users, GitBranch,
    Clock, Inbox, Heart, CheckCheck,
    MailOpen, Bell, TreePine, RefreshCw, Shield,
} from "lucide-react"
import AppSidebar from "@/components/AppSidebar"
import { isAuthenticated } from "@/lib/auth"
import { getNotifications, markRead, Notification } from "@/services/notificationService"
import { getInvitationPreview, acceptInvitation } from "@/services/invitationService"

// ── Types ─────────────────────────────────────────────────────────────────────

type InviteStatus = "pending" | "accepted" | "declined"

interface InviteData {
    notifId: string
    token: string
    familyId: string
    familyName: string
    inviterName: string
    invitedAs: string
    memberCount: number
    status: InviteStatus
    receivedAt: string
    read: boolean
    colorIdx: number
}

// ── Palette ───────────────────────────────────────────────────────────────────

const PALETTE = [
    { bg: "#5C6BC0", end: "#3949AB" },
    { bg: "#26A69A", end: "#00695C" },
    { bg: "#EF6C00", end: "#BF360C" },
    { bg: "#7B1FA2", end: "#4A148C" },
    { bg: "#C2185B", end: "#880E4F" },
    { bg: "#4CAF50", end: "#2E7D32" },
]
const EMOJIS = ["🏡", "🌿", "🦅", "🌙", "🌸", "👨‍👩‍👧‍👦"]

function palette(idx: number) { return PALETTE[idx % PALETTE.length] }
function emoji(idx: number) { return EMOJIS[idx % EMOJIS.length] }

function formatAge(dateStr: string): string {
    const d = new Date(dateStr)
    const diff = Date.now() - d.getTime()
    const h = diff / 3_600_000
    if (h < 1) return "Just now"
    if (h < 24) return `${Math.floor(h)} hours ago`
    const days = Math.floor(h / 24)
    if (days === 1) return "Yesterday"
    if (days < 7) return `${days} days ago`
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`
    return d.toLocaleDateString()
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_META: Record<InviteStatus, { label: string; bg: string; text: string; Icon: React.ElementType }> = {
    pending:  { label: "Pending",  bg: "#FFF8E1", text: "#F57F17", Icon: Clock },
    accepted: { label: "Accepted", bg: "#E8F5E9", text: "#2E7D32", Icon: Check },
    declined: { label: "Declined", bg: "#FFEBEE", text: "#C62828", Icon: X },
}

function StatusBadge({ status }: { status: InviteStatus }) {
    const m = STATUS_META[status]
    return (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: m.bg, color: m.text, borderRadius: 20, padding: "4px 10px", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
            <m.Icon size={10} strokeWidth={3} />
            {m.label}
        </div>
    )
}

// ── List item ─────────────────────────────────────────────────────────────────

function InviteListItem({ inv, selected, onSelect, onQuickAccept, onQuickDecline }: {
    inv: InviteData; selected: boolean
    onSelect: () => void
    onQuickAccept: (e: React.MouseEvent) => void
    onQuickDecline: (e: React.MouseEvent) => void
}) {
    const [hovered, setHovered] = useState(false)
    const { bg, end } = palette(inv.colorIdx)

    return (
        <div
            onClick={onSelect}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                padding: "16px 18px", cursor: "pointer",
                background: selected ? "#F0F8F0" : hovered ? "#FAFAFA" : "#fff",
                borderLeft: `3px solid ${selected ? bg : "transparent"}`,
                borderBottom: "1px solid #F5F5F5",
                transition: "background 0.13s, border-color 0.13s",
            }}
        >
            <div style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
                {/* Family avatar */}
                <div style={{
                    width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                    background: `linear-gradient(135deg, ${bg}, ${end})`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 24, boxShadow: `0 3px 12px ${bg}35`,
                }}>
                    {emoji(inv.colorIdx)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#1A1A2E", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {inv.familyName}
                        </p>
                        <StatusBadge status={inv.status} />
                    </div>
                    <p style={{ fontSize: 12.5, color: "#777", marginBottom: 6 }}>
                        By <span style={{ fontWeight: 600, color: "#555" }}>{inv.inviterName}</span>
                        {" · "}
                        <span style={{ background: "#F5F5F5", borderRadius: 4, padding: "1px 6px", fontSize: 11, fontWeight: 600, color: "#666" }}>
                            {inv.invitedAs}
                        </span>
                    </p>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <Users size={12} color="#BDBDBD" />
                            <span style={{ fontSize: 12, color: "#BDBDBD" }}>{inv.memberCount} members</span>
                        </div>
                        <span style={{ fontSize: 11, color: "#BDBDBD" }}>{inv.receivedAt}</span>
                    </div>

                    {/* Quick actions */}
                    {inv.status === "pending" && (hovered || selected) && (
                        <div style={{ display: "flex", gap: 7, marginTop: 10 }} onClick={e => e.stopPropagation()}>
                            <button onClick={onQuickAccept} style={{
                                flex: 1, padding: "7px",
                                background: `linear-gradient(135deg, ${bg}, ${end})`,
                                color: "#fff", border: "none", borderRadius: 8,
                                fontSize: 12, fontWeight: 700, cursor: "pointer",
                                display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                                boxShadow: `0 3px 10px ${bg}40`,
                            }}>
                                <Check size={12} strokeWidth={3} /> Accept
                            </button>
                            <button onClick={onQuickDecline} style={{
                                padding: "7px 12px", background: "#FFF5F5", color: "#EF5350",
                                border: "1px solid #FFCDD2", borderRadius: 8,
                                fontSize: 12, fontWeight: 700, cursor: "pointer",
                                display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                            }}>
                                <X size={12} strokeWidth={3} /> Decline
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ── Detail panel ──────────────────────────────────────────────────────────────

function DetailPanel({ inv, onAccept, onDecline, onGoToTree }: {
    inv: InviteData
    onAccept: () => void
    onDecline: () => void
    onGoToTree: () => void
}) {
    const { bg, end } = palette(inv.colorIdx)
    const isPending = inv.status === "pending"
    const isAccepted = inv.status === "accepted"
    const isDeclined = inv.status === "declined"

    return (
        <div style={{ flex: 1, height: "100%", overflowY: "auto", background: "#FAFAFA", display: "flex", flexDirection: "column" }}>
            {/* Hero */}
            <div style={{
                background: `linear-gradient(145deg, ${bg}, ${end})`,
                padding: "44px 48px 52px", position: "relative", overflow: "hidden",
            }}>
                <div style={{ position: "absolute", width: 320, height: 320, borderRadius: "50%", background: "rgba(255,255,255,0.06)", top: -100, right: -80, pointerEvents: "none" }} />
                <div style={{ position: "absolute", width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.04)", bottom: -60, left: -40, pointerEvents: "none" }} />
                <div style={{ position: "relative", zIndex: 1, display: "flex", gap: 28, alignItems: "flex-start" }}>
                    <div style={{
                        width: 90, height: 90, borderRadius: 26, flexShrink: 0,
                        background: "rgba(255,255,255,0.2)", backdropFilter: "blur(4px)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 46, border: "2px solid rgba(255,255,255,0.3)",
                        boxShadow: "0 8px 28px rgba(0,0,0,0.15)",
                    }}>
                        {emoji(inv.colorIdx)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                            <h1 style={{ fontSize: 28, fontWeight: 900, color: "#fff", letterSpacing: -0.5 }}>{inv.familyName}</h1>
                            {!isPending && (
                                <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                                    {isAccepted ? <><Check size={11} strokeWidth={3} /> Accepted</> : <><X size={11} strokeWidth={3} /> Declined</>}
                                </div>
                            )}
                        </div>
                        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.82)", lineHeight: 1.55, marginBottom: 18 }}>
                            {inv.inviterName} invited you to join as <strong style={{ color: "#fff" }}>{inv.invitedAs}</strong>
                        </p>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            {[
                                { Icon: Users, label: `${inv.memberCount} Members` },
                                { Icon: GitBranch, label: "Family Tree" },
                                { Icon: Clock, label: `Received ${inv.receivedAt}` },
                            ].map(({ Icon, label }) => (
                                <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "6px 14px" }}>
                                    <Icon size={13} color="rgba(255,255,255,0.85)" />
                                    <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Body */}
            <div style={{ padding: "32px 48px", display: "flex", flexDirection: "column", gap: 24 }}>
                {/* Inviter card */}
                <div style={{ background: "#fff", borderRadius: 18, padding: "22px 24px", border: "1px solid #F0F0F0", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{
                            width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
                            background: `linear-gradient(135deg, ${bg}, ${end})`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 18, fontWeight: 700, color: "#fff",
                        }}>
                            {inv.inviterName[0]?.toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 14, fontWeight: 700, color: "#1A1A2E" }}>{inv.inviterName}</p>
                            <p style={{ fontSize: 12, color: "#9E9E9E" }}>
                                Invited you as <strong style={{ color: "#555" }}>{inv.invitedAs}</strong>
                            </p>
                        </div>
                        <div style={{ background: "#F5F5F5", borderRadius: 6, padding: "3px 10px", fontSize: 11, color: "#BDBDBD", fontWeight: 600 }}>
                            {inv.receivedAt}
                        </div>
                    </div>
                </div>

                {/* Two-col: what you get */}
                <div style={{ background: "#fff", borderRadius: 18, padding: "22px 24px", border: "1px solid #F0F0F0", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#BDBDBD", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 16 }}>What you get</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        {["🌳 Interactive family tree", "📸 Family memories & photos", "🔔 Birthday reminders", "🧬 Relationship finder"].map(perk => (
                            <div key={perk} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div style={{ width: 22, height: 22, borderRadius: "50%", background: `${bg}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <Check size={11} color={bg} strokeWidth={3} />
                                </div>
                                <span style={{ fontSize: 13, color: "#555" }}>{perk}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Expiry notice */}
                {isPending && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#FFFDE7", borderRadius: 12, padding: "12px 18px", border: "1px solid #FFE082" }}>
                        <Shield size={16} color="#F9A825" style={{ flexShrink: 0 }} />
                        <p style={{ fontSize: 13, color: "#795548" }}>
                            This invitation expires in <strong>5 days</strong>. Respond before it's gone.
                        </p>
                    </div>
                )}

                {/* Actions */}
                {isPending && (
                    <div style={{ display: "flex", gap: 14 }}>
                        <button onClick={onAccept} style={{
                            flex: 1, padding: "18px",
                            background: `linear-gradient(135deg, ${bg}, ${end})`,
                            color: "#fff", border: "none", borderRadius: 16,
                            fontSize: 16, fontWeight: 800, cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                            boxShadow: `0 8px 24px ${bg}50`, transition: "transform 0.15s",
                        }}
                            onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-2px)")}
                            onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
                        >
                            <Heart size={18} fill="white" strokeWidth={0} /> Accept Invitation <ArrowRight size={17} />
                        </button>
                        <button onClick={onDecline} style={{
                            padding: "18px 28px", background: "#fff", color: "#BDBDBD",
                            border: "1.5px solid #E0E0E0", borderRadius: 16,
                            fontSize: 15, fontWeight: 600, cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                            transition: "all 0.15s",
                        }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = "#EF5350"; e.currentTarget.style.color = "#EF5350" }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = "#E0E0E0"; e.currentTarget.style.color = "#BDBDBD" }}
                        >
                            <X size={16} /> Decline
                        </button>
                    </div>
                )}

                {isAccepted && (
                    <div style={{ background: "linear-gradient(135deg, #E8F5E9, #F1F8E9)", borderRadius: 18, padding: "28px 32px", border: "1px solid #C8E6C9", textAlign: "center" }}>
                        <div style={{ width: 60, height: 60, borderRadius: "50%", background: "linear-gradient(135deg, #4CAF50, #2E7D32)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: "0 6px 20px rgba(76,175,80,0.35)" }}>
                            <Check size={28} color="#fff" strokeWidth={3} />
                        </div>
                        <h3 style={{ fontSize: 18, fontWeight: 800, color: "#2E7D32", marginBottom: 6 }}>You're a member!</h3>
                        <p style={{ fontSize: 14, color: "#555", marginBottom: 20 }}>You joined {inv.familyName} {inv.receivedAt}.</p>
                        <button onClick={onGoToTree} style={{
                            padding: "13px 28px", background: "linear-gradient(135deg, #4CAF50, #2E7D32)",
                            color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer",
                            display: "inline-flex", alignItems: "center", gap: 8, boxShadow: "0 4px 14px rgba(76,175,80,0.35)",
                        }}>
                            <TreePine size={16} /> Open Family Tree
                        </button>
                    </div>
                )}

                {isDeclined && (
                    <div style={{ background: "#FFF5F5", borderRadius: 18, padding: "28px 32px", border: "1px solid #FFCDD2", textAlign: "center" }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>😔</div>
                        <h3 style={{ fontSize: 18, fontWeight: 800, color: "#C62828", marginBottom: 6 }}>Invitation Declined</h3>
                        <p style={{ fontSize: 14, color: "#888", marginBottom: 20, lineHeight: 1.6 }}>
                            You declined this invitation. {inv.inviterName} can send a new invite if you change your mind.
                        </p>
                        <button style={{ padding: "11px 24px", background: "#fff", color: "#EF5350", border: "1.5px solid #FFCDD2", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 }}>
                            <RefreshCw size={14} /> Request New Invite
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

// ── Empty detail state ────────────────────────────────────────────────────────

function EmptyDetail() {
    return (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#FAFAFA", gap: 14, padding: 40 }}>
            <div style={{ width: 80, height: 80, borderRadius: 24, background: "#F0F4FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>✉️</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#BDBDBD" }}>Select an invitation</h3>
            <p style={{ fontSize: 14, color: "#D0D0D0", textAlign: "center", maxWidth: 260, lineHeight: 1.6 }}>
                Click any invitation on the left to see the full details here.
            </p>
        </div>
    )
}

// ── Confirm modal ─────────────────────────────────────────────────────────────

type ConfirmAction = { type: "accept" | "decline"; inv: InviteData } | null

function ConfirmModal({ action, onConfirm, onCancel }: {
    action: ConfirmAction; onConfirm: () => void; onCancel: () => void
}) {
    if (!action) return null
    const { bg, end } = palette(action.inv.colorIdx)
    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={onCancel}>
            <div style={{ background: "#fff", borderRadius: 24, padding: "40px 44px", maxWidth: 400, width: "100%", boxShadow: "0 32px 80px rgba(0,0,0,0.2)", textAlign: "center", animation: "fadeUp 0.22s ease both" }} onClick={e => e.stopPropagation()}>
                {action.type === "accept" ? (
                    <>
                        <div style={{ fontSize: 52, marginBottom: 14 }}>{emoji(action.inv.colorIdx)}</div>
                        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1A1A2E", marginBottom: 8 }}>Accept this invitation?</h2>
                        <p style={{ fontSize: 14, color: "#888", lineHeight: 1.6, marginBottom: 28 }}>
                            You'll join <strong>{action.inv.familyName}</strong> as <strong>{action.inv.invitedAs}</strong>.
                        </p>
                        <div style={{ display: "flex", gap: 10 }}>
                            <button onClick={onCancel} style={{ flex: 1, padding: "13px", background: "#F5F5F5", color: "#555", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                            <button onClick={onConfirm} style={{ flex: 1, padding: "13px", background: `linear-gradient(135deg, ${bg}, ${end})`, color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Yes, Accept!</button>
                        </div>
                    </>
                ) : (
                    <>
                        <div style={{ fontSize: 52, marginBottom: 14 }}>😔</div>
                        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1A1A2E", marginBottom: 8 }}>Decline this invitation?</h2>
                        <p style={{ fontSize: 14, color: "#888", lineHeight: 1.6, marginBottom: 28 }}>
                            {action.inv.inviterName} can send you a new invite anytime.
                        </p>
                        <div style={{ display: "flex", gap: 10 }}>
                            <button onClick={onCancel} style={{ flex: 1, padding: "13px", background: "#F5F5F5", color: "#555", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Keep It</button>
                            <button onClick={onConfirm} style={{ flex: 1, padding: "13px", background: "#FFEBEE", color: "#C62828", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Yes, Decline</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

// ── Main page ─────────────────────────────────────────────────────────────────

type TabKey = "all" | InviteStatus

export default function InvitationsPage() {
    const router = useRouter()
    const [invites, setInvites] = useState<InviteData[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<TabKey>("all")
    const [confirm, setConfirm] = useState<ConfirmAction>(null)
    const [toast, setToast] = useState<string | null>(null)

    const showToast = (msg: string) => {
        setToast(msg)
        setTimeout(() => setToast(null), 2800)
    }

    useEffect(() => {
        if (!isAuthenticated()) { router.push("/auth/login"); return }
        loadInvitations()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    async function loadInvitations() {
        setLoading(true)
        try {
            const { notifications } = await getNotifications()
            const invNotifs = notifications.filter((n: Notification) => n.type === "invitation")

            const results = await Promise.allSettled(
                invNotifs.map(async (n: Notification, idx: number) => {
                    const parts = n.message.split("|")
                    const token = n.ref || (parts.length === 4 ? parts[3] : "")
                    const inviterName = parts.length >= 1 ? parts[0] : "Someone"
                    const familyName = parts.length >= 2 ? parts[1] : "A Family"
                    const invitedAs = parts.length >= 3 ? parts[2] : "member"

                    let status: InviteStatus = "pending"
                    let memberCount = 0
                    let familyId = n.family_id ?? ""

                    if (token) {
                        try {
                            const preview = await getInvitationPreview(token)
                            status = preview.status === "accepted" ? "accepted" : "pending"
                            memberCount = preview.member_count
                            familyId = preview.family_id
                        } catch {
                            status = "accepted"
                        }
                    }

                    return {
                        notifId: n.id,
                        token,
                        familyId,
                        familyName,
                        inviterName,
                        invitedAs,
                        memberCount,
                        status,
                        receivedAt: formatAge(n.created_at),
                        read: n.read,
                        colorIdx: idx,
                    } as InviteData
                })
            )

            const items = results
                .filter((r): r is PromiseFulfilledResult<InviteData> => r.status === "fulfilled")
                .map(r => r.value)

            setInvites(items)
            if (items.length > 0) setSelectedId(items[0].notifId)
        } catch {
            // ignore
        } finally {
            setLoading(false)
        }
    }

    const pendingCount = invites.filter(i => i.status === "pending").length
    const acceptedCount = invites.filter(i => i.status === "accepted").length
    const declinedCount = invites.filter(i => i.status === "declined").length

    const TABS: { key: TabKey; label: string; count: number }[] = [
        { key: "all",      label: "All",      count: invites.length },
        { key: "pending",  label: "Pending",  count: pendingCount },
        { key: "accepted", label: "Accepted", count: acceptedCount },
        { key: "declined", label: "Declined", count: declinedCount },
    ]

    const filtered = activeTab === "all" ? invites : invites.filter(i => i.status === activeTab)
    const selected = invites.find(i => i.notifId === selectedId) ?? null

    const doAccept = async (inv: InviteData) => {
        try {
            await acceptInvitation(inv.token)
            await markRead(inv.notifId)
        } catch { /* already member is OK */ }
        setInvites(prev => prev.map(i => i.notifId === inv.notifId ? { ...i, status: "accepted" } : i))
        showToast(`🎉 You joined ${inv.familyName}!`)
        setConfirm(null)
    }

    const doDecline = async (inv: InviteData) => {
        await markRead(inv.notifId).catch(() => {})
        setInvites(prev => prev.map(i => i.notifId === inv.notifId ? { ...i, status: "declined" } : i))
        showToast("Invitation declined.")
        setConfirm(null)
    }

    const handleAcceptAll = async () => {
        const pending = invites.filter(i => i.status === "pending")
        await Promise.allSettled(pending.map(i => acceptInvitation(i.token).catch(() => {})))
        await Promise.allSettled(pending.map(i => markRead(i.notifId).catch(() => {})))
        setInvites(prev => prev.map(i => i.status === "pending" ? { ...i, status: "accepted" } : i))
        showToast(`🎉 Accepted ${pending.length} invitations!`)
    }

    return (
        <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden" }}>
            <AppSidebar activeSection="invitations" />

            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {/* Toast */}
                {toast && (
                    <div style={{
                        position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
                        background: "#1A1A2E", color: "#fff", borderRadius: 40, padding: "12px 24px",
                        fontSize: 14, fontWeight: 600, boxShadow: "0 8px 28px rgba(0,0,0,0.25)",
                        zIndex: 9999, whiteSpace: "nowrap",
                    }}>
                        {toast}
                    </div>
                )}

                {/* Confirm modal */}
                <ConfirmModal
                    action={confirm}
                    onConfirm={() => confirm && (confirm.type === "accept" ? doAccept(confirm.inv) : doDecline(confirm.inv))}
                    onCancel={() => setConfirm(null)}
                />

                {/* Header */}
                <header style={{
                    background: "#fff", padding: "22px 32px", borderBottom: "1px solid #F0F0F0",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    flexShrink: 0, boxShadow: "0 2px 12px rgba(0,0,0,0.04)", zIndex: 10,
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 13, background: "linear-gradient(135deg, #E8EAF6, #C5CAE9)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Inbox size={22} color="#3949AB" />
                        </div>
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1A1A2E", letterSpacing: -0.5 }}>Invitations</h1>
                                {pendingCount > 0 && (
                                    <div style={{ background: "#FF5252", color: "#fff", borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 800, boxShadow: "0 2px 8px rgba(255,82,82,0.4)" }}>
                                        {pendingCount} new
                                    </div>
                                )}
                            </div>
                            <p style={{ fontSize: 13, color: "#9E9E9E", marginTop: 2 }}>
                                {pendingCount > 0 ? `${pendingCount} invitation${pendingCount > 1 ? "s" : ""} waiting for your response` : "All caught up!"}
                            </p>
                        </div>
                    </div>
                    {pendingCount > 1 && (
                        <button onClick={handleAcceptAll} style={{
                            display: "flex", alignItems: "center", gap: 8,
                            padding: "11px 20px", background: "linear-gradient(135deg, #4CAF50, #2E7D32)",
                            color: "#fff", border: "none", borderRadius: 12,
                            fontSize: 14, fontWeight: 700, cursor: "pointer",
                            boxShadow: "0 4px 16px rgba(76,175,80,0.35)", transition: "transform 0.15s",
                        }}
                            onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-1px)")}
                            onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
                        >
                            <CheckCheck size={16} /> Accept All ({pendingCount})
                        </button>
                    )}
                </header>

                {/* Split layout */}
                <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
                    {/* Left: list */}
                    <div style={{ width: 380, flexShrink: 0, background: "#fff", borderRight: "1px solid #F0F0F0", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                        {/* Tabs */}
                        <div style={{ padding: "14px 16px 0", borderBottom: "1px solid #F5F5F5", flexShrink: 0 }}>
                            <div style={{ display: "flex", gap: 2 }}>
                                {TABS.map(tab => (
                                    <button key={tab.key} onClick={() => { setActiveTab(tab.key); setSelectedId(null) }} style={{
                                        flex: 1, padding: "9px 6px 11px", background: "none",
                                        border: "none", borderBottom: `2.5px solid ${activeTab === tab.key ? "#4CAF50" : "transparent"}`,
                                        color: activeTab === tab.key ? "#2E7D32" : "#9E9E9E",
                                        fontWeight: activeTab === tab.key ? 700 : 500,
                                        fontSize: 12.5, cursor: "pointer",
                                        display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                                        transition: "all 0.15s",
                                    }}>
                                        {tab.label}
                                        {tab.count > 0 && (
                                            <span style={{ background: activeTab === tab.key ? "#E8F5E9" : "#F0F0F0", color: activeTab === tab.key ? "#2E7D32" : "#BDBDBD", borderRadius: 10, padding: "1px 7px", fontSize: 10.5, fontWeight: 700 }}>
                                                {tab.count}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Pending banner */}
                        {activeTab === "all" && pendingCount > 0 && (
                            <div style={{ margin: "12px 14px 4px", background: "linear-gradient(135deg, #E8F5E9, #F1F8E9)", borderRadius: 12, padding: "11px 14px", border: "1px solid #C8E6C9", display: "flex", alignItems: "center", gap: 9, flexShrink: 0 }}>
                                <Bell size={15} color="#4CAF50" style={{ flexShrink: 0 }} />
                                <p style={{ fontSize: 12.5, color: "#2E7D32", fontWeight: 600 }}>
                                    {pendingCount} invitation{pendingCount > 1 ? "s" : ""} waiting — don't leave them hanging!
                                </p>
                            </div>
                        )}

                        {/* List */}
                        <div style={{ flex: 1, overflowY: "auto" }}>
                            {loading ? (
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                                    <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #E8F5E9", borderTopColor: "#4CAF50", animation: "spin 0.8s linear infinite" }} />
                                </div>
                            ) : filtered.length === 0 ? (
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10, padding: 32, textAlign: "center" }}>
                                    <MailOpen size={36} color="#E0E0E0" />
                                    <p style={{ fontSize: 14, color: "#BDBDBD", fontWeight: 600 }}>No invitations here</p>
                                </div>
                            ) : (
                                filtered.map(inv => (
                                    <InviteListItem
                                        key={inv.notifId}
                                        inv={inv}
                                        selected={selectedId === inv.notifId}
                                        onSelect={() => setSelectedId(inv.notifId)}
                                        onQuickAccept={e => { e.stopPropagation(); setSelectedId(inv.notifId); setConfirm({ type: "accept", inv }) }}
                                        onQuickDecline={e => { e.stopPropagation(); setSelectedId(inv.notifId); setConfirm({ type: "decline", inv }) }}
                                    />
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right: detail */}
                    <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
                        {selected ? (
                            <DetailPanel
                                inv={selected}
                                onAccept={() => setConfirm({ type: "accept", inv: selected })}
                                onDecline={() => setConfirm({ type: "decline", inv: selected })}
                                onGoToTree={() => router.push(selected.familyId ? `/family-tree/${selected.familyId}` : "/families")}
                            />
                        ) : (
                            <EmptyDetail />
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fadeUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
                @keyframes spin   { to { transform:rotate(360deg) } }
            `}</style>
        </div>
    )
}
