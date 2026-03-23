"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
    TreePine, Bell, ImageIcon, User, Settings,
    UserPlus, Search, ChevronDown, LogOut,
    Check, Plus, Crown,
    X, Sparkles, ArrowRight, Inbox,
} from "lucide-react"
import { getToken, removeToken } from "@/lib/auth"
import { getFamilies, createFamily, Family } from "@/services/familyService"
import { getUnreadCount, getNotifications, Notification } from "@/services/notificationService"
import { apiFetch } from "@/lib/apiFetch"
import API_BASE from "@/services/api"

// Parse a pipe-encoded invitation notification message:
// "<InviterName>|<FamilyName>|<Role>|<Token>"
function parseInviteNotif(n: Notification): { inviterName: string; familyName: string; token: string } | null {
    const parts = n.message.split("|")
    if (parts.length === 4) {
        return { inviterName: parts[0], familyName: parts[1], token: parts[3] }
    }
    return null
}

// ── Helpers ────────────────────────────────────────────────────────────────

const PALETTE = [
    { bg: "#4CAF50", end: "#2E7D32" },
    { bg: "#5C6BC0", end: "#3949AB" },
    { bg: "#FF7043", end: "#E64A19" },
    { bg: "#26A69A", end: "#00796B" },
    { bg: "#AB47BC", end: "#7B1FA2" },
]
const EMOJIS = ["👨‍👩‍👧‍👦", "🏡", "🌿", "🌳", "🏠"]

function familyColor(idx: number) { return PALETTE[idx % PALETTE.length] }
function familyEmoji(idx: number) { return EMOJIS[idx % EMOJIS.length] }

type Role = "Owner" | "Admin" | "Member" | "Viewer"

function toRole(userRole?: string, isOwner?: boolean): Role {
    if (isOwner) return "Owner"
    if (userRole === "admin") return "Admin"
    if (userRole === "editor") return "Member"
    return "Viewer"
}

// ── Role badge ──────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: Role }) {
    const map: Record<Role, { bg: string; text: string }> = {
        Owner:  { bg: "#FFF8E1", text: "#F57F17" },
        Admin:  { bg: "#E8EAF6", text: "#3949AB" },
        Member: { bg: "#E8F5E9", text: "#2E7D32" },
        Viewer: { bg: "#F5F5F5", text: "#757575" },
    }
    const c = map[role]
    return (
        <span style={{
            fontSize: 10, fontWeight: 700, padding: "2px 7px",
            borderRadius: 20, background: c.bg, color: c.text,
            letterSpacing: 0.3, flexShrink: 0,
            display: "flex", alignItems: "center", gap: 3,
        }}>
            {role === "Owner" && <Crown size={9} style={{ flexShrink: 0 }} />}
            {role}
        </span>
    )
}

// ── Create Tree modal ───────────────────────────────────────────────────────

function CreateTreeModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string) => Promise<void> }) {
    const [step, setStep] = useState<"name" | "privacy">("name")
    const [treeName, setTreeName] = useState("")
    const [privacy, setPrivacy] = useState<"private" | "family" | "public">("family")
    const [loading, setLoading] = useState(false)

    const handleCreate = async () => {
        if (!treeName.trim() || loading) return
        setLoading(true)
        await onCreate(treeName.trim())
        setLoading(false)
    }

    return (
        <div
            style={{
                position: "fixed", inset: 0, zIndex: 2000,
                background: "rgba(10,20,10,0.5)", backdropFilter: "blur(8px)",
                display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: "#fff", borderRadius: 24, padding: "44px 48px",
                    width: "100%", maxWidth: 500, position: "relative",
                    boxShadow: "0 40px 100px rgba(0,0,0,0.22)",
                }}
                onClick={e => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    style={{
                        position: "absolute", top: 16, right: 16,
                        width: 32, height: 32, borderRadius: "50%",
                        background: "#F5F5F5", border: "none", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", color: "#888",
                    }}
                >
                    <X size={15} />
                </button>

                {/* Header */}
                <div style={{ textAlign: "center", marginBottom: 32 }}>
                    <div style={{
                        width: 68, height: 68, borderRadius: 20,
                        background: "linear-gradient(135deg, #4CAF50, #2E7D32)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        margin: "0 auto 16px", boxShadow: "0 8px 24px rgba(76,175,80,0.3)",
                    }}>
                        <TreePine size={30} color="#fff" strokeWidth={1.8} />
                    </div>
                    <h2 style={{ fontSize: 22, fontWeight: 800, color: "#1A1A2E", marginBottom: 6, letterSpacing: -0.4 }}>
                        {step === "name" ? "Name Your Family Tree" : "Privacy Settings"}
                    </h2>
                    <p style={{ fontSize: 13.5, color: "#888", lineHeight: 1.5 }}>
                        {step === "name"
                            ? "Give your tree a name — usually your family surname works best."
                            : "Choose who can access and collaborate on this tree."}
                    </p>
                    {/* Step dots */}
                    <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 16 }}>
                        {(["name", "privacy"] as const).map(s => (
                            <div key={s} style={{
                                width: step === s ? 22 : 8, height: 8,
                                borderRadius: 4, transition: "all 0.25s",
                                background: step === s ? "#4CAF50" : "#E0E0E0",
                            }} />
                        ))}
                    </div>
                </div>

                {step === "name" ? (
                    <>
                        <label style={{ fontSize: 12, fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: 0.8, display: "block", marginBottom: 8 }}>
                            Family Tree Name
                        </label>
                        <input
                            autoFocus
                            type="text"
                            placeholder="e.g. Hassan Family, The Nguyens…"
                            value={treeName}
                            onChange={e => setTreeName(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && treeName.trim() && setStep("privacy")}
                            style={{
                                width: "100%", padding: "14px 16px", fontSize: 15,
                                border: "2px solid #E8F5E9", borderRadius: 12, outline: "none",
                                color: "#1A1A2E", fontWeight: 600, boxSizing: "border-box",
                                marginBottom: 14, transition: "border-color 0.2s",
                            }}
                            onFocus={e => (e.target.style.borderColor = "#4CAF50")}
                            onBlur={e => (e.target.style.borderColor = "#E8F5E9")}
                        />
                        <div style={{
                            background: "#F8FFF8", borderRadius: 10, padding: "11px 14px",
                            border: "1px solid #DCF0DC", marginBottom: 24,
                            display: "flex", alignItems: "flex-start", gap: 9,
                        }}>
                            <Sparkles size={15} color="#4CAF50" style={{ marginTop: 1, flexShrink: 0 }} />
                            <p style={{ fontSize: 12.5, color: "#666", lineHeight: 1.55 }}>
                                You can rename your tree anytime. Start simple — your family name or a meaningful title.
                            </p>
                        </div>
                        <button
                            disabled={!treeName.trim()}
                            onClick={() => setStep("privacy")}
                            style={{
                                width: "100%", padding: "14px",
                                background: treeName.trim() ? "linear-gradient(135deg, #4CAF50, #2E7D32)" : "#E8E8E8",
                                color: treeName.trim() ? "#fff" : "#AAAAAA",
                                border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700,
                                cursor: treeName.trim() ? "pointer" : "not-allowed",
                                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                                boxShadow: treeName.trim() ? "0 4px 16px rgba(76,175,80,0.3)" : "none",
                                transition: "all 0.2s",
                            }}
                        >
                            Continue <ArrowRight size={16} />
                        </button>
                    </>
                ) : (
                    <>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                            {([
                                { id: "private" as const, emoji: "🔒", label: "Private",     desc: "Only you can view and edit this tree" },
                                { id: "family"  as const, emoji: "👨‍👩‍👧‍👦", label: "Family Only", desc: "Invited members can view and contribute" },
                                { id: "public"  as const, emoji: "🌍", label: "Public",      desc: "Anyone with the link can view (read-only)" },
                            ]).map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => setPrivacy(opt.id)}
                                    style={{
                                        display: "flex", alignItems: "center", gap: 14,
                                        padding: "14px 16px",
                                        border: `2px solid ${privacy === opt.id ? "#4CAF50" : "#EEEEEE"}`,
                                        borderRadius: 12,
                                        background: privacy === opt.id ? "#F0F8F0" : "#FAFAFA",
                                        cursor: "pointer", textAlign: "left", transition: "all 0.18s",
                                    }}
                                >
                                    <span style={{ fontSize: 26, flexShrink: 0 }}>{opt.emoji}</span>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: 14, fontWeight: 700, color: "#1A1A2E" }}>{opt.label}</p>
                                        <p style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{opt.desc}</p>
                                    </div>
                                    <div style={{
                                        width: 22, height: 22, borderRadius: "50%",
                                        border: `2px solid ${privacy === opt.id ? "#4CAF50" : "#D5D5D5"}`,
                                        background: privacy === opt.id ? "#4CAF50" : "transparent",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        flexShrink: 0, transition: "all 0.18s",
                                    }}>
                                        {privacy === opt.id && <Check size={12} color="#fff" strokeWidth={3} />}
                                    </div>
                                </button>
                            ))}
                        </div>
                        <div style={{ display: "flex", gap: 10 }}>
                            <button
                                onClick={() => setStep("name")}
                                style={{
                                    flex: 1, padding: "13px", background: "#F5F5F5", color: "#555",
                                    border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer",
                                }}
                            >
                                Back
                            </button>
                            <button
                                disabled={loading}
                                onClick={handleCreate}
                                style={{
                                    flex: 2, padding: "13px",
                                    background: "linear-gradient(135deg, #4CAF50, #2E7D32)",
                                    color: "#fff", border: "none", borderRadius: 12,
                                    fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                                    boxShadow: "0 4px 16px rgba(76,175,80,0.3)", opacity: loading ? 0.7 : 1,
                                }}
                            >
                                <TreePine size={16} strokeWidth={2} /> {loading ? "Creating…" : "Create Tree"}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

