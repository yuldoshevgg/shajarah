"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Camera, Calendar, Users, X, Search } from "lucide-react"
import { isAuthenticated, getPersonId } from "@/lib/auth"
import { getFamilies, Family } from "@/services/familyService"
import { apiFetch } from "@/lib/apiFetch"
import API_BASE from "@/services/api"
import AppSidebar from "@/components/AppSidebar"
import { useT } from "@/lib/i18n"
import { useBreakpoint } from "@/lib/useBreakpoint"

interface FamilyStory {
    id: string
    person_id: string
    title: string
    content: string
    cover_url?: string | null
    created_at: string
    first_name: string
    last_name: string
}

const CARD_COLORS = [
    "linear-gradient(135deg, #4CAF50, #2E7D32)",
    "linear-gradient(135deg, #1976D2, #0D47A1)",
    "linear-gradient(135deg, #E91E63, #880E4F)",
    "linear-gradient(135deg, #FF9800, #E65100)",
    "linear-gradient(135deg, #9C27B0, #4A148C)",
]

export default function MemoriesPage() {
    const router = useRouter()
    const { t } = useT()
    const { isMobile } = useBreakpoint()
    const [family, setFamily] = useState<Family | null>(null)
    const [stories, setStories] = useState<FamilyStory[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [showAddPanel, setShowAddPanel] = useState(false)
    const [selectedStory, setSelectedStory] = useState<FamilyStory | null>(null)

    // Add form state
    const [title, setTitle] = useState("")
    const [content, setContent] = useState("")
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState("")
    const [photoFile, setPhotoFile] = useState<File | null>(null)
    const [photoPreview, setPhotoPreview] = useState<string | null>(null)
    const photoInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (!isAuthenticated()) { router.push("/auth/login"); return }
        getFamilies().then(fs => {
            const f = fs[0]
            if (!f) { setLoading(false); return }
            setFamily(f)
            apiFetch(`${API_BASE}/families/${f.id}/stories`)
                .then(r => r.json())
                .then(d => setStories(d.stories ?? []))
                .catch(() => {})
                .finally(() => setLoading(false))
        }).catch(() => setLoading(false))
    }, [router])

    const filtered = stories.filter(s =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.content.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null
        setPhotoFile(file)
        if (file) {
            const url = URL.createObjectURL(file)
            setPhotoPreview(url)
        } else {
            setPhotoPreview(null)
        }
    }

    const handleSave = async () => {
        if (!title.trim() || !content.trim()) return
        const personId = getPersonId()
        if (!personId) { setSaveError(t("dashboard_no_person")); return }
        setSaving(true)
        setSaveError("")
        try {
            const form = new FormData()
            form.append("person_id", personId)
            form.append("title", title.trim())
            form.append("content", content.trim())
            if (photoFile) form.append("photo", photoFile)

            const res = await apiFetch(`${API_BASE}/stories`, { method: "POST", body: form })
            if (!res.ok) throw new Error("Failed to save")
            if (family) {
                apiFetch(`${API_BASE}/families/${family.id}/stories`)
                    .then(r => r.json())
                    .then(d => setStories(d.stories ?? []))
                    .catch(() => {})
            }
            setTitle("")
            setContent("")
            setPhotoFile(null)
            setPhotoPreview(null)
            setShowAddPanel(false)
        } catch {
            setSaveError(t("memories_save"))
        } finally {
            setSaving(false)
        }
    }

    const memberCount = new Set(stories.map(s => s.person_id)).size
    const yearsSpan = stories.length > 0
        ? new Date().getFullYear() - Math.min(...stories.map(s => new Date(s.created_at).getFullYear()))
        : 0

    return (
        <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden" }}>
            <AppSidebar activeSection="memories" activeFamilyId={family?.id} />

            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {/* Header */}
                <header style={{
                    padding: isMobile ? "14px 16px" : "20px 32px", background: "#FFFFFF",
                    display: "flex", flexDirection: isMobile ? "column" : "row",
                    alignItems: isMobile ? "stretch" : "center",
                    justifyContent: "space-between", gap: isMobile ? 10 : 0,
                    boxShadow: "0 2px 12px rgba(0,0,0,0.05)", flexShrink: 0, zIndex: 10,
                }}>
                    <div>
                        <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: "#1A1A2E", letterSpacing: -0.5 }}>{t("memories_title")}</h1>
                        <p style={{ fontSize: 13, color: "#9E9E9E", marginTop: 3 }}>{t("memories_subtitle")}</p>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#F5F5F5", borderRadius: 10, padding: "9px 14px", border: "1px solid #EBEBEB", flex: isMobile ? 1 : undefined }}>
                            <Search size={15} color="#9E9E9E" />
                            <input
                                placeholder={t("memories_search")}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                style={{ background: "none", border: "none", outline: "none", fontSize: 14, color: "#1A1A2E", width: isMobile ? "100%" : 180, minWidth: 0 }}
                            />
                        </div>
                        <button
                            onClick={() => setShowAddPanel(s => !s)}
                            style={{
                                display: "flex", alignItems: "center", gap: 8,
                                padding: isMobile ? "10px 14px" : "10px 20px",
                                background: "linear-gradient(135deg, #4CAF50, #2E7D32)",
                                color: "white", border: "none", borderRadius: 10,
                                fontSize: 14, fontWeight: 700, cursor: "pointer",
                                boxShadow: "0 4px 14px rgba(76,175,80,0.35)", flexShrink: 0,
                            }}
                        >
                            <Plus size={16} strokeWidth={2.5} />{!isMobile && ` ${t("memories_add")}`}
                        </button>
                    </div>
                </header>

                {/* Body */}
                <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "16px" : "28px 32px", paddingBottom: isMobile ? "calc(80px + env(safe-area-inset-bottom))" : undefined, background: "#F7F5F0" }}>
                    <div style={{ maxWidth: 1200, margin: "0 auto" }}>

                        {/* Stats */}
                        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: isMobile ? 10 : 16, marginBottom: isMobile ? 16 : 28 }}>
                            {[
                                { label: t("memories_total"),          value: stories.length,         emoji: "📸", color: "#E3F2FD" },
                                { label: t("memories_family_members"), value: memberCount,             emoji: "👥", color: "#E8F5E9" },
                                { label: t("memories_years_covered"),  value: yearsSpan > 0 ? `${yearsSpan}+` : "—", emoji: "🌿", color: "#FFF8E1" },
                                { label: t("memories_generations"),    value: 3,                       emoji: "🌳", color: "#F3E5F5" },
                            ].map(s => (
                                <div key={s.label} style={{
                                    background: "#FFFFFF", borderRadius: 16, padding: isMobile ? "14px 16px" : "20px 22px",
                                    boxShadow: "0 2px 10px rgba(0,0,0,0.05)", display: "flex", alignItems: "center", gap: isMobile ? 10 : 14,
                                }}>
                                    <div style={{ width: isMobile ? 40 : 48, height: isMobile ? 40 : 48, borderRadius: 14, background: s.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: isMobile ? 20 : 24, flexShrink: 0 }}>
                                        {s.emoji}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <p style={{ fontSize: isMobile ? 22 : 26, fontWeight: 800, color: "#1A1A2E", lineHeight: 1 }}>{s.value}</p>
                                        <p style={{ fontSize: 11, color: "#9E9E9E", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Add Memory Panel */}
                        {showAddPanel && (
                            <div style={{
                                background: "linear-gradient(135deg, #2E7D32, #4CAF50)",
                                borderRadius: 20, padding: 28, marginBottom: 28, position: "relative",
                            }}>
                                <button
                                    onClick={() => setShowAddPanel(false)}
                                    style={{
                                        position: "absolute", top: 16, right: 16,
                                        background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%",
                                        width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                                    }}
                                >
                                    <X size={16} color="#fff" />
                                </button>
                                <h3 style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 20 }}>{t("memories_add_title")}</h3>
                                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
                                    <input
                                        placeholder={t("memories_title_placeholder")}
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 12, padding: "12px 16px", fontSize: 15, color: "#fff", outline: "none" }}
                                    />
                                    <input
                                        placeholder={t("memories_date_placeholder")}
                                        style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 12, padding: "12px 16px", fontSize: 15, color: "#fff", outline: "none" }}
                                    />
                                    <textarea
                                        placeholder={t("memories_story_placeholder")}
                                        rows={3}
                                        value={content}
                                        onChange={e => setContent(e.target.value)}
                                        style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 12, padding: "12px 16px", fontSize: 15, color: "#fff", outline: "none", resize: "none", gridColumn: "1 / -1", fontFamily: "inherit" }}
                                    />
                                </div>
                                {saveError && <p style={{ color: "#FFCDD2", fontSize: 13, marginTop: 10 }}>{saveError}</p>}
                                <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                                    <input
                                        ref={photoInputRef}
                                        type="file"
                                        accept="image/*"
                                        style={{ display: "none" }}
                                        onChange={handlePhotoSelect}
                                    />
                                    <button
                                        onClick={() => photoInputRef.current?.click()}
                                        style={{
                                            flex: 1, padding: 12, borderRadius: 12,
                                            background: photoPreview ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.15)",
                                            border: photoPreview ? "1px solid rgba(255,255,255,0.6)" : "1px solid rgba(255,255,255,0.3)",
                                            color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
                                            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                                            overflow: "hidden", position: "relative",
                                        }}
                                    >
                                        {photoPreview
                                            ? <><img src={photoPreview} alt="" style={{ width: 22, height: 22, borderRadius: 4, objectFit: "cover" }} />{photoFile?.name}</>
                                            : <><Camera size={16} /> {t("memories_upload_photo")}</>
                                        }
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={!title.trim() || !content.trim() || saving}
                                        style={{ flex: 1, padding: 12, background: "#FFFFFF", border: "none", borderRadius: 12, color: "#2E7D32", fontSize: 14, fontWeight: 800, cursor: title.trim() && content.trim() ? "pointer" : "not-allowed" }}
                                    >
                                        {saving ? t("memories_saving") : t("memories_save")}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Grid */}
                        <div style={{ marginBottom: 16 }}>
                            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1A1A2E", marginBottom: 16 }}>
                                {searchQuery ? `${t("memories_results_for")} "${searchQuery}"` : t("memories_all")}
                                <span style={{ fontSize: 14, color: "#9E9E9E", fontWeight: 500, marginLeft: 8 }}>({filtered.length})</span>
                            </h2>
                        </div>

                        {loading ? (
                            <p style={{ textAlign: "center", color: "#9E9E9E", marginTop: 40 }}>{t("memories_loading")}</p>
                        ) : (
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 20 }}>
                                {filtered.map((story, idx) => (
                                    <div
                                        key={story.id}
                                        onClick={() => setSelectedStory(story)}
                                        style={{ background: "white", borderRadius: 20, overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.07)", cursor: "pointer", transition: "transform 0.2s, box-shadow 0.2s" }}
                                        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.12)" }}
                                        onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.07)" }}
                                    >
                                        {/* Color banner */}
                                        <div style={{ height: 140, background: CARD_COLORS[idx % CARD_COLORS.length], display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                                            {story.cover_url
                                                ? <img src={story.cover_url} alt={story.title} style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />
                                                : <span style={{ fontSize: 52, opacity: 0.4 }}>📖</span>
                                            }
                                            {/* Date badge */}
                                            <div style={{ position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(6px)", borderRadius: 8, padding: "4px 10px", display: "flex", alignItems: "center", gap: 5 }}>
                                                <Calendar size={11} color="#fff" />
                                                <span style={{ fontSize: 11, color: "#fff", fontWeight: 600 }}>
                                                    {new Date(story.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                                </span>
                                            </div>
                                            {/* Avatar */}
                                            <div style={{ position: "absolute", bottom: 12, left: 14, display: "flex", alignItems: "center", gap: 8 }}>
                                                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.3)", border: "2px solid rgba(255,255,255,0.6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff" }}>
                                                    {story.first_name?.[0] ?? "?"}
                                                </div>
                                                <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>{story.first_name} {story.last_name}</span>
                                            </div>
                                        </div>

                                        <div style={{ padding: "18px 20px" }}>
                                            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#1A1A2E", marginBottom: 8 }}>{story.title}</h3>
                                            <p style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.6, marginBottom: 12, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                                {story.content}
                                            </p>
                                            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                                <Users size={13} color="#9E9E9E" />
                                                <span style={{ fontSize: 12, color: "#9E9E9E" }}>1 person</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Add card */}
                                <div
                                    onClick={() => setShowAddPanel(true)}
                                    style={{ background: "white", borderRadius: 20, padding: "40px 24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, cursor: "pointer", border: "2.5px dashed #C8E6C9", transition: "background 0.2s, border-color 0.2s", minHeight: 220 }}
                                    onMouseEnter={e => { e.currentTarget.style.background = "#F0F8F1"; e.currentTarget.style.borderColor = "#4CAF50" }}
                                    onMouseLeave={e => { e.currentTarget.style.background = "white"; e.currentTarget.style.borderColor = "#C8E6C9" }}
                                >
                                    <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#E8F5E9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <Plus size={26} color="#4CAF50" />
                                    </div>
                                    <p style={{ fontSize: 16, fontWeight: 700, color: "#555" }}>{t("memories_create")}</p>
                                    <p style={{ fontSize: 13, color: "#9E9E9E", textAlign: "center", lineHeight: 1.5 }}>
                                        {t("memories_empty_desc")}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Detail modal */}
            {selectedStory && (
                <div
                    onClick={() => setSelectedStory(null)}
                    style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{ background: "#fff", borderRadius: isMobile ? 20 : 24, overflow: "hidden", width: isMobile ? "calc(100vw - 32px)" : 640, maxHeight: isMobile ? "90vh" : "85vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.3)" }}
                    >
                        <div style={{ height: 200, background: CARD_COLORS[stories.indexOf(selectedStory) % CARD_COLORS.length], display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                            {selectedStory.cover_url
                                ? <img src={selectedStory.cover_url} alt={selectedStory.title} style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />
                                : <span style={{ fontSize: 72, opacity: 0.4 }}>📖</span>
                            }
                            <button
                                onClick={() => setSelectedStory(null)}
                                style={{ position: "absolute", top: 16, right: 16, background: "rgba(0,0,0,0.4)", border: "none", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                            >
                                <X size={18} color="#fff" />
                            </button>
                        </div>
                        <div style={{ padding: 28 }}>
                            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#1A1A2E", marginBottom: 10 }}>{selectedStory.title}</h2>
                            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 18 }}>
                                <Calendar size={14} color="#9E9E9E" />
                                <span style={{ fontSize: 13, color: "#9E9E9E" }}>
                                    {new Date(selectedStory.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                                </span>
                            </div>
                            <p style={{ fontSize: 15, color: "#555", lineHeight: 1.7, marginBottom: 24 }}>{selectedStory.content}</p>
                            <div>
                                <p style={{ fontSize: 13, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>{t("memories_written_by")}</p>
                                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#F0F8F1", borderRadius: 10, padding: "8px 14px" }}>
                                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#4CAF50", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 12 }}>
                                        {selectedStory.first_name?.[0] ?? "?"}
                                    </div>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1A2E" }}>{selectedStory.first_name} {selectedStory.last_name}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
