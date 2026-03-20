"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/lib/apiFetch"
import API_BASE from "@/services/api"
import { useT } from "@/lib/i18n"

interface ClaimView {
    id: string
    person_id: string
    person_first_name: string
    person_last_name: string
    user_id: string
    user_email: string
    status: string
    created_at: string
}

interface Props { params: Promise<{ id: string }> }

export default function ClaimsPage({ params }: Props) {
    const { id: familyId } = use(params)
    const router = useRouter()
    const { t } = useT()
    const [claims, setClaims] = useState<ClaimView[]>([])
    const [acting, setActing] = useState<string | null>(null)
    const [error, setError] = useState("")

    useEffect(() => {
        apiFetch(`${API_BASE}/families/${familyId}/claims`)
            .then(r => {
                if (!r.ok) throw new Error(r.status === 403 ? "Admin access required to view claims" : "Failed to load claims")
                return r.json()
            })
            .then(setClaims)
            .catch(e => setError(e.message ?? "Failed to load claims"))
    }, [familyId])

    const resolve = async (claimId: string, action: "approve" | "reject") => {
        setActing(claimId)
        try {
            const res = await apiFetch(`${API_BASE}/claims/${claimId}/${action}`, { method: "POST" })
            if (!res.ok) {
                const body = await res.json().catch(() => ({}))
                throw new Error(body.error ?? `Failed to ${action} claim`)
            }
            setClaims(prev => prev.filter(c => c.id !== claimId))
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : `Failed to ${action} claim`)
        } finally { setActing(null) }
    }

    return (
        <div className="min-h-screen bg-zinc-50 px-4 py-8 sm:py-10">
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => router.push("/families")} className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors">
                        {t("claims_back")}
                    </button>
                    <h1 className="text-xl font-bold text-zinc-800">{t("claims_title")}</h1>
                </div>

                {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

                {claims.length === 0 ? (
                    <div className="bg-white rounded-xl border border-zinc-200 p-10 text-center">
                        <p className="text-zinc-400 text-sm">{t("claims_none")}</p>
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {claims.map(c => (
                            <li key={c.id} className="bg-white border border-zinc-200 rounded-xl px-4 py-4">
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                    <div>
                                        <p className="font-medium text-zinc-900">
                                            {[c.person_first_name, c.person_last_name].filter(Boolean).join(" ")}
                                        </p>
                                        <p className="text-sm text-zinc-500 mt-0.5">
                                            {t("claims_requested_by")} <span className="font-medium">{c.user_email}</span>
                                        </p>
                                        <p className="text-xs text-zinc-400 mt-1">
                                            {new Date(c.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="flex gap-2 sm:shrink-0">
                                        <button
                                            onClick={() => resolve(c.id, "approve")}
                                            disabled={acting === c.id}
                                            className="flex-1 sm:flex-none text-sm px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 disabled:opacity-50 transition-colors"
                                        >
                                            {t("approve")}
                                        </button>
                                        <button
                                            onClick={() => resolve(c.id, "reject")}
                                            disabled={acting === c.id}
                                            className="flex-1 sm:flex-none text-sm px-4 py-2 border border-zinc-300 rounded-lg text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 transition-colors"
                                        >
                                            {t("reject")}
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}
