"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/lib/apiFetch"
import API_BASE from "@/services/api"
import { useT } from "@/lib/i18n"

interface ArchivePerson {
    person: { id: string; first_name: string; last_name: string; gender: string; birth_date?: string }
    stories: { id: string; title: string; content?: string; created_at: string }[]
    photos: { id: string; url: string; uploaded_at: string }[]
    documents: { id: string; file_url: string; description?: string; uploaded_at: string }[]
}

interface Props { params: Promise<{ id: string }> }

export default function FamilyArchivePage({ params }: Props) {
    const { id: familyId } = use(params)
    const router = useRouter()
    const { t } = useT()
    const [archive, setArchive] = useState<ArchivePerson[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<"all" | "stories" | "photos" | "documents">("all")

    useEffect(() => {
        apiFetch(`${API_BASE}/families/${familyId}/archive`)
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(data => setArchive(data.archive ?? []))
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [familyId])

    const hasContent = (p: ArchivePerson) => {
        if (filter === "stories") return p.stories.length > 0
        if (filter === "photos") return p.photos.length > 0
        if (filter === "documents") return p.documents.length > 0
        return p.stories.length > 0 || p.photos.length > 0 || p.documents.length > 0
    }

    const filtered = archive.filter(hasContent)

    const filterLabels = {
        all: t("archive_all"),
        stories: t("archive_stories"),
        photos: t("archive_photos"),
        documents: t("archive_documents"),
    }

    return (
        <div className="min-h-screen bg-zinc-50 px-4 py-8 sm:py-10">
            <div className="max-w-3xl mx-auto">
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => router.push("/families")} className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors">
                        {t("archive_back")}
                    </button>
                    <h1 className="text-xl font-bold text-zinc-800">{t("archive_title")}</h1>
                </div>

                <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                    {(["all", "stories", "photos", "documents"] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`text-sm px-4 py-1.5 rounded-lg border transition-colors shrink-0 ${filter === f ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-600 border-zinc-300 hover:bg-zinc-50"}`}
                        >
                            {filterLabels[f]}
                        </button>
                    ))}
                </div>

                {loading && <p className="text-zinc-400 text-sm">{t("archive_loading")}</p>}

                {!loading && filtered.length === 0 && (
                    <div className="bg-white rounded-xl border border-zinc-200 p-10 text-center">
                        <p className="text-zinc-400 text-sm">{t("archive_none")}</p>
                    </div>
                )}

                <div className="space-y-8">
                    {filtered.map(({ person, stories, photos, documents }) => {
                        const name = [person.first_name, person.last_name].filter(Boolean).join(" ")
                        return (
                            <div key={person.id} className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
                                <div
                                    className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between cursor-pointer hover:bg-zinc-50 transition-colors"
                                    onClick={() => router.push(`/person/${person.id}`)}
                                >
                                    <div>
                                        <p className="font-semibold text-zinc-900">{name}</p>
                                        {person.birth_date && (
                                            <p className="text-xs text-zinc-400 mt-0.5">{t("born_abbr")} {new Date(person.birth_date).getFullYear()}</p>
                                        )}
                                    </div>
                                    <span className="text-xs text-zinc-400">{t("archive_view_profile")}</span>
                                </div>

                                <div className="p-5 space-y-5">
                                    {(filter === "all" || filter === "stories") && stories.length > 0 && (
                                        <div>
                                            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">{t("archive_stories")}</p>
                                            <ul className="space-y-3">
                                                {stories.map(s => (
                                                    <li key={s.id} className="border-l-2 border-zinc-200 pl-3">
                                                        <p className="text-sm font-medium text-zinc-900">{s.title}</p>
                                                        {s.content && <p className="text-sm text-zinc-500 mt-1 line-clamp-3">{s.content}</p>}
                                                        <p className="text-xs text-zinc-400 mt-1">{new Date(s.created_at).toLocaleDateString()}</p>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {(filter === "all" || filter === "photos") && photos.length > 0 && (
                                        <div>
                                            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">{t("archive_photos")}</p>
                                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                                {photos.map(ph => (
                                                    <img key={ph.id} src={`${API_BASE}${ph.url}`} alt="" className="w-full aspect-square object-cover rounded-lg" />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {(filter === "all" || filter === "documents") && documents.length > 0 && (
                                        <div>
                                            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">{t("archive_documents")}</p>
                                            <ul className="space-y-2">
                                                {documents.map(d => (
                                                    <li key={d.id} className="flex items-center gap-2">
                                                        <span>📄</span>
                                                        <a href={`${API_BASE}${d.file_url}`} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline truncate">
                                                            {d.file_url.split("/").pop()}
                                                        </a>
                                                        {d.description && <span className="text-xs text-zinc-400 shrink-0">{d.description}</span>}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
