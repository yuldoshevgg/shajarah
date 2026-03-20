"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { apiFetch } from "@/lib/apiFetch"
import { useT } from "@/lib/i18n"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

interface TimelineItem {
    id: string
    date: string
    type: "event" | "birth" | "story"
    title: string
    description: string
    person_id: string
    person_name: string
}

export default function TimelinePage({ params }: { params: Promise<{ id: string }> }) {
    const { id: familyId } = use(params)
    const { t } = useT()
    const [items, setItems] = useState<TimelineItem[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function load() {
            try {
                const [personsRes, eventsRes] = await Promise.all([
                    apiFetch(`${API}/persons?family_id=${familyId}`),
                    apiFetch(`${API}/events?family_id=${familyId}`),
                ])
                const persons: { id: string; first_name: string; last_name: string; birth_date: string | null }[] =
                    personsRes.ok ? await personsRes.json() : []

                const personMap: Record<string, string> = {}
                const timelineItems: TimelineItem[] = []

                for (const p of persons) {
                    personMap[p.id] = [p.first_name, p.last_name].filter(Boolean).join(" ")
                    if (p.birth_date) {
                        timelineItems.push({
                            id: `birth-${p.id}`,
                            date: p.birth_date,
                            type: "birth",
                            title: `${t("born_abbr")} ${personMap[p.id]}`,
                            description: "",
                            person_id: p.id,
                            person_name: personMap[p.id],
                        })
                    }
                }

                if (eventsRes.ok) {
                    const eventsData: { events?: { id: string; event_type: string; event_date: string; description: string; person_id: string }[] } = await eventsRes.json()
                    for (const e of eventsData.events ?? []) {
                        if (e.event_date) {
                            timelineItems.push({
                                id: e.id,
                                date: e.event_date,
                                type: "event",
                                title: e.event_type,
                                description: e.description,
                                person_id: e.person_id,
                                person_name: personMap[e.person_id] ?? t("unknown"),
                            })
                        }
                    }
                }

                timelineItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                setItems(timelineItems)
            } finally { setLoading(false) }
        }
        load()
    }, [familyId]) // eslint-disable-line react-hooks/exhaustive-deps

    const typeColor: Record<string, string> = { birth: "#4361ee", event: "#e63946", story: "#2a9d8f" }
    const typeIcon: Record<string, string> = { birth: "👶", event: "📅", story: "📖" }

    return (
        <div className="min-h-screen bg-zinc-50 px-4 py-8 sm:py-10">
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center gap-3 mb-8">
                    <Link href="/families" className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors no-underline">
                        {t("timeline_back")}
                    </Link>
                    <h1 className="text-xl font-bold text-zinc-800">{t("timeline_title")}</h1>
                </div>

                {loading && <p className="text-zinc-400 text-sm">{t("timeline_loading")}</p>}
                {!loading && items.length === 0 && <p className="text-zinc-400 text-sm">{t("timeline_none")}</p>}

                <div className="relative pl-8">
                    <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-zinc-200" />

                    {items.map((item, i) => (
                        <div key={item.id} className="relative mb-6" style={{ animationDelay: `${i * 0.05}s` }}>
                            <div
                                className="absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] border-2 border-white shadow-sm"
                                style={{ background: typeColor[item.type] ?? "#888" }}
                            >
                                {typeIcon[item.type]}
                            </div>

                            <div className="bg-white border border-zinc-200 rounded-xl px-4 py-3">
                                <div className="flex justify-between items-start gap-3">
                                    <div className="min-w-0">
                                        <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: typeColor[item.type] }}>
                                            {item.type}
                                        </span>
                                        <h3 className="text-sm font-semibold text-zinc-800 mt-0.5">{item.title}</h3>
                                        {item.description && <p className="text-xs text-zinc-500 mt-0.5">{item.description}</p>}
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="text-sm font-semibold text-zinc-700">{new Date(item.date).getFullYear()}</div>
                                        <div className="text-[11px] text-zinc-400">{new Date(item.date).toLocaleDateString()}</div>
                                    </div>
                                </div>
                                <Link href={`/person/${item.person_id}`} className="text-xs text-indigo-500 hover:underline mt-2 inline-block no-underline">
                                    {item.person_name} →
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
