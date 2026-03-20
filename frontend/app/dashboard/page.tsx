"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { apiFetch } from "@/lib/apiFetch"
import { isAuthenticated } from "@/lib/auth"
import API_BASE from "@/services/api"
import { useT } from "@/lib/i18n"

interface DashboardPerson {
    id: string
    first_name: string
    last_name: string
    gender: string
    birth_date?: string
}

interface FamilyWithStats {
    id: string
    name: string
    role: string
    person_count: number
    member_count: number
}

interface DashboardData {
    user: { id: string; email: string }
    person: DashboardPerson | null
    families: FamilyWithStats[]
    unread_notifications: number
}

const ROLE_COLORS: Record<string, string> = {
    admin: "bg-amber-100 text-amber-800",
    editor: "bg-blue-100 text-blue-800",
    viewer: "bg-zinc-100 text-zinc-600",
}

export default function DashboardPage() {
    const router = useRouter()
    const { t } = useT()
    const [data, setData] = useState<DashboardData | null>(null)
    const [error, setError] = useState("")

    useEffect(() => {
        if (!isAuthenticated()) { router.push("/auth/login"); return }
        apiFetch(`${API_BASE}/dashboard`)
            .then(r => r.json())
            .then(setData)
            .catch(() => setError(t("loading")))
    }, [router]) // eslint-disable-line react-hooks/exhaustive-deps

    if (error) return (
        <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
            <p className="text-red-500 text-sm">{error}</p>
        </div>
    )

    if (!data) return (
        <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
            <p className="text-zinc-400 text-sm">{t("loading")}</p>
        </div>
    )

    const personName = data.person
        ? [data.person.first_name, data.person.last_name].filter(Boolean).join(" ")
        : null

    const unread = data.unread_notifications

    return (
        <div className="min-h-screen bg-zinc-50 px-4 py-6 sm:py-10">
            <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-zinc-900">{t("dashboard_title")}</h1>
                    {unread > 0 && (
                        <span className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded-full font-medium">
                            {unread} {unread === 1 ? t("dashboard_unread_one") : t("dashboard_unread_many")}
                        </span>
                    )}
                </div>

                {/* Identity card */}
                <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div>
                            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1">{t("dashboard_identity")}</p>
                            {personName ? (
                                <>
                                    <h2 className="text-xl font-bold text-zinc-900">{personName}</h2>
                                    <p className="text-sm text-zinc-500 mt-0.5 capitalize">{data.person!.gender}</p>
                                    {data.person!.birth_date && (
                                        <p className="text-sm text-zinc-400 mt-0.5">
                                            {t("born_abbr")} {new Date(data.person!.birth_date).toLocaleDateString()}
                                        </p>
                                    )}
                                </>
                            ) : (
                                <p className="text-sm text-zinc-500">{t("dashboard_no_person")}</p>
                            )}
                            <p className="text-xs text-zinc-400 mt-2">{data.user.email}</p>
                        </div>
                        <div className="flex sm:flex-col gap-2 sm:items-end">
                            <Link href="/me" className="text-xs px-3 py-2 border border-zinc-300 rounded-lg text-zinc-600 hover:bg-zinc-50 transition-colors text-center">
                                {t("dashboard_edit_profile")}
                            </Link>
                            {data.person && (
                                <Link href={`/person/${data.person.id}`} className="text-xs px-3 py-2 border border-zinc-300 rounded-lg text-zinc-600 hover:bg-zinc-50 transition-colors text-center">
                                    {t("dashboard_view_profile")}
                                </Link>
                            )}
                        </div>
                    </div>
                </div>

                {/* Families */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-base font-semibold text-zinc-800">{t("dashboard_your_families")}</h2>
                        <Link href="/families" className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors">
                            {t("dashboard_manage")}
                        </Link>
                    </div>

                    {data.families.length === 0 ? (
                        <div className="bg-white rounded-xl border border-zinc-200 p-6 text-center">
                            <p className="text-zinc-400 text-sm">{t("dashboard_no_families")}</p>
                            <Link href="/families" className="inline-block mt-3 text-sm px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-700 transition-colors">
                                {t("dashboard_create_family")}
                            </Link>
                        </div>
                    ) : (
                        <ul className="space-y-3">
                            {data.families.map(f => (
                                <li key={f.id} className="bg-white rounded-xl border border-zinc-200 shadow-sm px-5 py-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-semibold text-zinc-900 truncate">{f.name}</span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize shrink-0 ${ROLE_COLORS[f.role] ?? ROLE_COLORS.viewer}`}>
                                                    {f.role}
                                                </span>
                                            </div>
                                            <p className="text-xs text-zinc-400 mt-0.5">
                                                {f.person_count} {f.person_count === 1 ? t("dashboard_persons_one") : t("dashboard_persons")} · {f.member_count} {f.member_count === 1 ? t("dashboard_members_one") : t("dashboard_members")}
                                            </p>
                                        </div>
                                        <div className="flex gap-2 shrink-0">
                                            {f.role === "admin" && (
                                                <Link href={`/families/${f.id}/claims`} className="flex-1 sm:flex-none text-center text-xs px-3 py-2 border border-zinc-300 rounded-lg text-zinc-500 hover:bg-zinc-50 transition-colors">
                                                    {t("families_claims")}
                                                </Link>
                                            )}
                                            <button onClick={() => router.push(`/family-tree/${f.id}`)} className="flex-1 sm:flex-none text-xs px-3 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-700 transition-colors">
                                                {t("dashboard_open_tree")}
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Quick links */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                        { label: t("dashboard_search_people"), href: "/search" },
                        { label: t("dashboard_all_families"), href: "/families" },
                        { label: t("dashboard_notifications_link"), href: "/notifications" },
                    ].map(link => (
                        <Link key={link.href} href={link.href} className="bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors text-center">
                            {link.label}
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    )
}
