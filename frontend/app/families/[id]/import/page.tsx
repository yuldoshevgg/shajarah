"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/lib/apiFetch"
import API_BASE from "@/services/api"

interface Props {
    params: Promise<{ id: string }>
}

export default function ImportPage({ params }: Props) {
    const { id: familyId } = use(params)
    const router = useRouter()
    const [file, setFile] = useState<File | null>(null)
    const [importing, setImporting] = useState(false)
    const [result, setResult] = useState<{ persons_created: number; relationships_created: number } | null>(null)
    const [error, setError] = useState("")

    const handleImport = async () => {
        if (!file) return
        setImporting(true)
        setError("")
        setResult(null)

        const form = new FormData()
        form.append("gedcom", file)

        try {
            const res = await apiFetch(`${API_BASE}/families/${familyId}/import/gedcom`, {
                method: "POST",
                body: form,
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? "Import failed")
            setResult(data)
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Import failed")
        } finally {
            setImporting(false)
        }
    }

    return (
        <div className="min-h-screen bg-zinc-50 px-4 py-10">
            <div className="max-w-xl mx-auto">
                <div className="flex items-center gap-3 mb-6">
                    <button
                        onClick={() => router.push("/families")}
                        className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
                    >
                        ← Families
                    </button>
                    <h1 className="text-xl font-bold text-zinc-800">Import GEDCOM</h1>
                </div>

                <div className="bg-white rounded-xl border border-zinc-200 p-6 space-y-5">
                    <p className="text-sm text-zinc-500">
                        Upload a <strong>.ged</strong> GEDCOM file to import persons and relationships into this family.
                        Existing data will not be overwritten.
                    </p>

                    <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl py-10 cursor-pointer transition-colors ${
                        file ? "border-zinc-400 bg-zinc-50" : "border-zinc-200 hover:border-zinc-400"
                    }`}>
                        <span className="text-3xl mb-2">📂</span>
                        <span className="text-sm text-zinc-500">
                            {file ? file.name : "Choose .ged file…"}
                        </span>
                        <input
                            type="file"
                            accept=".ged,.gedcom,text/plain"
                            className="hidden"
                            onChange={e => setFile(e.target.files?.[0] ?? null)}
                        />
                    </label>

                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    {result && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-700">
                            <p className="font-semibold mb-1">Import successful</p>
                            <p>{result.persons_created} persons created</p>
                            <p>{result.relationships_created} relationships created</p>
                            <button
                                onClick={() => router.push(`/family-tree/${familyId}`)}
                                className="mt-3 text-sm px-4 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors"
                            >
                                View Tree →
                            </button>
                        </div>
                    )}

                    <button
                        onClick={handleImport}
                        disabled={!file || importing}
                        className="w-full py-2.5 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                    >
                        {importing ? "Importing…" : "Import"}
                    </button>
                </div>
            </div>
        </div>
    )
}