// ── Family row in dropdown ──────────────────────────────────────────────────

function FamilyRow({
    family, idx, isActive, onClick,
    userId,
}: {
    family: Family; idx: number; isActive: boolean; onClick: () => void; userId: string
}) {
    const [hovered, setHovered] = useState(false)
    const { bg, end } = familyColor(idx)
    const role = toRole(family.user_role, family.owner_id === userId)

    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                width: "100%", display: "flex", alignItems: "center", gap: 11,
                padding: "9px 10px", borderRadius: 10, border: "none",
                background: isActive ? "#E8F5E9" : hovered ? "#F7F7F7" : "transparent",
                cursor: "pointer", textAlign: "left", transition: "background 0.13s",
            }}
        >
            <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: isActive ? `linear-gradient(135deg, ${bg}, ${end})` : `linear-gradient(135deg, ${bg}22, ${end}22)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, transition: "background 0.2s",
                boxShadow: isActive ? `0 2px 8px ${bg}30` : "none",
            }}>
                {familyEmoji(idx)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <p style={{
                        fontSize: 13, fontWeight: isActive ? 700 : 600,
                        color: isActive ? "#1A1A2E" : "#333",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 110,
                    }}>
                        {family.name}
                    </p>
                    <RoleBadge role={role} />
                </div>
            </div>
            {isActive ? (
                <div style={{
                    width: 22, height: 22, borderRadius: "50%", background: "#4CAF50",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, boxShadow: "0 2px 8px rgba(76,175,80,0.35)",
                }}>
                    <Check size={12} color="#fff" strokeWidth={3} />
                </div>
            ) : (
                <div style={{
                    width: 22, height: 22, borderRadius: "50%",
                    border: "1.5px solid #E0E0E0", flexShrink: 0,
                    opacity: hovered ? 1 : 0.5, transition: "opacity 0.15s",
                }} />
            )}
        </button>
    )
}

// ── FamilySwitcher ─────────────────────────────────────────────────────────

function FamilySwitcher({
    families, activeFamilyId, userId, onSwitch, onCreated,
}: {
    families: Family[]
    activeFamilyId?: string
    userId: string
    onSwitch: (id: string) => void
    onCreated: (f: Family) => void
}) {
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(false)
    const [showCreate, setShowCreate] = useState(false)
    const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 })
    const triggerRef = useRef<HTMLDivElement>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const active = families.find(f => f.id === activeFamilyId) ?? families[0]
    const activeIdx = families.findIndex(f => f.id === active?.id)
    const { bg, end } = active ? familyColor(activeIdx) : { bg: "#4CAF50", end: "#2E7D32" }

    // Close on outside click / Escape
    useEffect(() => {
        if (!isOpen) return
        const onMouse = (e: MouseEvent) => {
            if (!triggerRef.current?.contains(e.target as Node) && !dropdownRef.current?.contains(e.target as Node))
                setIsOpen(false)
        }
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setIsOpen(false) }
        document.addEventListener("mousedown", onMouse)
        document.addEventListener("keydown", onKey)
        return () => { document.removeEventListener("mousedown", onMouse); document.removeEventListener("keydown", onKey) }
    }, [isOpen])

    const openDropdown = () => {
        if (triggerRef.current) {
            const r = triggerRef.current.getBoundingClientRect()
            setDropPos({ top: r.bottom + 8, left: r.left, width: r.width })
        }
        setIsOpen(v => !v)
    }

    const handleSwitch = (id: string) => {
        setIsOpen(false)
        onSwitch(id)
        router.push(`/family-tree/${id}`)
    }

    const handleCreate = async (name: string) => {
        const created = await createFamily(name)
        setShowCreate(false)
        onCreated(created)
        router.push(`/family-tree/${created.id}`)
    }

    const ownedFamilies  = families.filter(f => f.owner_id === userId || f.user_role === "admin")
    const joinedFamilies = families.filter(f => f.owner_id !== userId && f.user_role !== "admin")

    if (!active) return null

    return (
        <>
            {/* Trigger */}
            <div
                ref={triggerRef}
                onClick={openDropdown}
                style={{
                    background: isOpen ? "#E8F5E9" : "#F0F8F1",
                    borderRadius: 12, padding: "10px 12px",
                    display: "flex", alignItems: "center", gap: 10,
                    cursor: "pointer",
                    border: `1.5px solid ${isOpen ? "#A5D6A7" : "#DCF0DC"}`,
                    transition: "all 0.18s", userSelect: "none",
                }}
            >
                <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: `linear-gradient(135deg, ${bg}, ${end})`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18, boxShadow: `0 3px 10px ${bg}40`,
                }}>
                    {familyEmoji(activeIdx)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#1A1A2E", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {active.name}
                    </p>
                    <p style={{ fontSize: 11, color: "#888", marginTop: 1 }}>
                        {toRole(active.user_role, active.owner_id === userId)}
                    </p>
                </div>
                <ChevronDown size={14} color="#9E9E9E" style={{ flexShrink: 0, transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div
                    ref={dropdownRef}
                    style={{
                        position: "fixed", top: dropPos.top, left: dropPos.left,
                        width: Math.max(dropPos.width, 280), zIndex: 500,
                        background: "#FFFFFF", borderRadius: 16,
                        boxShadow: "0 16px 56px rgba(0,0,0,0.16), 0 2px 12px rgba(0,0,0,0.06)",
                        border: "1px solid rgba(0,0,0,0.07)", overflow: "hidden",
                        animation: "dropIn 0.18s ease",
                    }}
                >
                    <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid #F5F5F5" }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "#BDBDBD", letterSpacing: 1, textTransform: "uppercase" }}>
                            Switch Family Tree
                        </p>
                    </div>

                    {ownedFamilies.length > 0 && (
                        <div style={{ padding: "8px 8px 4px" }}>
                            <p style={{ fontSize: 10, fontWeight: 700, color: "#BDBDBD", letterSpacing: 0.8, textTransform: "uppercase", padding: "4px 8px 6px" }}>
                                Your Trees
                            </p>
                            {ownedFamilies.map(f => (
                                <FamilyRow
                                    key={f.id}
                                    family={f}
                                    idx={families.indexOf(f)}
                                    isActive={f.id === active.id}
                                    onClick={() => handleSwitch(f.id)}
                                    userId={userId}
                                />
                            ))}
                        </div>
                    )}

                    {joinedFamilies.length > 0 && (
                        <div style={{ padding: "4px 8px", borderTop: ownedFamilies.length ? "1px solid #F5F5F5" : "none" }}>
                            <p style={{ fontSize: 10, fontWeight: 700, color: "#BDBDBD", letterSpacing: 0.8, textTransform: "uppercase", padding: "8px 8px 6px" }}>
                                Joined
                            </p>
                            {joinedFamilies.map(f => (
                                <FamilyRow
                                    key={f.id}
                                    family={f}
                                    idx={families.indexOf(f)}
                                    isActive={f.id === active.id}
                                    onClick={() => handleSwitch(f.id)}
                                    userId={userId}
                                />
                            ))}
                        </div>
                    )}

                    <div style={{ padding: "8px", borderTop: "1px solid #F0F0F0" }}>
                        <button
                            onClick={() => { setIsOpen(false); setShowCreate(true) }}
                            onMouseEnter={e => (e.currentTarget.style.background = "#F0F8F0")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                            style={{
                                width: "100%", display: "flex", alignItems: "center", gap: 12,
                                padding: "11px 10px", borderRadius: 10,
                                border: "1.5px dashed #C8E6C9", background: "transparent",
                                cursor: "pointer", transition: "background 0.15s",
                            }}
                        >
                            <div style={{
                                width: 32, height: 32, borderRadius: 9, background: "#E8F5E9",
                                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                            }}>
                                <Plus size={16} color="#4CAF50" strokeWidth={2.5} />
                            </div>
                            <div style={{ textAlign: "left" }}>
                                <p style={{ fontSize: 13, fontWeight: 700, color: "#2E7D32" }}>Create New Tree</p>
                                <p style={{ fontSize: 11, color: "#999", marginTop: 1 }}>Start a brand new family tree</p>
                            </div>
                        </button>
                    </div>
                </div>
            )}

            {showCreate && (
                <CreateTreeModal
                    onClose={() => setShowCreate(false)}
                    onCreate={handleCreate}
                />
            )}

            <style>{`
                @keyframes dropIn {
                    from { opacity: 0; transform: translateY(-6px) scale(0.98); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </>
    )
}

