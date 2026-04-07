"use client"

import { useState } from "react"
import { X, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { useT } from "@/lib/i18n"

interface Props {
    position?: "top" | "bottom" | "inline"
}

export default function AdsBanner({ position = "inline" }: Props) {
    const [dismissed, setDismissed] = useState(false)
    const router = useRouter()
    const { t } = useT()

    if (dismissed) return null

    const isSticky = position === "top" || position === "bottom"

    return (
        <div
            style={{
                position: isSticky ? "sticky" : "relative",
                top: position === "top" ? 0 : undefined,
                bottom: position === "bottom" ? 0 : undefined,
                zIndex: isSticky ? 50 : undefined,
                background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
                borderRadius: isSticky ? 0 : 14,
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                gap: 14,
                boxShadow: isSticky
                    ? "0 4px 20px rgba(0,0,0,0.2)"
                    : "0 2px 12px rgba(0,0,0,0.12)",
                border: isSticky ? "none" : "1px solid rgba(255,255,255,0.08)",
                overflow: "hidden",
            }}
        >
            {/* Decorative glow */}
            <div style={{
                position: "absolute", top: -30, right: 60,
                width: 120, height: 120, borderRadius: "50%",
                background: "rgba(76,175,80,0.12)", pointerEvents: "none",
            }} />

            {/* Ad icon */}
            <div style={{
                width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20,
            }}>
                📢
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                    fontSize: 13, fontWeight: 700, color: "#FFFFFF",
                    marginBottom: 2, letterSpacing: 0.1,
                }}>
                    {t("ads_title")}
                </p>
                <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.55)", lineHeight: 1.4 }}>
                    {t("ads_subtitle")}
                </p>
            </div>

            {/* Upgrade CTA */}
            <button
                onClick={() => router.push("/me")}
                style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 14px", flexShrink: 0,
                    background: "linear-gradient(135deg, #4CAF50, #2E7D32)",
                    color: "#fff", border: "none", borderRadius: 9,
                    fontSize: 12, fontWeight: 700, cursor: "pointer",
                    boxShadow: "0 3px 12px rgba(76,175,80,0.4)",
                    whiteSpace: "nowrap",
                }}
            >
                <Sparkles size={13} />
                {t("ads_upgrade_cta")}
            </button>

            {/* Dismiss */}
            <button
                onClick={() => setDismissed(true)}
                style={{
                    background: "none", border: "none", cursor: "pointer",
                    padding: 4, color: "rgba(255,255,255,0.35)",
                    flexShrink: 0, display: "flex", alignItems: "center",
                }}
            >
                <X size={14} />
            </button>
        </div>
    )
}
