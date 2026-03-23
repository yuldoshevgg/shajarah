"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
    User, Lock, Bell, Globe, LogOut,
    ChevronRight, Shield, HelpCircle, Star, Trash2, Moon,
    Settings as SettingsIcon,
} from "lucide-react"
import { apiFetch } from "@/lib/apiFetch"
import { isAuthenticated, removeToken } from "@/lib/auth"
import API_BASE from "@/services/api"
import AppSidebar from "@/components/AppSidebar"

interface MeResponse {
    user: { id: string; email: string; created_at?: string }
    person?: { id: string; first_name?: string; last_name?: string; family_id?: string }
}

interface SettingItem {
    icon: React.ElementType
    label: string
    subtitle?: string
    type: "nav" | "toggle" | "destructive"
    path?: string
    color?: string
    action?: () => void
}

const SECTIONS = (signOut: () => void) => [
    {
        id: "account",
        title: "Account",
        emoji: "👤",
        items: [
            { icon: User,   label: "Profile Settings",  subtitle: "Edit your personal information", type: "nav" as const, path: "/me" },
            { icon: Lock,   label: "Change Password",   subtitle: "Update your password",            type: "nav" as const },
            { icon: Shield, label: "Privacy & Security",subtitle: "Control who can see your data",  type: "nav" as const },
        ],
    },
    {
        id: "preferences",
        title: "Preferences",
        emoji: "🎛️",
        items: [
            { icon: Bell,  label: "Notifications", subtitle: "Manage birthday & anniversary alerts", type: "toggle" as const },
            { icon: Moon,  label: "Dark Mode",     subtitle: "Switch app appearance",                type: "toggle" as const },
            { icon: Globe, label: "Language",      subtitle: "English",                              type: "nav" as const },
        ],
    },
    {
        id: "support",
        title: "Support",
        emoji: "🤝",
        items: [
            { icon: HelpCircle, label: "Help & FAQ",      subtitle: "Get answers to common questions", type: "nav" as const },
            { icon: Star,       label: "Rate Shajarah",   subtitle: "Leave a review",                  type: "nav" as const },
        ],
    },
    {
        id: "danger",
        title: "Danger Zone",
        emoji: "⚠️",
        items: [
            { icon: Trash2, label: "Delete Account", subtitle: "Permanently remove your data", type: "destructive" as const, color: "#F44336" },
            { icon: LogOut, label: "Sign Out",       subtitle: "Log out of Shajarah",          type: "destructive" as const, color: "#FF5722", action: signOut },
        ],
    },
]