// ── Types & interfaces ──────────────────────────────────────────────────────

interface UserProfile {
    id: string
    email: string
    first_name?: string
    last_name?: string
}

interface MeResponse {
    user: { id: string; email: string }
    person?: { first_name?: string; last_name?: string }
}

interface Props {
    activeFamilyId?: string
    activeSection?: "tree" | "reminders" | "memories" | "profile" | "settings" | "invite" | "finder" | "invitations"
}

// ── AppSidebar ─────────────────────────────────────────────────────────────

export default function AppSidebar({ activeFamilyId, activeSection = "tree" }: Props) {
    const router = useRouter()
    const [families, setFamilies] = useState<Family[]>([])
    const [unread, setUnread] = useState(0)
    const [user, setUser] = useState<UserProfile | null>(null)
    const [activeId, setActiveId] = useState(activeFamilyId)
    const [pendingInvite, setPendingInvite] = useState<{ inviterName: string; familyName: string; token: string } | null>(null)
    const [pendingCount, setPendingCount] = useState(0)
    const [inviteBannerVisible, setInviteBannerVisible] = useState(true)

    useEffect(() => {
        if (!getToken()) { router.push("/auth/login"); return }

        getFamilies().then(setFamilies).catch(() => {})
        getUnreadCount().then(setUnread).catch(() => {})

        // Fetch pending invitation notifications
        getNotifications().then(({ notifications }) => {
            const pending = notifications.filter(n => n.type === "invitation" && !n.read)
            setPendingCount(pending.length)
            const inv = pending[0]
            if (inv) {
                const parsed = parseInviteNotif(inv)
                if (parsed) setPendingInvite(parsed)
            }
        }).catch(() => {})

        apiFetch(`${API_BASE}/auth/me`).then(r => r.json()).then((data: MeResponse) => {
            setUser({
                id: data.user.id,
                email: data.user.email,
                first_name: data.person?.first_name,
                last_name: data.person?.last_name,
            })
        }).catch(() => {})
    }, [])

    useEffect(() => { setActiveId(activeFamilyId) }, [activeFamilyId])

    const currentFamily = families.find(f => f.id === activeId) ?? families[0]
    const treeHref = currentFamily ? `/family-tree/${currentFamily.id}` : "/families"

    const NAV_ITEMS = [
        { icon: TreePine,   label: "Family Tree",        key: "tree"         as const, href: treeHref,      badge: 0 },
        { icon: Inbox,      label: "Invitations",        key: "invitations"  as const, href: "/invitations", badge: pendingCount },
        { icon: Bell,       label: "Reminders",          key: "reminders"    as const, href: "/reminders",  badge: unread },
        { icon: ImageIcon,  label: "Memories",           key: "memories"     as const, href: "/memories",   badge: 0 },
        { icon: User,       label: "My Profile",         key: "profile"      as const, href: "/me",         badge: 0 },
        { icon: Settings,   label: "Settings",           key: "settings"     as const, href: "/settings",   badge: 0 },
    ]
    const TOOL_ITEMS = [
        { icon: UserPlus, label: "Invite Family",       key: "invite"  as const, href: "/invite" },
        { icon: Search,   label: "Relationship Finder", key: "finder"  as const, href: "/finder" },
    ]

    const userInitials = user
        ? [user.first_name?.[0], user.last_name?.[0]].filter(Boolean).join("").toUpperCase() || user.email[0].toUpperCase()
        : "?"
    const userName  = user ? [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email : ""
    const userEmail = user?.email ?? ""

    return (
        <aside style={{
            width: 260, minWidth: 260, height: "100vh",
            position: "sticky", top: 0,
            background: "#FFFFFF", borderRight: "1px solid rgba(0,0,0,0.07)",
            display: "flex", flexDirection: "column",
            boxShadow: "2px 0 24px rgba(0,0,0,0.04)", zIndex: 100,
            overflowY: "auto", flexShrink: 0,
        }}>
            {/* Logo */}
            <div style={{ padding: "28px 20px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: 14,
                        background: "linear-gradient(135deg, #4CAF50, #2E7D32)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 4px 14px rgba(76,175,80,0.35)", flexShrink: 0,
                    }}>
                        <span style={{ fontSize: 24 }}>🌿</span>
                    </div>
                    <div>
                        <p style={{ fontSize: 20, fontWeight: 800, color: "#1A1A2E", letterSpacing: -0.5, lineHeight: 1.1 }}>Shajarah</p>
                        <p style={{ fontSize: 11, color: "#9E9E9E", marginTop: 2 }}>Family Tree App</p>
                    </div>
                </div>
            </div>

            {/* Family switcher */}
            <div style={{ padding: "0 14px 18px" }}>
                {families.length > 0 && user && (
                    <FamilySwitcher
                        families={families}
                        activeFamilyId={activeId}
                        userId={user.id}
                        onSwitch={id => setActiveId(id)}
                        onCreated={f => setFamilies(prev => [...prev, f])}
                    />
                )}
            </div>

            <div style={{ margin: "0 14px", height: 1, background: "#F0F0F0" }} />

            {/* Navigation */}
            <div style={{ padding: "14px 12px", flex: 1 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "#C0C0C0", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8, paddingLeft: 8 }}>
                    Navigation
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {NAV_ITEMS.map(({ icon: Icon, label, key, href, badge }) => (
                        <NavButton
                            key={key}
                            icon={Icon}
                            label={label}
                            active={activeSection === key}
                            badge={badge}
                            onClick={() => router.push(href)}
                        />
                    ))}
                </div>

                <p style={{ fontSize: 10, fontWeight: 700, color: "#C0C0C0", letterSpacing: 1, textTransform: "uppercase", margin: "20px 0 8px", paddingLeft: 8 }}>
                    Tools
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {TOOL_ITEMS.map(({ icon: Icon, label, key, href }) => (
                        <NavButton
                            key={key}
                            icon={Icon}
                            label={label}
                            active={activeSection === key}
                            onClick={() => router.push(href)}
                        />
                    ))}
                </div>
            </div>

            {/* Pending invitation banner */}
            {pendingInvite && inviteBannerVisible && (
                <div style={{ padding: "0 14px 12px" }}>
                    <div style={{
                        background: "linear-gradient(135deg, #FFF8E1, #FFFDE7)",
                        border: "1.5px solid #FFE082", borderRadius: 14,
                        padding: "12px", position: "relative",
                    }}>
                        <button
                            onClick={() => setInviteBannerVisible(false)}
                            style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", cursor: "pointer", color: "#BDBDBD", padding: 0, lineHeight: 1 }}
                        >
                            <X size={13} />
                        </button>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 9, marginBottom: 10 }}>
                            <div style={{ width: 30, height: 30, borderRadius: 9, background: "#FFF9C4", border: "1px solid #FFE082", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                                📨
                            </div>
                            <div style={{ flex: 1, minWidth: 0, paddingRight: 14 }}>
                                <p style={{ fontSize: 12, fontWeight: 700, color: "#F57F17", marginBottom: 2 }}>Pending Invitation</p>
                                <p style={{ fontSize: 11.5, color: "#666", lineHeight: 1.45 }}>
                                    <strong>{pendingInvite.inviterName}</strong> invited you to join <strong>{pendingInvite.familyName}</strong>
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => router.push("/invitations")}
                            style={{
                                width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                                padding: "8px 10px", background: "#F9A825", color: "#fff",
                                border: "none", borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: "pointer",
                                boxShadow: "0 3px 10px rgba(249,168,37,0.35)",
                            }}
                        >
                            {pendingCount > 1 ? `View All (${pendingCount})` : "View Invitation"} <ArrowRight size={12} />
                        </button>
                    </div>
                </div>
            )}

            {/* User card */}
            <div style={{ padding: "12px 14px 20px", borderTop: "1px solid #F0F0F0" }}>
                <div
                    onClick={() => router.push("/me")}
                    style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 12px", borderRadius: 12,
                        background: "#F7F5F0", cursor: "pointer",
                    }}
                >
                    <div style={{
                        width: 38, height: 38, borderRadius: "50%",
                        background: "linear-gradient(135deg, #4CAF50, #2E7D32)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 16, fontWeight: 700, color: "#fff", flexShrink: 0,
                    }}>
                        {userInitials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#1A1A2E", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {userName}
                        </p>
                        <p style={{ fontSize: 11, color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {userEmail}
                        </p>
                    </div>
                    <button
                        onClick={e => { e.stopPropagation(); removeToken(); router.push("/auth/login") }}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 4, flexShrink: 0 }}
                    >
                        <LogOut size={14} color="#BDBDBD" />
                    </button>
                </div>
            </div>
        </aside>
    )
}

