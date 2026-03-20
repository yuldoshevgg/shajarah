"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/lib/apiFetch"
import { isAuthenticated } from "@/lib/auth"
import API_BASE from "@/services/api"
import { updatePerson } from "@/services/personEditService"
import { Person } from "@/services/personService"
import { useT } from "@/lib/i18n"

export default function MePage() {
    const router = useRouter()
    const { t } = useT()
    const [person, setPerson] = useState<Person | null>(null)
    const [editing, setEditing] = useState(false)
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [gender, setGender] = useState("")
    const [birthDate, setBirthDate] = useState("")
    const [biography, setBiography] = useState("")
    const [error, setError] = useState("")
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!isAuthenticated()) { router.push("/auth/login"); return }
        apiFetch(`${API_BASE}/auth/me`)
            .then(res => res.json())
            .then(data => {
                const p: Person | null = data.person ?? null
                if (!p) { setError(t("dashboard_no_person")); return }
                setPerson(p)
                setFirstName(p.first_name ?? "")
                setLastName(p.last_name ?? "")
                setGender(p.gender ?? "")
                setBirthDate(p.birth_date ? p.birth_date.split("T")[0] : "")
                setBiography(p.biography ?? "")
            })
            .catch(() => setError(t("loading")))
    }, [router]) // eslint-disable-line react-hooks/exhaustive-deps

    const handleSave = async () => {
        if (!person) return
        setSaving(true); setError("")
        try {
            const updated = await updatePerson(person.id, { first_name: firstName, last_name: lastName, gender, birth_date: birthDate || undefined, biography })
            setPerson(updated)
            setEditing(false)
        } catch { setError(t("loading")) }
        finally { setSaving(false) }
    }

    const inputClass = "border border-stone-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 w-full"

    if (!person) {
        return (
            <div className="min-h-screen bg-stone-50 flex items-center justify-center">
                <p className="text-stone-400 text-sm">{error || t("loading")}</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-stone-50 px-4 py-8 sm:py-10">
            <div className="max-w-xl mx-auto">
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => router.push("/families")} className="text-sm text-stone-400 hover:text-stone-700 transition-colors">
                        {t("me_back")}
                    </button>
                    <span className="text-stone-300">|</span>
                    <h1 className="text-xl font-bold text-stone-800">{t("me_title")}</h1>
                </div>

                <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 sm:p-6 space-y-5">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm">{error}</div>
                    )}

                    {editing ? (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-stone-500 mb-1">{t("me_first_name")}</label>
                                    <input className={inputClass} value={firstName} onChange={e => setFirstName(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-stone-500 mb-1">{t("me_last_name")}</label>
                                    <input className={inputClass} value={lastName} onChange={e => setLastName(e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-500 mb-1">{t("me_gender")}</label>
                                <select className={inputClass} value={gender} onChange={e => setGender(e.target.value)}>
                                    <option value="male">{t("male")}</option>
                                    <option value="female">{t("female")}</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-500 mb-1">{t("me_birth_date")}</label>
                                <input type="date" className={inputClass} value={birthDate} onChange={e => setBirthDate(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-500 mb-1">{t("me_biography")}</label>
                                <textarea className={`${inputClass} resize-none`} rows={4} value={biography} onChange={e => setBiography(e.target.value)} />
                            </div>
                            <div className="flex gap-3 pt-1">
                                <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-stone-800 text-white rounded-lg text-sm font-medium hover:bg-stone-700 disabled:opacity-50 transition-colors">
                                    {saving ? t("me_saving") : t("save")}
                                </button>
                                <button onClick={() => setEditing(false)} className="flex-1 py-2.5 border border-stone-300 rounded-lg text-sm text-stone-600 hover:bg-stone-50 transition-colors">
                                    {t("cancel")}
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex items-start justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-stone-800">
                                        {[person.first_name, person.last_name].filter(Boolean).join(" ")}
                                    </h2>
                                    <p className="text-sm text-stone-400 capitalize mt-0.5">{person.gender}</p>
                                </div>
                                <button onClick={() => setEditing(true)} className="text-sm px-4 py-1.5 border border-stone-300 rounded-lg hover:bg-stone-50 text-stone-600 transition-colors shrink-0">
                                    {t("edit")}
                                </button>
                            </div>
                            {person.birth_date && (
                                <div>
                                    <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-0.5">{t("me_born")}</p>
                                    <p className="text-sm text-stone-700">{new Date(person.birth_date).toLocaleDateString()}</p>
                                </div>
                            )}
                            {person.biography && (
                                <div>
                                    <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-0.5">{t("me_about")}</p>
                                    <p className="text-sm text-stone-700 whitespace-pre-line">{person.biography}</p>
                                </div>
                            )}
                            <button onClick={() => router.push(`/person/${person.id}`)} className="w-full py-2.5 border border-stone-200 rounded-lg text-sm text-stone-500 hover:bg-stone-50 transition-colors">
                                {t("me_view_full")}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
