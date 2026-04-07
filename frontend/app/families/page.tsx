"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Settings, TreePine, ArrowRight, Sparkles } from "lucide-react"
import { getFamilies, createFamily, Family } from "@/services/familyService"
import { isAuthenticated } from "@/lib/auth"
import AppSidebar from "@/components/AppSidebar"
import AdsBanner from "@/components/AdsBanner"
import { apiFetch } from "@/lib/apiFetch"
import API_BASE from "@/services/api"
import { useT } from "@/lib/i18n"
import { useBreakpoint } from "@/lib/useBreakpoint"

export default function FamiliesPage() {
    const router = useRouter()
    const { t } = useT()
    const { isMobile } = useBreakpoint()
    const [families, setFamilies] = useState<Family[]>([])
    const [loading, setLoading] = useState(true)
    const [userPlan, setUserPlan] = useState<"free" | "premium">("free")

    // "Name Your Family Tree" modal
    const [modalOpen, setModalOpen] = useState(false)
    const [treeName, setTreeName] = useState("")
    const [creating, setCreating] = useState(false)
    const [createError, setCreateError] = useState("")

    useEffect(() => {
        if (!isAuthenticated()) { router.push("/auth/login"); return }
        getFamilies()
            .then(list => { setFamilies(list); setLoading(false) })
            .catch(() => setLoading(false))
        apiFetch(`${API_BASE}/auth/me`).then(r => r.json()).then(data => {
            setUserPlan(data.user?.plan ?? "free")
        }).catch(() => {})
    }, [router])

    async function handleCreate() {
        if (!treeName.trim()) return
        setCreating(true)
        setCreateError("")
        try {
            const created = await createFamily(treeName.trim())
            router.push(`/family-tree/${created.id}`)
        } catch {
            setCreateError(t("families_failed_create"))
            setCreating(false)
        }
    }

    const firstFamily = families[0]

    return (
        <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden" }}>
            {/* Sidebar */}
            <AppSidebar activeSection="tree" />

            {/* Main content */}
            <main style={{ flex: 1, overflowY: "auto", background: "#F5FAF5", paddingBottom: isMobile ? "calc(80px + env(safe-area-inset-bottom))" : undefined }}>

                {/* Top bar */}
                <div style={{
                    position: "sticky", top: 0, zIndex: 10,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "20px 32px", background: "rgba(245,250,245,0.95)",
                    backdropFilter: "blur(8px)", borderBottom: "1px solid rgba(0,0,0,0.05)",
                }}>
                    <div>
                        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#1A1A2E", letterSpacing: -0.3 }}>
                            {t("dashboard_welcome")}
                        </h2>
                        <p style={{ fontSize: 13, color: "#888", marginTop: 2 }}>
                            {loading ? "" : families.length === 0
                                ? t("dashboard_no_tree")
                                : t("families_tree_count").replace("{n}", String(families.length))
                            }
                        </p>
                    </div>
                    <button style={{
                        display: "flex", alignItems: "center", gap: 7,
                        padding: "9px 18px", background: "#fff",
                        border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10,
                        fontSize: 13, fontWeight: 600, color: "#555",
                        cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                    }}>
                        <Settings size={15} color="#888" /> {t("dashboard_settings")}
                    </button>
                </div>

                {/* Hero section */}
                <section style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    justifyContent: "center", minHeight: "calc(100vh - 65px)",
                    padding: "40px 24px", textAlign: "center",
                }}>
                    {/* Tree illustration */}
                    <div style={{ position: "relative", width: 160, height: 160, marginBottom: 32 }}>
                        {/* Main circle */}
                        <div style={{
                            width: 100, height: 100,
                            borderRadius: "50%",
                            background: "rgba(255,255,255,0.7)",
                            border: "1px solid rgba(76,175,80,0.15)",
                            boxShadow: "0 8px 32px rgba(76,175,80,0.15)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            position: "absolute", top: "50%", left: "50%",
                            transform: "translate(-50%, -50%)",
                            fontSize: 52,
                        }}>
                            🌳
                        </div>
                        {/* Floating face emojis */}
                        {[
                            { emoji: "😊", top: 2, left: 20 },
                            { emoji: "👴", top: 10, right: 8 },
                            { emoji: "👩", bottom: 20, left: 6 },
                            { emoji: "👦", bottom: 14, right: 20 },
                        ].map((item, i) => (
                            <div key={i} style={{
                                position: "absolute",
                                top: item.top, bottom: item.bottom,
                                left: item.left, right: item.right,
                                width: 36, height: 36,
                                borderRadius: "50%",
                                background: "#fff",
                                border: "1.5px solid rgba(76,175,80,0.2)",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 18,
                            }}>
                                {item.emoji}
                            </div>
                        ))}
                    </div>

                    <h1 style={{ fontSize: 36, fontWeight: 800, color: "#1A1A2E", letterSpacing: -1, lineHeight: 1.15, maxWidth: 480, marginBottom: 14 }}>
                        {t("dashboard_start_legacy")}
                    </h1>
                    <p style={{ fontSize: 15, color: "#777", lineHeight: 1.6, maxWidth: 400, marginBottom: 32 }}>
                        {t("dashboard_legacy_desc")}
                    </p>

                    {/* CTA */}
                    <button
                        onClick={() => setModalOpen(true)}
                        style={{
                            display: "flex", alignItems: "center", gap: 8,
                            padding: "14px 28px",
                            background: "linear-gradient(135deg, #4CAF50, #2E7D32)",
                            color: "#fff", border: "none", borderRadius: 14,
                            fontSize: 15, fontWeight: 700, cursor: "pointer",
                            boxShadow: "0 6px 20px rgba(76,175,80,0.4)",
                            transition: "transform 0.15s, box-shadow 0.15s",
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 10px 28px rgba(76,175,80,0.45)" }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 20px rgba(76,175,80,0.4)" }}
                    >
                        <Plus size={17} strokeWidth={2.5} /> {t("dashboard_create_tree")}
                    </button>

                    {/* Explore link */}
                    {firstFamily && (
                        <button
                            onClick={() => router.push(`/family-tree/${firstFamily.id}`)}
                            style={{
                                marginTop: 16, background: "none", border: "none",
                                display: "flex", alignItems: "center", gap: 4,
                                fontSize: 13, fontWeight: 600, color: "#4CAF50",
                                cursor: "pointer", textDecoration: "none",
                            }}
                        >
                            {t("dashboard_or_open").replace("{name}", firstFamily.name)} <ArrowRight size={13} />
                        </button>
                    )}
                </section>

                {/* Ads banner — visible to free users only */}
                {userPlan === "free" && (
                    <div style={{ padding: "0 24px 24px" }}>
                        <AdsBanner />
                    </div>
                )}

                {/* Divider */}
                <div style={{ height: 1, background: "rgba(0,0,0,0.06)", margin: "0 0 0 0" }} />

                {/* How it works */}
                <section style={{ padding: "60px 40px", background: "#fff" }}>
                    <p style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "#4CAF50", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
                        {t("dashboard_how_it_works")}
                    </p>
                    <h2 style={{ textAlign: "center", fontSize: 26, fontWeight: 800, color: "#1A1A2E", letterSpacing: -0.5, marginBottom: 36 }}>
                        {t("dashboard_four_steps")}
                    </h2>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, maxWidth: 900, margin: "0 auto" }}>
                        {[
                            { n: "01", title: t("dashboard_step1_title"), desc: t("dashboard_step1_desc") },
                            { n: "02", title: t("dashboard_step2_title"), desc: t("dashboard_step2_desc") },
                            { n: "03", title: t("dashboard_step3_title"), desc: t("dashboard_step3_desc") },
                            { n: "04", title: t("dashboard_step4_title"), desc: t("dashboard_step4_desc") },
                        ].map(step => (
                            <div key={step.n} style={{
                                background: "#FAFAFA", borderRadius: 16, padding: "20px 18px 18px",
                                border: "1px solid rgba(0,0,0,0.05)", position: "relative", overflow: "hidden",
                            }}>
                                <span style={{
                                    position: "absolute", top: 8, right: 14,
                                    fontSize: 40, fontWeight: 800, color: "#E8F5E9",
                                    lineHeight: 1, userSelect: "none",
                                }}>
                                    {step.n}
                                </span>
                                <p style={{ fontSize: 13, fontWeight: 700, color: "#1A1A2E", marginBottom: 8, position: "relative" }}>{step.title}</p>
                                <p style={{ fontSize: 12, color: "#888", lineHeight: 1.5, position: "relative" }}>{step.desc}</p>
                                <div style={{ marginTop: 14, position: "relative" }}>
                                    <div style={{
                                        width: 24, height: 24, borderRadius: "50%",
                                        background: "#E8F5E9", display: "flex", alignItems: "center", justifyContent: "center",
                                    }}>
                                        <Plus size={12} color="#4CAF50" strokeWidth={2.5} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Feature pills */}
                    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 14, maxWidth: 700, margin: "40px auto 0" }}>
                        {[
                            { icon: "🌳", title: t("dashboard_feature_tree"),      desc: t("dashboard_feature_tree_desc") },
                            { icon: "👥", title: t("dashboard_feature_unlimited"), desc: t("dashboard_feature_unlimited_desc") },
                            { icon: "🤝", title: t("dashboard_feature_collab"),    desc: t("dashboard_feature_collab_desc") },
                        ].map(f => (
                            <div key={f.title} style={{
                                display: "flex", alignItems: "center", gap: 10,
                                padding: "10px 16px",
                                background: "#F5FAF5", borderRadius: 12,
                                border: "1px solid rgba(76,175,80,0.12)",
                            }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: "50%",
                                    background: "#E8F5E9", display: "flex", alignItems: "center",
                                    justifyContent: "center", fontSize: 18, flexShrink: 0,
                                }}>
                                    {f.icon}
                                </div>
                                <div>
                                    <p style={{ fontSize: 13, fontWeight: 700, color: "#1A1A2E" }}>{f.title}</p>
                                    <p style={{ fontSize: 11, color: "#888" }}>{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>

            {/* "Name Your Family Tree" Modal */}
            {modalOpen && (
                <div
                    style={{
                        position: "fixed", inset: 0, zIndex: 200,
                        background: "rgba(0,0,0,0.35)", backdropFilter: "blur(6px)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        padding: 24,
                    }}
                    onClick={e => { if (e.target === e.currentTarget) { setModalOpen(false); setTreeName(""); setCreateError("") } }}
                >
                    <div style={{
                        background: "#fff", borderRadius: 24,
                        width: "100%", maxWidth: 420,
                        padding: "36px 32px 32px",
                        boxShadow: "0 24px 80px rgba(0,0,0,0.18)",
                        position: "relative",
                    }}>
                        {/* Close */}
                        <button
                            onClick={() => { setModalOpen(false); setTreeName(""); setCreateError("") }}
                            style={{
                                position: "absolute", top: 16, right: 16,
                                width: 32, height: 32, borderRadius: "50%",
                                background: "#F5F5F5", border: "none", cursor: "pointer",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 16, color: "#888",
                            }}
                        >
                            ×
                        </button>

                        {/* Icon */}
                        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                            <div style={{
                                width: 64, height: 64, borderRadius: 20,
                                background: "linear-gradient(135deg, #4CAF50, #2E7D32)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                boxShadow: "0 8px 24px rgba(76,175,80,0.35)",
                            }}>
                                <TreePine size={30} color="#fff" strokeWidth={1.8} />
                            </div>
                        </div>

                        <h3 style={{ textAlign: "center", fontSize: 22, fontWeight: 800, color: "#1A1A2E", marginBottom: 8 }}>
                            {t("dashboard_name_tree")}
                        </h3>
                        <p style={{ textAlign: "center", fontSize: 13, color: "#888", marginBottom: 24, lineHeight: 1.5 }}>
                            {t("dashboard_name_desc")}
                        </p>

                        {/* Input */}
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 8 }}>
                            {t("dashboard_name_tree_label")}
                        </label>
                        <input
                            autoFocus
                            value={treeName}
                            onChange={e => setTreeName(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleCreate()}
                            placeholder={t("dashboard_name_placeholder")}
                            style={{
                                width: "100%", padding: "13px 16px",
                                border: treeName ? "2px solid #4CAF50" : "2px solid #E0E0E0",
                                borderRadius: 12, fontSize: 14, outline: "none",
                                background: "#fff", color: "#1A1A2E",
                                boxSizing: "border-box", transition: "border-color 0.15s",
                            }}
                        />

                        {/* Hint */}
                        <div style={{
                            marginTop: 12, padding: "10px 14px",
                            background: "#F0F8F1", borderRadius: 10,
                            border: "1px solid #DCF0DC",
                            display: "flex", alignItems: "flex-start", gap: 8,
                        }}>
                            <Sparkles size={15} color="#4CAF50" style={{ marginTop: 1, flexShrink: 0 }} />
                            <p style={{ fontSize: 12, color: "#4CAF50", lineHeight: 1.5 }}>
                                {t("dashboard_name_hint")}
                            </p>
                        </div>

                        {createError && (
                            <p style={{ marginTop: 10, fontSize: 12, color: "#f44336", textAlign: "center" }}>{createError}</p>
                        )}

                        {/* Continue button */}
                        <button
                            onClick={handleCreate}
                            disabled={!treeName.trim() || creating}
                            style={{
                                marginTop: 20, width: "100%", padding: "14px",
                                background: treeName.trim() ? "linear-gradient(135deg, #4CAF50, #2E7D32)" : "#E0E0E0",
                                color: treeName.trim() ? "#fff" : "#aaa",
                                border: "none", borderRadius: 12,
                                fontSize: 15, fontWeight: 700, cursor: treeName.trim() ? "pointer" : "not-allowed",
                                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                                boxShadow: treeName.trim() ? "0 4px 16px rgba(76,175,80,0.3)" : "none",
                                transition: "background 0.2s, color 0.2s",
                            }}
                        >
                            {creating ? t("dashboard_creating") : <>{t("dashboard_continue")} <ArrowRight size={16} /></>}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
