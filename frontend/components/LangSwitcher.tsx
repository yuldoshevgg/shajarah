"use client"

import { useState } from "react"
import { useT, Lang } from "@/lib/i18n"

const LABELS: Record<Lang, string> = { uz: "UZ", ru: "RU", en: "EN" }

export default function LangSwitcher() {
    const { lang, setLang } = useT()
    const [open, setOpen] = useState(false)

    return (
        <div className="relative z-20">
            <button
                onClick={() => setOpen(v => !v)}
                className="flex items-center gap-1.5 border border-zinc-200 rounded-lg px-3 py-1.5 text-xs font-bold text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
                {LABELS[lang]}
                <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" className="text-zinc-400">
                    <path d="M4 6L0 2h8z" />
                </svg>
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-9 bg-white border border-zinc-100 rounded-xl shadow-2xl z-20 overflow-hidden min-w-[64px] py-1">
                        {(["uz", "ru", "en"] as Lang[]).map(l => (
                            <button
                                key={l}
                                onClick={() => { setLang(l); setOpen(false) }}
                                className={`block w-full text-center px-5 py-2.5 text-sm font-bold transition-colors hover:bg-zinc-50 ${lang === l ? "text-green-700 bg-green-50" : "text-zinc-500"}`}
                            >
                                {LABELS[l]}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}
