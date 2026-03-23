"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, Cake, Heart, ChevronRight, Clock } from "lucide-react"
import { isAuthenticated } from "@/lib/auth"
import { getFamilies, Family } from "@/services/familyService"
import { apiFetch } from "@/lib/apiFetch"
import API_BASE from "@/services/api"
import AppSidebar from "@/components/AppSidebar"

interface Reminder {
    id: string
    type: "birthday" | "anniversary"
    label: string
    person_id: string
    first_name: string
    last_name: string
    date: string
    days_until: number
}

function getDaysLabel(days: number) {
    if (days === 0) return "Today! 🎉"
    if (days === 1) return "Tomorrow"
    if (days <= 7) return `In ${days} days`
    if (days <= 30) return `In ${Math.floor(days / 7)} weeks`
    return `In ${Math.floor(days / 30)} months`
}

function getDaysColor(days: number) {
    if (days <= 1) return "#FF5252"
    if (days <= 7) return "#FF9800"
    if (days <= 30) return "#4CAF50"
    return "#888"
}

function ReminderSection({
    title, icon: Icon, color, bgColor, reminders,
}: {
    title: string
    icon: React.ElementType
    color: string
    bgColor: string
    reminders: Reminder[]
}) {
    return (
        <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: bgColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={18} color={color} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1A1A2E" }}>{title}</h3>
                <span style={{ marginLeft: "auto", fontSize: 12, color, fontWeight: 700, background: bgColor, padding: "4px 12px", borderRadius: 20 }}>
                    {reminders.length} total
                </span>
            </div>
            <div style={{ background: "white", borderRadius: 18, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
                {reminders.length === 0 ? (
                    <p style={{ padding: "24px", textAlign: "center", fontSize: 13, color: "#9E9E9E" }}>No {title.toLowerCase()} yet</p>
                ) : reminders.map((r, i) => {
                    const daysColor = getDaysColor(r.days_until)
                    return (
                        <div
                            key={r.id}
                            style={{
                                padding: "16px 20px", display: "flex", alignItems: "center", gap: 14,
                                borderBottom: i < reminders.length - 1 ? "1px solid #F5F5F5" : "none",
                                cursor: "pointer", transition: "background 0.15s",
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = "#FAFAFA")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
                            <div style={{
                                width: 48, height: 48, borderRadius: "50%", background: bgColor, flexShrink: 0,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 20, fontWeight: 700, color,
                            }}>
                                {r.first_name[0]}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 15, fontWeight: 600, color: "#1A1A2E" }}>{r.label}</p>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                                    <Clock size={12} color="#9E9E9E" />
                                    <p style={{ fontSize: 12, color: "#9E9E9E" }}>{r.date}</p>
                                </div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                                <span style={{
                                    fontSize: 12, fontWeight: 700, color: daysColor,
                                    background: `${daysColor}18`, padding: "4px 12px",
                                    borderRadius: 20, whiteSpace: "nowrap",
                                }}>
                                    {getDaysLabel(r.days_until)}
                                </span>
                                <ChevronRight size={14} color="#C8C8C8" />
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default function RemindersPage() {
    const router = useRouter()
    const [family, setFamily] = useState<Family | null>(null)
    const [reminders, setReminders] = useState<Reminder[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!isAuthenticated()) { router.push("/auth/login"); return }
        getFamilies().then(fs => {
            const f = fs[0]
            if (!f) { setLoading(false); return }
            setFamily(f)
            apiFetch(`${API_BASE}/families/${f.id}/reminders`)
                .then(r => r.json())
                .then(d => setReminders(d.reminders ?? []))
                .catch(() => {})
                .finally(() => setLoading(false))
        }).catch(() => setLoading(false))
    }, [router])

    const birthdays = reminders.filter(r => r.type === "birthday")
    const anniversaries = reminders.filter(r => r.type === "anniversary")
    const upcoming = reminders.slice(0, 3)
    const thisMonth = reminders.filter(r => r.days_until <= 30)

    return (
        <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden" }}>
            <AppSidebar activeSection="reminders" activeFamilyId={family?.id} />

            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {/* Header */}
                <header style={{
                    padding: "20px 32px", background: "#FFFFFF",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.05)", flexShrink: 0, zIndex: 10,
                }}>
                    <div>
                        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1A1A2E", letterSpacing: -0.5 }}>Reminders</h1>
                        <p style={{ fontSize: 13, color: "#9E9E9E", marginTop: 3 }}>Never miss an important family date</p>
                    </div>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: "#FFF8E1", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Bell size={20} color="#FF9800" />
                    </div>
                </header>

                {/* Body */}
                <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px", background: "#F7F5F0" }}>
                    <div style={{ maxWidth: 1100, margin: "0 auto" }}>

                        {loading ? (
                            <p style={{ textAlign: "center", color: "#9E9E9E", marginTop: 80 }}>Loading reminders…</p>
                        ) : (
                            <>
                                {/* Top grid */}
                                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 20, marginBottom: 28 }}>
                                    {/* Upcoming banner */}
                                    <div style={{ background: "linear-gradient(135deg, #FF9800, #F57C00)", borderRadius: 22, padding: "24px 28px" }}>
                                        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>
                                            Coming Up Soon
                                        </p>
                                        {upcoming.length === 0 ? (
                                            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.8)" }}>No upcoming reminders</p>
                                        ) : (
                                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                                {upcoming.map(r => (
                                                    <div key={r.id} style={{
                                                        background: "rgba(255,255,255,0.15)", borderRadius: 14,
                                                        padding: "12px 16px", display: "flex", alignItems: "center", gap: 12,
                                                        backdropFilter: "blur(4px)",
                                                    }}>
                                                        <div style={{
                                                            width: 40, height: 40, borderRadius: "50%",
                                                            background: "rgba(255,255,255,0.3)",
                                                            display: "flex", alignItems: "center", justifyContent: "center",
                                                            fontSize: 16, fontWeight: 700, color: "#fff",
                                                        }}>
                                                            {r.first_name[0]}
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <p style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{r.label}</p>
                                                            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 1 }}>
                                                                {r.type === "birthday" ? "🎂" : "💍"} {r.date}
                                                            </p>
                                                        </div>
                                                        <span style={{
                                                            fontSize: 12, fontWeight: 700, color: "#fff",
                                                            background: "rgba(255,255,255,0.2)",
                                                            padding: "4px 12px", borderRadius: 20, flexShrink: 0,
                                                        }}>
                                                            {getDaysLabel(r.days_until)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Stats */}
                                    <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 200 }}>
                                        {[
                                            { label: "Birthdays",     value: birthdays.length,     emoji: "🎂", color: "#FCE4EC" },
                                            { label: "Anniversaries", value: anniversaries.length, emoji: "💍", color: "#F3E5F5" },
                                            { label: "This Month",    value: thisMonth.length,     emoji: "📅", color: "#E8F5E9" },
                                        ].map(s => (
                                            <div key={s.label} style={{
                                                background: "#FFFFFF", borderRadius: 16, padding: "16px 20px",
                                                display: "flex", alignItems: "center", gap: 12,
                                                boxShadow: "0 2px 10px rgba(0,0,0,0.05)", flex: 1,
                                            }}>
                                                <div style={{ width: 44, height: 44, borderRadius: 12, background: s.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                                                    {s.emoji}
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: 24, fontWeight: 800, color: "#1A1A2E", lineHeight: 1 }}>{s.value}</p>
                                                    <p style={{ fontSize: 12, color: "#9E9E9E", marginTop: 3 }}>{s.label}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Two-column sections */}
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                                    <ReminderSection
                                        title="Birthdays"
                                        icon={Cake}
                                        color="#E91E63"
                                        bgColor="#FCE4EC"
                                        reminders={birthdays}
                                    />
                                    <ReminderSection
                                        title="Anniversaries"
                                        icon={Heart}
                                        color="#9C27B0"
                                        bgColor="#F3E5F5"
                                        reminders={anniversaries}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
