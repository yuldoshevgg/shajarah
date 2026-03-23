"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useT, Lang } from "@/lib/i18n"
import { getToken } from "@/lib/auth"

// ─── SVG Illustrations ───────────────────────────────────────────────────────

function TreeIllustration() {
    return (
        <svg viewBox="0 0 340 320" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full max-w-sm mx-auto">
            {/* Generation lines */}
            <line x1="170" y1="72" x2="170" y2="116" stroke="#4caf50" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="90" y1="152" x2="170" y2="116" stroke="#4caf50" strokeWidth="2" strokeLinecap="round" />
            <line x1="250" y1="152" x2="170" y2="116" stroke="#4caf50" strokeWidth="2" strokeLinecap="round" />
            <line x1="56" y1="230" x2="90" y2="190" stroke="#4caf50" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="124" y1="230" x2="90" y2="190" stroke="#4caf50" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="216" y1="230" x2="250" y2="190" stroke="#4caf50" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="284" y1="230" x2="250" y2="190" stroke="#4caf50" strokeWidth="1.5" strokeLinecap="round" />

            {/* Spouse connectors */}
            <line x1="154" y1="50" x2="170" y2="50" stroke="#388e3c" strokeWidth="1.5" strokeDasharray="4 2" />
            <line x1="78" y1="168" x2="94" y2="168" stroke="#388e3c" strokeWidth="1.5" strokeDasharray="4 2" />
            <line x1="238" y1="168" x2="254" y2="168" stroke="#388e3c" strokeWidth="1.5" strokeDasharray="4 2" />

            {/* Gen 0 — grandparents (couple) */}
            <circle cx="148" cy="50" r="22" fill="#a5d6a7" />
            <circle cx="185" cy="50" r="22" fill="#c8e6c9" />
            <text x="148" y="55" textAnchor="middle" fontSize="14">👴</text>
            <text x="185" y="55" textAnchor="middle" fontSize="14">👵</text>

            {/* Gen 1 — two parent couples */}
            <circle cx="72" cy="168" r="18" fill="#a5d6a7" />
            <circle cx="104" cy="168" r="18" fill="#c8e6c9" />
            <text x="72" y="173" textAnchor="middle" fontSize="12">👨</text>
            <text x="104" y="173" textAnchor="middle" fontSize="12">👩</text>

            <circle cx="232" cy="168" r="18" fill="#a5d6a7" />
            <circle cx="264" cy="168" r="18" fill="#c8e6c9" />
            <text x="232" y="173" textAnchor="middle" fontSize="12">👨</text>
            <text x="264" y="173" textAnchor="middle" fontSize="12">👩</text>

            {/* Gen 2 — children */}
            <circle cx="50" cy="248" r="14" fill="#81c784" />
            <circle cx="128" cy="248" r="14" fill="#81c784" />
            <circle cx="212" cy="248" r="14" fill="#81c784" />
            <circle cx="290" cy="248" r="14" fill="#81c784" />
            <text x="50" y="253" textAnchor="middle" fontSize="11">🧒</text>
            <text x="128" y="253" textAnchor="middle" fontSize="11">🧒</text>
            <text x="212" y="253" textAnchor="middle" fontSize="11">🧒</text>
            <text x="290" y="253" textAnchor="middle" fontSize="11">🧒</text>

            {/* Glowing root dot */}
            <circle cx="170" cy="116" r="7" fill="#4caf50" opacity="0.9" />
            <circle cx="170" cy="116" r="12" fill="#4caf50" opacity="0.2" />
        </svg>
    )
}

function InviteIllustration() {
    return (
        <svg viewBox="0 0 340 300" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full max-w-sm mx-auto">
            {/* Connection lines radiating from center */}
            <line x1="170" y1="150" x2="68" y2="80" stroke="#ff8a65" strokeWidth="2" strokeLinecap="round" strokeDasharray="6 3" />
            <line x1="170" y1="150" x2="272" y2="80" stroke="#ff8a65" strokeWidth="2" strokeLinecap="round" strokeDasharray="6 3" />
            <line x1="170" y1="150" x2="60" y2="210" stroke="#ff8a65" strokeWidth="2" strokeLinecap="round" strokeDasharray="6 3" />
            <line x1="170" y1="150" x2="280" y2="210" stroke="#ff8a65" strokeWidth="2" strokeLinecap="round" strokeDasharray="6 3" />
            <line x1="170" y1="150" x2="170" y2="40" stroke="#ff8a65" strokeWidth="2" strokeLinecap="round" strokeDasharray="6 3" />

            {/* Outer person circles */}
            <circle cx="170" cy="32" r="24" fill="#ffe0b2" />
            <text x="170" y="38" textAnchor="middle" fontSize="18">👤</text>

            <circle cx="60" cy="72" r="24" fill="#ffe0b2" />
            <text x="60" y="78" textAnchor="middle" fontSize="18">👤</text>

            <circle cx="280" cy="72" r="24" fill="#ffe0b2" />
            <text x="280" y="78" textAnchor="middle" fontSize="18">👤</text>

            <circle cx="50" cy="218" r="24" fill="#ffe0b2" />
            <text x="50" y="224" textAnchor="middle" fontSize="18">👤</text>

            <circle cx="290" cy="218" r="24" fill="#ffe0b2" />
            <text x="290" y="224" textAnchor="middle" fontSize="18">👤</text>

            {/* Center: main person */}
            <circle cx="170" cy="150" r="34" fill="#ff8a65" />
            <circle cx="170" cy="150" r="42" fill="#ff8a65" opacity="0.2" />
            <text x="170" y="158" textAnchor="middle" fontSize="24">👤</text>

            {/* + badges on outer circles */}
            {[
                [170, 32], [60, 72], [280, 72], [50, 218], [290, 218]
            ].map(([cx, cy], i) => (
                <g key={i}>
                    <circle cx={cx + 16} cy={cy - 16} r="9" fill="#4caf50" />
                    <text x={cx + 16} y={cy - 12} textAnchor="middle" fontSize="11" fill="white" fontWeight="bold">+</text>
                </g>
            ))}
        </svg>
    )
}

