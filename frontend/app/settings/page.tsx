"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
    User, Lock, Bell, Globe, LogOut,
    ChevronRight, Shield, HelpCircle, Star, Trash2, Moon,
    Settings as SettingsIcon, Check,
} from "lucide-react"
import { apiFetch } from "@/lib/apiFetch"
import { isAuthenticated, removeToken } from "@/lib/auth"
import API_BASE from "@/services/api"
import AppSidebar from "@/components/AppSidebar"
import { useT, Lang } from "@/lib/i18n"
import { useBreakpoint } from "@/lib/useBreakpoint"

interface MeResponse {
    user: { id: string; email: string; created_at?: string }
    person?: { id: string; first_name?: string; last_name?: string; family_id?: string }
}

export default function SettingsPage() {
    const router = useRouter()
    const { t, lang, setLang } = useT()
    const { isMobile } = useBreakpoint()
    const [me, setMe] = useState<MeResponse | null>(null)
    const [activeSection, setActiveSection] = useState("account")
    const [toggles, setToggles] = useState<Record<string, boolean>>({
        notifications: true,
        dark_mode: false,
    })

    useEffect(() => {
        if (!isAuthenticated()) { router.push("/auth/login"); return }
        apiFetch(`${API_BASE}/auth/me`).then(r => r.json()).then(setMe).catch(() => {})
    }, [router]) // eslint-disable-line

    const signOut = () => { removeToken(); router.push("/auth/login") }

    const SECTIONS = [
        {
            id: "account",
            title: t("settings_account"),
            emoji: "👤",
            items: [
                { icon: User,   key: "profile",   label: t("settings_profile_settings"),  subtitle: t("settings_profile_subtitle"),          type: "nav" as const,         path: "/me" },
                { icon: Lock,   key: "password",  label: t("settings_change_password"),    subtitle: t("settings_change_password_subtitle"),  type: "nav" as const },
                { icon: Shield, key: "privacy",   label: t("settings_privacy"),            subtitle: t("settings_privacy_subtitle"),          type: "nav" as const },
            ],
        },
        {
            id: "preferences",
            title: t("settings_preferences"),
            emoji: "🎛️",
            items: [
                { icon: Bell,  key: "notifications", label: t("settings_notifications"), subtitle: t("settings_notifications_subtitle"), type: "toggle" as const },
                { icon: Moon,  key: "dark_mode",      label: t("settings_dark_mode"),     subtitle: t("settings_dark_mode_subtitle"),     type: "toggle" as const },
                { icon: Globe, key: "language",       label: t("settings_language"),      subtitle: t("settings_language_subtitle"),      type: "language" as const },
            ],
        },
        {
            id: "support",
            title: t("settings_support"),
            emoji: "🤝",
            items: [
                { icon: HelpCircle, key: "help", label: t("settings_help"),  subtitle: t("settings_help_subtitle"),  type: "nav" as const },
                { icon: Star,       key: "rate", label: t("settings_rate"),  subtitle: t("settings_rate_subtitle"),  type: "nav" as const },
            ],
        },
        {
            id: "danger",
            title: t("settings_danger"),
            emoji: "⚠️",
            items: [
                { icon: Trash2, key: "delete",   label: t("settings_delete_account"), subtitle: t("settings_delete_subtitle"),   type: "destructive" as const, color: "#F44336" },
                { icon: LogOut, key: "sign_out", label: t("settings_sign_out"),        subtitle: t("settings_sign_out_subtitle"), type: "destructive" as const, color: "#FF5722", action: signOut },
            ],
        },
    ]

    const current = SECTIONS.find(s => s.id === activeSection) ?? SECTIONS[0]

    const initials = me?.person
        ? ([me.person.first_name?.[0], me.person.last_name?.[0]].filter(Boolean).join("").toUpperCase() || me.user.email[0].toUpperCase())
        : (me?.user.email[0].toUpperCase() ?? "?")
    const fullName = me?.person
        ? [me.person.first_name, me.person.last_name].filter(Boolean).join(" ") || me.user.email
        : (me?.user.email ?? "")
    const memberSince = me?.user.created_at
        ? new Date(me.user.created_at).toLocaleDateString(lang === "en" ? "en-US" : lang === "ru" ? "ru-RU" : "uz-UZ", { month: "long", year: "numeric" })
        : ""

    const LANGS: { code: Lang; label: string; flag: string }[] = [
        { code: "uz", label: t("settings_lang_uz"), flag: "🇺🇿" },
        { code: "ru", label: t("settings_lang_ru"), flag: "🇷🇺" },
        { code: "en", label: t("settings_lang_en"), flag: "🇬🇧" },
    ]

    const handleItem = (item: { type: string; action?: () => void; path?: string }) => {
        if (item.type === "toggle" || item.type === "language") return
        if (item.action) { item.action(); return }
        if (item.path) router.push(item.path)
    }

    return (
        <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden" }}>
            <AppSidebar activeSection="settings" activeFamilyId={me?.person?.family_id} />

            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

                {/* Header */}
                <header style={{
                    padding: isMobile ? "14px 16px" : "20px 32px", background: "#FFFFFF",
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
                        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1A1A2E", letterSpacing: -0.5 }}>{t("settings_title")}</h1>
                        <p style={{ fontSize: 13, color: "#9E9E9E", marginTop: 3 }}>{t("settings_subtitle")}</p>
                    </div>
                </header>

                {/* Body */}
                <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "16px" : "28px 32px", paddingBottom: isMobile ? "calc(80px + env(safe-area-inset-bottom))" : undefined, background: "#F7F5F0" }}>
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
                            <div style={{
                                width: 64, height: 64, borderRadius: "50%",
                                background: "rgba(255,255,255,0.2)",
                                border: "3px solid rgba(255,255,255,0.4)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 28, fontWeight: 800, color: "#fff", flexShrink: 0,
                            }}>
                                {initials}
                            </div>
                            <div style={{ flex: 1 }}>
                                <p style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{fullName}</p>
                                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", marginTop: 3 }}>
                                    {me?.user.email}{memberSince ? ` · ${t("settings_member_since")} ${memberSince}` : ""}
                                </p>
                            </div>
                            <div style={{ display: "flex", gap: 0, marginRight: 12 }}>
                                {[
                                    { label: t("settings_relatives"), value: "—" },
                                    { label: t("settings_memories"),  value: "0" },
                                    { label: t("settings_years"),     value: memberSince ? String(new Date().getFullYear() - new Date(me?.user.created_at ?? "").getFullYear()) : "—" },
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
                        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "220px 1fr", gap: 20 }}>

                            {/* Left tabs */}
                            <div style={{ background: "#FFFFFF", borderRadius: 18, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", alignSelf: "start" }}>
                                {SECTIONS.map((section, i) => (
                                    <button
                                        key={section.id}
                                        onClick={() => setActiveSection(section.id)}
                                        style={{
                                            width: "100%", display: "flex", alignItems: "center", gap: 12,
                                            padding: "14px 16px",
                                            background: activeSection === section.id ? "#E8F5E9" : "transparent",
                                            border: "none",
                                            borderBottom: i < SECTIONS.length - 1 ? "1px solid #F5F5F5" : "none",
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
                                        const itemColor = (item as { color?: string }).color
                                        const iconBg    = item.type === "destructive" ? `${itemColor}18` : "#F0F8F1"
                                        const iconColor = item.type === "destructive" ? (itemColor ?? "#F44336") : "#4CAF50"
                                        const textColor = itemColor ?? "#1A1A2E"

                                        return (
                                            <div key={item.key}>
                                                <div
                                                    onClick={() => handleItem(item)}
                                                    onMouseEnter={e => { if (item.type !== "toggle" && item.type !== "language") e.currentTarget.style.background = "#FAFAFA" }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}
                                                    style={{
                                                        padding: "18px 22px", display: "flex", alignItems: "center", gap: 16,
                                                        borderBottom: (item.type === "language" || i === current.items.length - 1) ? "none" : "1px solid #F5F5F5",
                                                        cursor: (item.type === "toggle" || item.type === "language") ? "default" : "pointer",
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
                                                            onClick={e => { e.stopPropagation(); setToggles(prev => ({ ...prev, [item.key]: !prev[item.key] })) }}
                                                            style={{
                                                                width: 50, height: 28, borderRadius: 14,
                                                                background: toggles[item.key] ? "#4CAF50" : "#D0D0D0",
                                                                position: "relative", cursor: "pointer",
                                                                transition: "background 0.25s", flexShrink: 0,
                                                            }}
                                                        >
                                                            <div style={{
                                                                position: "absolute", top: 3,
                                                                left: toggles[item.key] ? 25 : 3,
                                                                width: 22, height: 22, borderRadius: "50%",
                                                                background: "white",
                                                                boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                                                                transition: "left 0.25s",
                                                            }} />
                                                        </div>
                                                    ) : item.type !== "language" ? (
                                                        <ChevronRight size={18} color="#C0C0C0" />
                                                    ) : null}
                                                </div>

                                                {/* Language picker — inline under the Language row */}
                                                {item.type === "language" && (
                                                    <div style={{
                                                        borderTop: "1px solid #F5F5F5",
                                                        padding: "14px 22px 18px",
                                                        display: "flex", gap: 10,
                                                    }}>
                                                        {LANGS.map(l => (
                                                            <button
                                                                key={l.code}
                                                                onClick={() => setLang(l.code)}
                                                                style={{
                                                                    flex: 1, padding: "12px 8px",
                                                                    borderRadius: 14,
                                                                    border: `2px solid ${lang === l.code ? "#4CAF50" : "#EBEBEB"}`,
                                                                    background: lang === l.code ? "#E8F5E9" : "#FAFAFA",
                                                                    cursor: "pointer",
                                                                    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                                                                    transition: "all 0.15s",
                                                                }}
                                                            >
                                                                <span style={{ fontSize: 26 }}>{l.flag}</span>
                                                                <span style={{
                                                                    fontSize: 13, fontWeight: lang === l.code ? 700 : 500,
                                                                    color: lang === l.code ? "#2E7D32" : "#555",
                                                                }}>
                                                                    {l.label}
                                                                </span>
                                                                {lang === l.code && (
                                                                    <div style={{
                                                                        width: 20, height: 20, borderRadius: "50%",
                                                                        background: "#4CAF50",
                                                                        display: "flex", alignItems: "center", justifyContent: "center",
                                                                    }}>
                                                                        <Check size={12} color="white" strokeWidth={3} />
                                                                    </div>
                                                                )}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}

                                                {i < current.items.length - 1 && item.type !== "language" && (
                                                    <div style={{ height: "1px", background: "#F5F5F5", margin: "0 22px" }} />
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
