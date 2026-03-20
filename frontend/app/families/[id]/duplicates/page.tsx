"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/lib/apiFetch"
import API_BASE from "@/services/api"

interface Person {
    id: string
    first_name: string
    last_name: string
    gender: string
    birth_date?: string
}

interface Props {
    params: Promise<{ id: string }>
}

export default function DuplicatesPage({ params }: Props) {
    const { id: familyId } = use(params)
    const router = useRouter()
    const [persons, setPersons] = useState<Person[]>([])
    const [keepId, setKeepId] = useState("")
    const [removeId, setRemoveId] = useState("")
    const [merging, setMerging] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")

    useEffect(() => {
        apiFetch(`${API_BASE}/families/${familyId}/duplicates`)
            .then(r => {
                if (!r.ok) throw new Error("Failed to load duplicates")
                return r.json()
            })
            .then(data => setPersons(data.duplicates ?? []))
            .catch(e => setError(e.message ?? "Failed to load duplicates"))
    }, [familyId])

    const handleMerge = async () => {
        if (!keepId || !removeId || keepId === removeId) {
            setError("Select two different persons to merge")
            return
        }
        setMerging(true)
        setError("")
        setSuccess("")
        try {
            await apiFetch(`${API_BASE}/persons/merge`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ keep_id: keepId, remove_id: removeId }),
            })
            setSuccess(`Merged successfully. "${persons.find(p => p.id === removeId)?.first_name}" was merged into "${persons.find(p => p.id === keepId)?.first_name}".`)
            setPersons(prev => prev.filter(p => p.id !== removeId))
            setKeepId("")
            setRemoveId("")
        } catch {
            setError("Merge failed")
        } finally {
            setMerging(false)
        }
    }

    const label = (p: Person) => [p.first_name, p.last_name].filter(Boolean).join(" ")

    return (
        <div className="min-h-screen bg-zinc-50 px-4 py-10">
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center gap-3 mb-6">
                    <button
                        onClick={() => router.push("/families")}
                        className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
                    >
                        ← Families
                    </button>
                    <h1 className="text-xl font-bold text-zinc-800">Duplicate Persons</h1>
                </div>

                {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                {success && <p className="text-green-600 text-sm mb-4">{success}</p>}

                {persons.length === 0 ? (
                    <div className="bg-white rounded-xl border border-zinc-200 p-10 text-center">
                        <p className="text-zinc-400 text-sm">No duplicates found.</p>
                    </div>
                ) : (
                    <>
                        <p className="text-sm text-zinc-500 mb-4">
                            {persons.length} persons share a name with another person in this family.
                            Select two to merge — all relationships and media are transferred to the kept person.
                        </p>

                        {/* Duplicate list */}
                        <ul className="space-y-2 mb-6">
                            {persons.map(p => (
                                <li
                                    key={p.id}
                                    className="bg-white border border-zinc-200 rounded-lg px-4 py-3 flex items-center justify-between"
                                >
                                    <div>
                                        <span className="font-medium text-zinc-900">{label(p)}</span>
                                        <span className="ml-2 text-xs text-zinc-400 capitalize">{p.gender}</span>
                                        {p.birth_date && (
                                            <span className="ml-2 text-xs text-zinc-400">
                                                b. {new Date(p.birth_date).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => router.push(`/person/${p.id}`)}
                                        className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
                                    >
                                        View →
                                    </button>
                                </li>
                            ))}
                        </ul>

                        {/* Merge form */}
                        <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4">
                            <h2 className="font-semibold text-zinc-800 text-sm">Merge Two Persons</h2>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-zinc-500 mb-1">Keep (primary)</label>
                                    <select
                                        className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm bg-white text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-400"
                                        value={keepId}
                                        onChange={e => setKeepId(e.target.value)}
                                    >
                                        <option value="">Select…</option>
                                        {persons.filter(p => p.id !== removeId).map(p => (
                                            <option key={p.id} value={p.id}>{label(p)}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-500 mb-1">Remove (will be deleted)</label>
                                    <select
                                        className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm bg-white text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-400"
                                        value={removeId}
                                        onChange={e => setRemoveId(e.target.value)}
                                    >
                                        <option value="">Select…</option>
                                        {persons.filter(p => p.id !== keepId).map(p => (
                                            <option key={p.id} value={p.id}>{label(p)}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <button
                                onClick={handleMerge}
                                disabled={merging || !keepId || !removeId}
                                className="w-full py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                            >
                                {merging ? "Merging…" : "Merge"}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