// ── NavButton ──────────────────────────────────────────────────────────────

function NavButton({
    icon: Icon, label, active, badge, onClick,
}: {
    icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>
    label: string
    active: boolean
    badge?: number
    onClick: () => void
}) {
    const [hovered, setHovered] = useState(false)
    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", borderRadius: 10, border: "none",
                background: active ? "#E8F5E9" : hovered ? "#F9F9F9" : "transparent",
                color: active ? "#2E7D32" : "#555",
                cursor: "pointer", textAlign: "left", width: "100%",
                transition: "background 0.15s",
            }}
        >
            <div style={{
                width: 34, height: 34, borderRadius: 9,
                background: active ? "#4CAF50" : "#F5F5F5",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: "background 0.15s",
            }}>
                <Icon size={17} color={active ? "#fff" : "#888"} strokeWidth={active ? 2.5 : 1.8} />
            </div>
            <span style={{ fontSize: 14, fontWeight: active ? 600 : 500, flex: 1 }}>{label}</span>
            {badge ? (
                <div style={{
                    width: 20, height: 20, borderRadius: "50%", background: "#FF5252",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700, color: "#fff", flexShrink: 0,
                }}>
                    {badge > 9 ? "9+" : badge}
                </div>
            ) : null}
        </button>
    )
}