export default function SettingsPage() {
    const router = useRouter()
    const [me, setMe] = useState<MeResponse | null>(null)
    const [activeSection, setActiveSection] = useState("account")
    const [toggles, setToggles] = useState<Record<string, boolean>>({
        Notifications: true,
        "Dark Mode": false,
    })

    useEffect(() => {
        if (!isAuthenticated()) { router.push("/auth/login"); return }
        apiFetch(`${API_BASE}/auth/me`).then(r => r.json()).then(setMe).catch(() => {})
    }, [router]) // eslint-disable-line

    const signOut = () => { removeToken(); router.push("/auth/login") }
    const sections = SECTIONS(signOut)
    const current  = sections.find(s => s.id === activeSection) ?? sections[0]

    const initials = me?.person
        ? ([me.person.first_name?.[0], me.person.last_name?.[0]].filter(Boolean).join("").toUpperCase() || me.user.email[0].toUpperCase())
        : (me?.user.email[0].toUpperCase() ?? "?")
    const fullName = me?.person
        ? [me.person.first_name, me.person.last_name].filter(Boolean).join(" ") || me.user.email
        : (me?.user.email ?? "")
    const memberSince = me?.user.created_at
        ? new Date(me.user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
        : ""

    const handleItem = (item: SettingItem) => {
        if (item.type === "toggle") return
        if (item.action) { item.action(); return }
        if (item.path) router.push(item.path)
    }

    return (
        <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden" }}>
            <AppSidebar activeSection="settings" activeFamilyId={me?.person?.family_id} />

            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

                {/* Header */}
                <header style={{
                    padding: "20px 32px", background: "#FFFFFF",
                    display: "flex", alignItems: "center", gap: 14,
                    boxShadow: "0 2px 12px rgba(0,0,0,0.05)", flexShrink: 0, zIndex: 10,
                }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: "#F5F5F5",
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                        <SettingsIcon size={22} color="#555" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1A1A2E", letterSpacing: -0.5 }}>Settings</h1>
                        <p style={{ fontSize: 13, color: "#9E9E9E", marginTop: 3 }}>Manage your account and preferences</p>
                    </div>
                </header>

                {/* Body */}
                <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px", background: "#F7F5F0" }}>
                    <div style={{ maxWidth: 1100, margin: "0 auto" }}>

                        {/* Profile card */}
                        <div
                            onClick={() => router.push("/me")}
                            onMouseEnter={e => (e.currentTarget.style.opacity = "0.92")}
                            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                            style={{
                                background: "linear-gradient(135deg, #2E7D32, #4CAF50)",
                                borderRadius: 22, padding: "24px 28px", marginBottom: 24,
                                display: "flex", alignItems: "center", gap: 18,
                                cursor: "pointer", position: "relative", overflow: "hidden",
                                transition: "opacity 0.15s",
                            }}
                        >
                            <div style={{ position: "absolute", width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.05)", right: -60, top: -60 }} />

                            {/* Avatar */}
                            <div style={{
                                width: 64, height: 64, borderRadius: "50%",
                                background: "rgba(255,255,255,0.2)",
                                border: "3px solid rgba(255,255,255,0.4)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 28, fontWeight: 800, color: "#fff", flexShrink: 0,
                            }}>
                                {initials}
                            </div>

                            {/* Name */}
                            <div style={{ flex: 1 }}>
                                <p style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{fullName}</p>
                                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", marginTop: 3 }}>
                                    {me?.user.email}{memberSince ? ` · Member since ${memberSince}` : ""}
                                </p>
                            </div>

                            {/* Stats */}
                            <div style={{ display: "flex", gap: 0, marginRight: 12 }}>
                                {[
                                    { label: "Relatives", value: "—" },
                                    { label: "Memories",  value: "0" },
                                    { label: "Years",     value: memberSince ? String(new Date().getFullYear() - new Date(me?.user.created_at ?? "").getFullYear()) : "—" },
                                ].map((s, i) => (
                                    <div key={s.label} style={{
                                        textAlign: "center", paddingLeft: i > 0 ? 16 : 0,
                                        borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.2)" : "none",
                                        paddingRight: 16,
                                    }}>
                                        <p style={{ fontSize: 22, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{s.value}</p>
                                        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", marginTop: 3 }}>{s.label}</p>
                                    </div>
                                ))}
                            </div>

                            <ChevronRight size={20} color="rgba(255,255,255,0.6)" style={{ flexShrink: 0 }} />
                        </div>

                        {/* Two-column layout */}
                        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20 }}>

                            {/* Left tabs */}
                            <div style={{ background: "#FFFFFF", borderRadius: 18, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", alignSelf: "start" }}>
                                {sections.map((section, i) => (
                                    <button
                                        key={section.id}
                                        onClick={() => setActiveSection(section.id)}
                                        style={{
                                            width: "100%", display: "flex", alignItems: "center", gap: 12,
                                            padding: "14px 16px",
                                            background: activeSection === section.id ? "#E8F5E9" : "transparent",
                                            border: "none",
                                            borderBottom: i < sections.length - 1 ? "1px solid #F5F5F5" : "none",
                                            cursor: "pointer", textAlign: "left", transition: "background 0.15s",
                                        }}
                                    >
                                        <span style={{ fontSize: 20 }}>{section.emoji}</span>
                                        <span style={{
                                            fontSize: 14,
                                            fontWeight: activeSection === section.id ? 700 : 500,
                                            color: activeSection === section.id ? "#2E7D32" : "#555",
                                        }}>
                                            {section.title}
                                        </span>
                                        {activeSection === section.id && (
                                            <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "#4CAF50" }} />
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Right content */}
                            <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                                    <span style={{ fontSize: 24 }}>{current.emoji}</span>
                                    <h3 style={{ fontSize: 20, fontWeight: 700, color: "#1A1A2E" }}>{current.title}</h3>
                                </div>
                                <div style={{ background: "white", borderRadius: 18, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
                                    {current.items.map((item, i) => {
                                        const iconBg    = item.type === "destructive" ? `${item.color}18` : "#F0F8F1"
                                        const iconColor = item.type === "destructive" ? (item.color ?? "#F44336") : "#4CAF50"
                                        const textColor = item.color ?? "#1A1A2E"

                                        return (
                                            <div
                                                key={item.label}
                                                onClick={() => handleItem(item)}
                                                onMouseEnter={e => { if (item.type !== "toggle") e.currentTarget.style.background = "#FAFAFA" }}
                                                onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}
                                                style={{
                                                    padding: "18px 22px", display: "flex", alignItems: "center", gap: 16,
                                                    borderBottom: i < current.items.length - 1 ? "1px solid #F5F5F5" : "none",
                                                    cursor: item.type === "toggle" ? "default" : "pointer",
                                                    transition: "background 0.15s",
                                                }}
                                            >
                                                <div style={{
                                                    width: 44, height: 44, borderRadius: 12,
                                                    background: iconBg,
                                                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                                                }}>
                                                    <item.icon size={20} color={iconColor} />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <p style={{ fontSize: 15, fontWeight: 600, color: textColor }}>{item.label}</p>
                                                    {item.subtitle && (
                                                        <p style={{ fontSize: 13, color: "#9E9E9E", marginTop: 3 }}>{item.subtitle}</p>
                                                    )}
                                                </div>
                                                {item.type === "toggle" ? (
                                                    <div
                                                        onClick={e => { e.stopPropagation(); setToggles(t => ({ ...t, [item.label]: !t[item.label] })) }}
                                                        style={{
                                                            width: 50, height: 28, borderRadius: 14,
                                                            background: toggles[item.label] ? "#4CAF50" : "#D0D0D0",
                                                            position: "relative", cursor: "pointer",
                                                            transition: "background 0.25s", flexShrink: 0,
                                                        }}
                                                    >
                                                        <div style={{
                                                            position: "absolute", top: 3,
                                                            left: toggles[item.label] ? 25 : 3,
                                                            width: 22, height: 22, borderRadius: "50%",
                                                            background: "white",
                                                            boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                                                            transition: "left 0.25s",
                                                        }} />
                                                    </div>
                                                ) : (
                                                    <ChevronRight size={18} color="#C0C0C0" />
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <p style={{ textAlign: "center", fontSize: 13, color: "#C0C0C0", marginTop: 32 }}>
                            Shajarah v1.0.0 · Made with 🌿 · All rights reserved
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
