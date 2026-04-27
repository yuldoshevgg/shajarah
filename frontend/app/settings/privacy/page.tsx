"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Shield, ArrowLeft, Lock, Users, Globe, Check } from "lucide-react"
import { apiFetch } from "@/lib/apiFetch"
import API_BASE from "@/services/api"
import AppSidebar from "@/components/AppSidebar"
import { useT } from "@/lib/i18n"
import { useBreakpoint } from "@/lib/useBreakpoint"

type Visibility = "private" | "family_only" | "public"

export default function PrivacyPage() {
    const router = useRouter()
    const { t } = useT()
    const { isMobile } = useBreakpoint()

    const [visibility, setVisibility] = useState<Visibility>("family_only")
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        apiFetch(`${API_BASE}/auth/privacy`)
            .then(r => r.json())
            .then(d => setVisibility(d.visibility ?? "family_only"))
            .catch(() => {})
            .finally(() => setLoading(false))
    }, [])

    const handleSave = async () => {
        setSaving(true); setSaved(false)
        try {
            await apiFetch(`${API_BASE}/auth/privacy`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ visibility }),
            })
            setSaved(true)
            setTimeout(() => setSaved(false), 2500)
        } catch { /* ignore */ } finally {
            setSaving(false)
        }
    }

    const OPTIONS: { value: Visibility; icon: React.ElementType; label: string; desc: string; color: string }[] = [
        { value: "private",     icon: Lock,  label: t("sidebar_privacy_private"), desc: t("sidebar_privacy_private_desc"), color: "#F44336" },
        { value: "family_only", icon: Users, label: t("sidebar_privacy_family"),  desc: t("sidebar_privacy_family_desc"),  color: "#FF9800" },
        { value: "public",      icon: Globe, label: t("sidebar_privacy_public"),  desc: t("sidebar_privacy_public_desc"),  color: "#4CAF50" },
    ]

    return (
        <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden" }}>
            <AppSidebar activeSection="settings" />

            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <header style={{
                    padding: isMobile ? "14px 16px" : "20px 32px", background: "#FFFFFF",
                    display: "flex", alignItems: "center", gap: 14,
                    boxShadow: "0 2px 12px rgba(0,0,0,0.05)", flexShrink: 0,
                }}>
                    <button onClick={() => router.back()} style={{
                        width: 40, height: 40, borderRadius: 10, border: "none",
                        background: "#F5F5F5", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                        <ArrowLeft size={18} color="#555" />
                    </button>
                    <div style={{
                        width: 44, height: 44, borderRadius: 12, background: "#E8F5E9",
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                        <Shield size={22} color="#4CAF50" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1A1A2E", letterSpacing: -0.5 }}>
                            {t("settings_privacy")}
                        </h1>
                        <p style={{ fontSize: 13, color: "#9E9E9E", marginTop: 2 }}>{t("settings_privacy_subtitle")}</p>
                    </div>
                </header>

                <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "16px" : "32px", background: "#F7F5F0" }}>
                    <div style={{ maxWidth: 540, margin: "0 auto" }}>

                        <div style={{ background: "white", borderRadius: 20, padding: "28px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: "#9E9E9E", letterSpacing: 0.5, marginBottom: 16, textTransform: "uppercase" }}>
                                {t("privacy_profile_visibility")}
                            </p>

                            {loading ? (
                                <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <div style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid #E0E0E0", borderTopColor: "#4CAF50", animation: "spin 0.7s linear infinite" }} />
                                </div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                    {OPTIONS.map(opt => {
                                        const active = visibility === opt.value
                                        return (
                                            <button
                                                key={opt.value}
                                                onClick={() => { setVisibility(opt.value); setSaved(false) }}
                                                style={{
                                                    display: "flex", alignItems: "center", gap: 16,
                                                    padding: "16px 18px", borderRadius: 14, textAlign: "left",
                                                    border: `2px solid ${active ? opt.color : "#EBEBEB"}`,
                                                    background: active ? `${opt.color}0D` : "#FAFAFA",
                                                    cursor: "pointer", transition: "all 0.15s",
                                                }}
                                            >
                                                <div style={{
                                                    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                                                    background: active ? `${opt.color}22` : "#F0F0F0",
                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                }}>
                                                    <opt.icon size={20} color={active ? opt.color : "#9E9E9E"} />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <p style={{ fontSize: 15, fontWeight: 700, color: active ? opt.color : "#1A1A2E" }}>{opt.label}</p>
                                                    <p style={{ fontSize: 13, color: "#9E9E9E", marginTop: 2 }}>{opt.desc}</p>
                                                </div>
                                                {active && (
                                                    <div style={{
                                                        width: 24, height: 24, borderRadius: "50%",
                                                        background: opt.color, flexShrink: 0,
                                                        display: "flex", alignItems: "center", justifyContent: "center",
                                                    }}>
                                                        <Check size={14} color="white" strokeWidth={3} />
                                                    </div>
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            )}

                            <button
                                onClick={handleSave}
                                disabled={saving || loading}
                                style={{
                                    width: "100%", marginTop: 24, padding: "14px",
                                    background: saved
                                        ? "#E8F5E9"
                                        : saving ? "#A5D6A7" : "linear-gradient(135deg, #2E7D32, #4CAF50)",
                                    color: saved ? "#2E7D32" : "white",
                                    border: saved ? "2px solid #4CAF50" : "none",
                                    borderRadius: 12, fontSize: 15, fontWeight: 700,
                                    cursor: saving || loading ? "not-allowed" : "pointer",
                                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                                    transition: "all 0.2s",
                                }}
                            >
                                {saved ? <><Check size={16} />{t("privacy_saved")}</> : saving ? "..." : t("privacy_save")}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
    )
}
