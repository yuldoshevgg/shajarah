"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { register } from "@/services/authService"
import { useT } from "@/lib/i18n"
import AuthSidePanel from "@/components/AuthSidePanel"
import LangSwitcher from "@/components/LangSwitcher"

// ── SVG Icons ─────────────────────────────────────────────────────────────────
function IconPerson() {
    return (
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="10" cy="6" r="4" />
            <path d="M2 18c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
    )
}
function IconEmail() {
    return (
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="16" height="13" rx="2" />
            <path d="M2 7l8 5 8-5" />
        </svg>
    )
}
function IconLock() {
    return (
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="9" width="12" height="9" rx="2" />
            <path d="M7 9V6a3 3 0 016 0v3" />
        </svg>
    )
}
function IconEye({ open }: { open: boolean }) {
    return open ? (
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M1 10s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7z" />
            <circle cx="10" cy="10" r="3" />
        </svg>
    ) : (
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M3 3l14 14M8.5 8.7A3 3 0 0013.3 13M6.5 6.3C4.2 7.7 2 10 2 10s3 6 8 6c1.5 0 2.9-.4 4.1-1.1M10 4c5 0 8 6 8 6s-.6 1.1-1.7 2.3" />
        </svg>
    )
}
function IconChevron() {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M4 6l4 4 4-4" />
        </svg>
    )
}

function Field({
    icon, type, value, onChange, placeholder, rightSlot, required: req = true,
}: {
    icon: React.ReactNode
    type: string
    value: string
    onChange: (v: string) => void
    placeholder: string
    rightSlot?: React.ReactNode
    required?: boolean
}) {
    return (
        <div className="flex items-center gap-3 rounded-2xl px-4" style={{ background: "#f2f2f2", height: 56 }}>
            <span className="text-zinc-400 flex-shrink-0">{icon}</span>
            <input
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                required={req}
                className="flex-1 bg-transparent text-sm text-zinc-800 placeholder-zinc-400 outline-none"
            />
            {rightSlot}
        </div>
    )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function RegisterPage() {
    const router = useRouter()
    const { t } = useT()
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [gender, setGender] = useState("male")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPw, setShowPw] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)
        setLoading(true)
        try {
            await register(email, password, firstName, lastName, gender)
            router.push("/families")
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Registration failed")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="w-screen h-screen flex flex-col sm:flex-row overflow-hidden">

            {/* ── Left: branding panel ── */}
            <AuthSidePanel />

            {/* ── Right: form panel ── */}
            <div className="flex-1 overflow-y-auto" style={{ background: "#ffffff" }}>
                <div className="flex flex-col min-h-full px-6 py-8 sm:px-12 sm:py-10 max-w-lg mx-auto">

                    {/* Top bar: back + language */}
                    <div className="flex items-center justify-between mb-6 sm:mb-8">
                        <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors flex items-center gap-1.5">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <path d="M10 3L5 8l5 5" />
                            </svg>
                            {t("auth_back")}
                        </Link>
                        <LangSwitcher />
                    </div>

                    {/* Title */}
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 mb-1" style={{ letterSpacing: "-0.02em" }}>
                        {t("register_welcome")}
                    </h1>
                    <p className="text-zinc-400 text-sm mb-6 sm:mb-8">{t("register_welcome_desc")}</p>

                    {/* Tab switcher */}
                    <div className="flex rounded-2xl p-1 mb-6 sm:mb-8" style={{ background: "#f0f0f0" }}>
                        <Link href="/auth/login" className="flex-1 py-2.5 rounded-xl text-center text-sm font-medium text-zinc-400 hover:text-zinc-600 transition-colors">
                            {t("auth_tab_login")}
                        </Link>
                        <div className="flex-1 py-2.5 rounded-xl text-center text-sm font-bold text-zinc-900 shadow-sm" style={{ background: "#ffffff" }}>
                            {t("auth_tab_register")}
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="rounded-xl px-4 py-3 text-sm mb-4 text-red-700" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                        {/* Name row */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center gap-3 rounded-2xl px-4" style={{ background: "#f2f2f2", height: 56 }}>
                                <span className="text-zinc-400 flex-shrink-0"><IconPerson /></span>
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={e => setFirstName(e.target.value)}
                                    placeholder={t("register_first_placeholder")}
                                    required
                                    className="flex-1 min-w-0 bg-transparent text-sm text-zinc-800 placeholder-zinc-400 outline-none"
                                />
                            </div>
                            <div className="flex items-center gap-3 rounded-2xl px-4" style={{ background: "#f2f2f2", height: 56 }}>
                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={e => setLastName(e.target.value)}
                                    placeholder={t("register_last_placeholder")}
                                    className="flex-1 min-w-0 bg-transparent text-sm text-zinc-800 placeholder-zinc-400 outline-none"
                                />
                            </div>
                        </div>

                        {/* Gender */}
                        <div className="flex items-center gap-3 rounded-2xl px-4 relative" style={{ background: "#f2f2f2", height: 56 }}>
                            <span className="text-zinc-400 flex-shrink-0"><IconPerson /></span>
                            <select
                                value={gender}
                                onChange={e => setGender(e.target.value)}
                                required
                                className="flex-1 bg-transparent text-sm text-zinc-700 outline-none appearance-none cursor-pointer"
                            >
                                <option value="male">{t("male")}</option>
                                <option value="female">{t("female")}</option>
                            </select>
                            <span className="text-zinc-400 flex-shrink-0 pointer-events-none"><IconChevron /></span>
                        </div>

                        <Field
                            icon={<IconEmail />}
                            type="email"
                            value={email}
                            onChange={setEmail}
                            placeholder={t("register_email_placeholder")}
                        />

                        <Field
                            icon={<IconLock />}
                            type={showPw ? "text" : "password"}
                            value={password}
                            onChange={setPassword}
                            placeholder={t("register_password_placeholder")}
                            rightSlot={
                                <button type="button" onClick={() => setShowPw(v => !v)} className="text-zinc-400 hover:text-zinc-600 flex-shrink-0">
                                    <IconEye open={showPw} />
                                </button>
                            }
                        />

                        <p className="text-xs text-zinc-400 px-1">{t("register_password_hint")}</p>

                        {/* CTA */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 rounded-2xl font-extrabold text-white text-sm tracking-wide mt-1 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60"
                            style={{ background: "linear-gradient(135deg, #2e7d32, #4caf50)", boxShadow: "0 6px 20px rgba(76,175,80,0.35)" }}
                        >
                            {loading ? "…" : t("register_cta")}
                        </button>
                    </form>

                    {/* Footer */}
                    <p className="text-center text-sm text-zinc-400 mt-6">
                        {t("register_have_account_cta")}{" "}
                        <Link href="/auth/login" className="font-bold" style={{ color: "#388e3c" }}>
                            {t("register_sign_in_now")}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
