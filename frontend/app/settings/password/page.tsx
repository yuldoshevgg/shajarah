"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Lock, Eye, EyeOff, ArrowLeft, Check } from "lucide-react"
import { apiFetch } from "@/lib/apiFetch"
import API_BASE from "@/services/api"
import AppSidebar from "@/components/AppSidebar"
import { useT } from "@/lib/i18n"
import { useBreakpoint } from "@/lib/useBreakpoint"

function PasswordField({
    label, value, onChange, show, onToggle,
}: {
    label: string
    value: string
    onChange: (v: string) => void
    show: boolean
    onToggle: () => void
}) {
    const [focused, setFocused] = useState(false)
    return (
        <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#444", marginBottom: 8 }}>
                {label}
            </label>
            <div style={{ position: "relative" }}>
                <input
                    type={show ? "text" : "password"}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    required
                    style={{
                        width: "100%", padding: "13px 48px 13px 16px",
                        fontSize: 15, color: "#1A1A2E",
                        border: `2px solid ${focused ? "#4CAF50" : "#E0E0E0"}`,
                        borderRadius: 12, outline: "none",
                        background: focused ? "#FFFFFF" : "#F8F8F8",
                        boxSizing: "border-box",
                        transition: "border-color 0.15s, background 0.15s",
                    }}
                />
                <button
                    type="button"
                    onClick={onToggle}
                    style={{
                        position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                        background: "none", border: "none", cursor: "pointer", padding: 4,
                        display: "flex", alignItems: "center", color: focused ? "#4CAF50" : "#BDBDBD",
                        transition: "color 0.15s",
                    }}
                >
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>
        </div>
    )
}

export default function ChangePasswordPage() {
    const router = useRouter()
    const { t } = useT()
    const { isMobile } = useBreakpoint()

    const [current, setCurrent] = useState("")
    const [next, setNext] = useState("")
    const [confirm, setConfirm] = useState("")
    const [showCurrent, setShowCurrent] = useState(false)
    const [showNext, setShowNext] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        if (next.length < 8) { setError(t("change_password_min")); return }
        if (next !== confirm) { setError(t("change_password_mismatch")); return }
        setLoading(true)
        try {
            const res = await apiFetch(`${API_BASE}/auth/change-password`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ current_password: current, new_password: next }),
            })
            if (!res.ok) {
                const data = await res.json()
                setError(data.error === "current password is incorrect" ? t("change_password_wrong") : data.error)
                return
            }
            setSuccess(true)
            setCurrent(""); setNext(""); setConfirm("")
        } catch {
            setError("Network error")
        } finally {
            setLoading(false)
        }
    }

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
                        <Lock size={22} color="#4CAF50" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1A1A2E", letterSpacing: -0.5 }}>
                            {t("settings_change_password")}
                        </h1>
                        <p style={{ fontSize: 13, color: "#9E9E9E", marginTop: 2 }}>
                            {t("settings_change_password_subtitle")}
                        </p>
                    </div>
                </header>

                <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "16px" : "32px", background: "#F7F5F0" }}>
                    <div style={{ maxWidth: 480, margin: "0 auto" }}>
                        <form onSubmit={handleSubmit} onChange={() => { setError(""); setSuccess(false) }}>
                            <div style={{
                                background: "white", borderRadius: 20, padding: "28px",
                                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                                display: "flex", flexDirection: "column", gap: 20,
                            }}>
                                <PasswordField
                                    label={t("change_password_current")}
                                    value={current} onChange={setCurrent}
                                    show={showCurrent} onToggle={() => setShowCurrent(v => !v)}
                                />
                                <PasswordField
                                    label={t("change_password_new")}
                                    value={next} onChange={setNext}
                                    show={showNext} onToggle={() => setShowNext(v => !v)}
                                />
                                <PasswordField
                                    label={t("change_password_confirm")}
                                    value={confirm} onChange={setConfirm}
                                    show={showConfirm} onToggle={() => setShowConfirm(v => !v)}
                                />

                                {error && (
                                    <div style={{
                                        padding: "12px 16px", borderRadius: 10,
                                        background: "#FFEBEE", color: "#C62828", fontSize: 14,
                                    }}>
                                        {error}
                                    </div>
                                )}

                                {success && (
                                    <div style={{
                                        padding: "12px 16px", borderRadius: 10,
                                        background: "#E8F5E9", color: "#2E7D32", fontSize: 14,
                                        display: "flex", alignItems: "center", gap: 8,
                                    }}>
                                        <Check size={16} />
                                        {t("change_password_success")}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    style={{
                                        width: "100%", padding: "14px",
                                        background: loading ? "#A5D6A7" : "linear-gradient(135deg, #2E7D32, #4CAF50)",
                                        color: "white", border: "none", borderRadius: 12,
                                        fontSize: 15, fontWeight: 700,
                                        cursor: loading ? "not-allowed" : "pointer",
                                    }}
                                >
                                    {loading ? "..." : t("change_password_save")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}
