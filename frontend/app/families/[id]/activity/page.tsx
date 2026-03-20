"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { apiFetch } from "@/lib/apiFetch"
import { useT } from "@/lib/i18n"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

interface AuditLog {
    id: string
    user_id: string
    family_id: string
    entity_type: string
    entity_id: string
    action: string
    created_at: string
}

export default function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: familyId } = use(params)
    const { t } = useT()
    const [logs, setLogs] = useState<AuditLog[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        apiFetch(`${API}/families/${familyId}/activity`)
            .then(res => res.json())
            .then(data => setLogs(data.activity ?? []))
            .finally(() => setLoading(false))
    }, [familyId])

    const actionColor: Record<string, string> = {
        created: "#2a9d8f",
        updated: "#4361ee",
        deleted: "#e63946",
    }

    return (
        <div className="min-h-screen bg-zinc-50 px-4 py-8 sm:py-10">
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center gap-3 mb-8">
                    <Link href="/families" className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors no-underline">
                        {t("activity_back")}
                    </Link>
                    <h1 className="text-xl font-bold text-zinc-800">{t("activity_title")}</h1>
                </div>

                {loading && <p className="text-zinc-400 text-sm">{t("activity_loading")}</p>}
                {!loading && logs.length === 0 && <p className="text-zinc-400 text-sm">{t("activity_none")}</p>}

                <div className="flex flex-col gap-2">
                    {logs.map(log => {
                        const action = log.action ?? ""
                        const color = Object.entries(actionColor).find(([k]) => action.toLowerCase().includes(k))?.[1] ?? "#888"
                        return (
                            <div key={log.id} className="flex gap-3 px-4 py-3 bg-white border border-zinc-200 rounded-xl items-start">
                                <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: color }} />
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium">
                                        <span style={{ color }}>{log.action}</span>
                                        {log.entity_type && <span className="text-zinc-400 font-normal"> · {log.entity_type}</span>}
                                    </div>
                                    <div className="text-xs text-zinc-400 mt-0.5">{new Date(log.created_at).toLocaleString()}</div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
