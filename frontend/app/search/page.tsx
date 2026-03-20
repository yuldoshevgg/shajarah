"use client"

import { useState } from "react"
import Link from "next/link"
import { searchPersons, PersonResult } from "@/services/searchService"
import { useT } from "@/lib/i18n"

export default function SearchPage() {
    const { t } = useT()
    const [q, setQ] = useState("")
    const [results, setResults] = useState<PersonResult[]>([])
    const [loading, setLoading] = useState(false)
    const [searched, setSearched] = useState(false)

    async function handleSearch(e: React.FormEvent) {
        e.preventDefault()
        if (!q.trim()) return
        setLoading(true)
        try {
            const data = await searchPersons(q.trim())
            setResults(data)
            setSearched(true)
        } catch {
            setResults([])
            setSearched(true)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 px-4 py-8">
            <div className="max-w-xl mx-auto">
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-6">{t("search_title")}</h1>

                <form onSubmit={handleSearch} className="flex gap-2 mb-8">
                    <input
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        placeholder={t("search_placeholder")}
                        className="flex-1 min-w-0 border border-zinc-300 dark:border-zinc-600 rounded-lg px-4 py-2.5 text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 outline-none focus:ring-2 focus:ring-zinc-400"
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors shrink-0"
                    >
                        {loading ? t("search_searching") : t("search_button")}
                    </button>
                </form>

                {searched && results.length === 0 && (
                    <p className="text-zinc-400 text-center text-sm">{t("search_no_results")} &quot;{q}&quot;</p>
                )}

                <ul className="space-y-2">
                    {results.map(p => (
                        <li key={p.id}>
                            <Link
                                href={`/person/${p.id}`}
                                className="block px-4 py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors no-underline"
                            >
                                <div className="font-semibold text-zinc-900 dark:text-zinc-50 text-sm">
                                    {p.first_name} {p.last_name}
                                </div>
                                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 capitalize">
                                    {p.gender}{p.birth_date ? ` · ${t("born_abbr")} ${p.birth_date.slice(0, 10)}` : ""}
                                </div>
                                {p.biography && (
                                    <div className="text-xs text-zinc-400 mt-0.5 truncate">{p.biography}</div>
                                )}
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}