function MemoryIllustration() {
    const frames = [
        { x: 40, y: 40, w: 100, h: 80, rot: -4, emoji: "🌸", bg: "#e1bee7" },
        { x: 158, y: 28, w: 90, h: 72, rot: 3, emoji: "🎂", bg: "#d1c4e9" },
        { x: 262, y: 36, w: 80, h: 68, rot: -2, emoji: "👶", bg: "#e8d5f0" },
        { x: 30, y: 148, w: 88, h: 76, rot: 2, emoji: "💒", bg: "#d1c4e9" },
        { x: 138, y: 154, w: 106, h: 82, rot: -3, emoji: "🏡", bg: "#e1bee7" },
        { x: 262, y: 144, w: 84, h: 72, rot: 4, emoji: "👴", bg: "#ede0f3" },
    ]

    return (
        <svg viewBox="0 0 380 290" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full max-w-sm mx-auto">
            {frames.map((f, i) => (
                <g key={i} transform={`rotate(${f.rot}, ${f.x + f.w / 2}, ${f.y + f.h / 2})`}>
                    {/* Shadow */}
                    <rect x={f.x + 3} y={f.y + 4} width={f.w} height={f.h} rx="10" fill="rgba(0,0,0,0.08)" />
                    {/* Frame */}
                    <rect x={f.x} y={f.y} width={f.w} height={f.h} rx="10" fill={f.bg} />
                    {/* White inset */}
                    <rect x={f.x + 8} y={f.y + 8} width={f.w - 16} height={f.h - 24} rx="6" fill="white" opacity="0.7" />
                    {/* Emoji */}
                    <text x={f.x + f.w / 2} y={f.y + f.h / 2 + 2} textAnchor="middle" fontSize="22">{f.emoji}</text>
                    {/* Caption line */}
                    <rect x={f.x + 12} y={f.y + f.h - 14} width={f.w - 24} height={4} rx="2" fill="rgba(255,255,255,0.6)" />
                </g>
            ))}

            {/* Subtle sparkles */}
            {[[20, 14], [350, 22], [12, 258], [365, 250], [190, 268]].map(([x, y], i) => (
                <text key={i} x={x} y={y} fontSize="14" textAnchor="middle">✦</text>
            ))}
        </svg>
    )
}

// ─── Step config ──────────────────────────────────────────────────────────────

const STEPS = [
    {
        Illustration: TreeIllustration,
        bgFrom: "#388e3c",
        bgTo: "#66bb6a",
        accent: "#2e7d32",
        accentLight: "#e8f5e9",
        dotColor: "#43a047",
        titleKey: "onboarding_step1_title" as const,
        descKey: "onboarding_step1_desc" as const,
    },
    {
        Illustration: InviteIllustration,
        bgFrom: "#e64a19",
        bgTo: "#ff8a65",
        accent: "#bf360c",
        accentLight: "#fbe9e7",
        dotColor: "#f4511e",
        titleKey: "onboarding_step2_title" as const,
        descKey: "onboarding_step2_desc" as const,
    },
    {
        Illustration: MemoryIllustration,
        bgFrom: "#6a1b9a",
        bgTo: "#ab47bc",
        accent: "#4a148c",
        accentLight: "#f3e5f5",
        dotColor: "#8e24aa",
        titleKey: "onboarding_step3_title" as const,
        descKey: "onboarding_step3_desc" as const,
    },
]

