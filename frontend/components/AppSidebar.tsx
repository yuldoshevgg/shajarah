"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
    TreePine, Bell, ImageIcon, User, Settings,
    UserPlus, Search, ChevronDown, LogOut
} from "lucide-react"
import { getToken, removeToken } from "@/lib/auth"
import { getFamilies, Family } from "@/services/familyService"
import { getUnreadCount } from "@/services/notificationService"
import { apiFetch } from "@/lib/apiFetch"
import API_BASE from "@/services/api"

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
    activeSection?: "tree" | "reminders" | "memories" | "profile" | "settings" | "invite" | "finder"
}

export default function AppSidebar({ activeFamilyId, activeSection = "tree" }: Props) {
    const router = useRouter()
    const [families, setFamilies] = useState<Family[]>([])
    const [currentFamily, setCurrentFamily] = useState<Family | null>(null)
    const [familyDropOpen, setFamilyDropOpen] = useState(false)
    const [unread, setUnread] = useState(0)
    const [user, setUser] = useState<UserProfile | null>(null)
    const [memberCount, setMemberCount] = useState(0)

    useEffect(() => {
        if (!getToken()) { router.push("/auth/login"); return }

        getFamilies().then(list => {
            setFamilies(list)
            if (activeFamilyId) {
                const found = list.find(f => f.id === activeFamilyId)
                if (found) setCurrentFamily(found)
            } else if (list.length > 0) {
                setCurrentFamily(list[0])
            }
        }).catch(() => { })

        getUnreadCount().then(setUnread).catch(() => { })

        apiFetch(`${API_BASE}/auth/me`).then(r => r.json()).then((data: MeResponse) => {
            setUser({
                id: data.user.id,
                email: data.user.email,
                first_name: data.person?.first_name,
                last_name: data.person?.last_name,
            })
        }).catch(() => { })
    }, [activeFamilyId])

    useEffect(() => {
        if (!activeFamilyId) return
        apiFetch(`${API_BASE}/families/${activeFamilyId}/tree`)
            .then(r => r.json())
            .then((data: { persons?: unknown[] }) => setMemberCount(data.persons?.length ?? 0))
            .catch(() => { })
    }, [activeFamilyId])

    const treeHref = currentFamily ? `/family-tree/${currentFamily.id}` : "/families"
    const familyId = activeFamilyId ?? currentFamily?.id

    const NAV_ITEMS = [
        { icon: TreePine, label: "Family Tree", key: "tree" as const, href: treeHref, badge: 0 },
        { icon: Bell, label: "Reminders", key: "reminders" as const, href: "/families", badge: unread },
        { icon: ImageIcon, label: "Memories", key: "memories" as const, href: "/families", badge: 0 },
        { icon: User, label: "My Profile", key: "profile" as const, href: "/me", badge: 0 },
        { icon: Settings, label: "Settings", key: "settings" as const, href: "/families", badge: 0 },
    ]

    const TOOL_ITEMS = [
        { icon: UserPlus, label: "Invite Family", key: "invite" as const, href: "/families" },
        { icon: Search, label: "Relationship Finder", key: "finder" as const, href: "/search" },
    ]

    const userInitials = user
        ? ([user.first_name?.[0], user.last_name?.[0]].filter(Boolean).join("").toUpperCase() || user.email[0].toUpperCase())
        : "?"
    const userName = user
        ? [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email
        : ""
    const userEmail = user?.email ?? ""

    return (
        <aside
            style={{
                width: 260,
                minWidth: 260,
                height: "100vh",
                position: "sticky",
                top: 0,
                background: "#FFFFFF",
                borderRight: "1px solid rgba(0,0,0,0.07)",
                display: "flex",
                flexDirection: "column",
                boxShadow: "2px 0 24px rgba(0,0,0,0.04)",
                zIndex: 100,
                overflowY: "auto",
                flexShrink: 0,
            }}
        >
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

            {/* Family selector */}
            <div style={{ padding: "0 14px 18px" }}>
                {currentFamily && (
                <div
                    style={{
                        background: "#F0F8F1", borderRadius: 12, padding: "10px 14px",
                        display: "flex", alignItems: "center", gap: 10,
                        cursor: "pointer", border: "1.5px solid #DCF0DC",
                    }}
                    onClick={() => {
                        if (families.length > 1) setFamilyDropOpen(v => !v)
                        else router.push(`/family-tree/${currentFamily.id}`)
                    }}
                >
                    <span style={{ fontSize: 22, flexShrink: 0 }}>👨‍👩‍👧‍👦</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#1A1A2E", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {currentFamily.name}
                        </p>
                        <p style={{ fontSize: 11, color: "#888" }}>
                            {memberCount > 0 ? `${memberCount} members` : "0 members"}
                        </p>
                    </div>
                    {families.length > 1 && <ChevronDown size={14} color="#9E9E9E" />}
                </div>
                )}

                {familyDropOpen && families.length > 1 && (
                    <div style={{ marginTop: 4, background: "#fff", border: "1px solid #F0F0F0", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.08)", overflow: "hidden" }}>
                        {families.map(f => (
                            <button
                                key={f.id}
                                onClick={() => { router.push(`/family-tree/${f.id}`); setFamilyDropOpen(false) }}
                                style={{
                                    display: "block", width: "100%", textAlign: "left",
                                    padding: "10px 14px", fontSize: 13, border: "none",
                                    background: f.id === familyId ? "#E8F5E9" : "transparent",
                                    color: f.id === familyId ? "#2E7D32" : "#555",
                                    fontWeight: f.id === familyId ? 600 : 400,
                                    cursor: "pointer",
                                }}
                            >
                                {f.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div style={{ margin: "0 14px", height: 1, background: "#F0F0F0" }} />

            {/* Navigation */}
            <div style={{ padding: "14px 12px", flex: 1 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "#C0C0C0", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8, paddingLeft: 8 }}>
                    Navigation
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {NAV_ITEMS.map(({ icon: Icon, label, key, href, badge }) => {
                        const active = activeSection === key
                        return (
                            <NavButton
                                key={key}
                                icon={Icon}
                                label={label}
                                active={active}
                                badge={badge}
                                onClick={() => router.push(href)}
                            />
                        )
                    })}
                </div>

                <p style={{ fontSize: 10, fontWeight: 700, color: "#C0C0C0", letterSpacing: 1, textTransform: "uppercase", margin: "20px 0 8px", paddingLeft: 8 }}>
                    Tools
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {TOOL_ITEMS.map(({ icon: Icon, label, key, href }) => {
                        const active = activeSection === key
                        return (
                            <NavButton
                                key={key}
                                icon={Icon}
                                label={label}
                                active={active}
                                onClick={() => router.push(href)}
                            />
                        )
                    })}
                </div>
            </div>

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

function NavButton({
    icon: Icon, label, active, badge, onClick
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
                    width: 20, height: 20, borderRadius: "50%",
                    background: "#FF5252", display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: 10, fontWeight: 700,
                    color: "#fff", flexShrink: 0,
                }}>
                    {badge > 9 ? "9+" : badge}
                </div>
            ) : null}
        </button>
    )
}