const LANG_LABELS: Record<Lang, string> = { uz: "UZ", ru: "RU", en: "EN" }

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
    const router = useRouter()
    const { t, lang, setLang } = useT()
    const [step, setStep] = useState(0)
    const [langOpen, setLangOpen] = useState(false)

    useEffect(() => {
        if (getToken()) router.replace("/families")
    }, [router])

    const s = STEPS[step]
    const isLast = step === STEPS.length - 1
    const { Illustration } = s

    return (
        <div className="w-screen h-screen flex flex-col sm:flex-row overflow-hidden">

            {/* ── ILLUSTRATION PANEL ─────────────────────────────── */}
            <div
                className="relative flex items-center justify-center overflow-hidden flex-shrink-0 h-[42vh] w-full sm:h-screen sm:w-[55%]"
                style={{
                    background: `linear-gradient(160deg, ${s.bgFrom} 0%, ${s.bgTo} 100%)`,
                    transition: "background 0.5s ease",
                }}
            >
                <div className="absolute inset-0 flex items-center justify-center p-8 sm:p-16">
                    <Illustration />
                </div>

                {/* Step dots */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
                    {STEPS.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setStep(i)}
                            style={{
                                width: i === step ? 24 : 7,
                                height: 7,
                                borderRadius: 999,
                                background: i === step ? "white" : "rgba(255,255,255,0.4)",
                                transition: "all 0.3s ease",
                                border: "none",
                                cursor: "pointer",
                                padding: 0,
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* ── CONTENT PANEL ──────────────────────────────────── */}
            <div
                className="flex-1 flex flex-col overflow-y-auto sm:h-screen"
                style={{ background: "#ffffff", padding: "clamp(20px, 4vw, 52px)" }}
            >
                {/* Top bar: logo + language */}
                <div className="flex items-center justify-between mb-auto pb-4">
                    <div className="flex items-center gap-2">
                        <div
                            className="flex items-center justify-center rounded-xl text-lg select-none"
                            style={{ width: 38, height: 38, background: s.dotColor }}
                        >
                            🌿
                        </div>
                        <span className="font-bold text-zinc-900 text-base tracking-tight">Shajarah</span>
                    </div>

                    <div className="relative z-20">
                        <button
                            onClick={() => setLangOpen(v => !v)}
                            className="flex items-center gap-1.5 border border-zinc-200 rounded-lg px-3 py-1.5 text-xs font-bold text-zinc-600 hover:bg-zinc-50 transition-colors"
                        >
                            {LANG_LABELS[lang]}
                            <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" className="text-zinc-400">
                                <path d="M4 6L0 2h8z" />
                            </svg>
                        </button>
                        {langOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setLangOpen(false)} />
                                <div className="absolute right-0 top-9 bg-white border border-zinc-100 rounded-2xl shadow-2xl z-20 overflow-hidden min-w-[64px] py-1">
                                    {(["uz", "ru", "en"] as Lang[]).map(l => (
                                        <button
                                            key={l}
                                            onClick={() => { setLang(l); setLangOpen(false) }}
                                            className={`block w-full text-center px-5 py-2.5 text-sm font-bold transition-colors hover:bg-zinc-50 ${lang === l ? "text-green-700" : "text-zinc-500"}`}
                                        >
                                            {LANG_LABELS[l]}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Main content group — vertically centered */}
                <div className="flex flex-col justify-center flex-1 py-4">

                    {/* Step chip */}
                    <div className="mb-4">
                        <span
                            className="inline-flex items-center text-xs font-bold tracking-widest px-3 py-1 rounded-full uppercase"
                            style={{ color: s.dotColor, background: s.accentLight }}
                        >
                            {t("onboarding_step_label")} {step + 1} / {STEPS.length}
                        </span>
                    </div>

                    {/* Title */}
                    <h1
                        className="font-extrabold text-zinc-900 leading-tight mb-3"
                        style={{ fontSize: "clamp(1.65rem, 3.5vw, 2.5rem)", letterSpacing: "-0.02em" }}
                    >
                        {t(s.titleKey)}
                    </h1>

                    {/* Description */}
                    <p
                        className="text-zinc-500 leading-relaxed mb-8"
                        style={{ fontSize: "clamp(0.875rem, 1.6vw, 1rem)", maxWidth: 380 }}
                    >
                        {t(s.descKey)}
                    </p>

                    {/* CTA */}
                    {isLast ? (
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => router.push("/auth/register")}
                                className="w-full sm:w-auto py-4 px-8 rounded-2xl font-extrabold text-white text-sm tracking-wide flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-lg"
                                style={{ background: `linear-gradient(135deg, ${s.bgFrom}, ${s.bgTo})`, boxShadow: `0 8px 24px ${s.dotColor}44` }}
                            >
                                {t("onboarding_get_started")} →
                            </button>
                            <button
                                onClick={() => router.push("/auth/login")}
                                className="w-full sm:w-auto py-3.5 px-8 rounded-2xl font-semibold text-sm text-zinc-500 border border-zinc-200 hover:bg-zinc-50 transition-colors"
                            >
                                {t("onboarding_have_account")}
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setStep(i => i + 1)}
                                className="flex items-center gap-2 py-4 px-8 rounded-2xl font-extrabold text-white text-sm hover:opacity-90 active:scale-[0.98] transition-all shadow-lg"
                                style={{ background: `linear-gradient(135deg, ${s.bgFrom}, ${s.bgTo})`, boxShadow: `0 8px 24px ${s.dotColor}44` }}
                            >
                                {t("onboarding_next")}
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                    <path fillRule="evenodd" d="M6.22 3.22a.75.75 0 011.06 0l4 4a.75.75 0 010 1.06l-4 4a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z" clipRule="evenodd" />
                                </svg>
                            </button>
                            <button
                                onClick={() => router.push("/auth/login")}
                                className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors py-2"
                            >
                                {t("onboarding_skip")}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
