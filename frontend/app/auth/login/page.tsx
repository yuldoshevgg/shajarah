"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { login } from "@/services/authService"
import { useT } from "@/lib/i18n"
import AuthSidePanel from "@/components/AuthSidePanel"
import LangSwitcher from "@/components/LangSwitcher"

// ── SVG Icons ─────────────────────────────────────────────────────────────────
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

// ── Field component ───────────────────────────────────────────────────────────
function Field({
    icon, type, value, onChange, placeholder, rightSlot,
}: {
    icon: React.ReactNode
    type: string
    value: string
    onChange: (v: string) => void
    placeholder: string
    rightSlot?: React.ReactNode
}) {
    return (
        <div className="flex items-center gap-3 rounded-2xl px-4" style={{ background: "#f2f2f2", height: 56 }}>
            <span className="text-zinc-400 flex-shrink-0">{icon}</span>
            <input
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                required
                className="flex-1 bg-transparent text-sm text-zinc-800 placeholder-zinc-400 outline-none"
            />
            {rightSlot}
        </div>
    )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function LoginPage() {
    const router = useRouter()
    const { t } = useT()
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
            await login(email, password)
            router.push("/families")
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Login failed")
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
                        {t("login_welcome")}
                    </h1>
                    <p className="text-zinc-400 text-sm mb-6 sm:mb-8">{t("login_welcome_desc")}</p>

                    {/* Tab switcher */}
                    <div className="flex rounded-2xl p-1 mb-6 sm:mb-8" style={{ background: "#f0f0f0" }}>
                        <div className="flex-1 py-2.5 rounded-xl text-center text-sm font-bold text-zinc-900 shadow-sm" style={{ background: "#ffffff" }}>
                            {t("auth_tab_login")}
                        </div>
                        <Link href="/auth/register" className="flex-1 py-2.5 rounded-xl text-center text-sm font-medium text-zinc-400 hover:text-zinc-600 transition-colors">
                            {t("auth_tab_register")}
                        </Link>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="rounded-xl px-4 py-3 text-sm mb-4 text-red-700" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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

                        {/* Forgot password */}
                        <div className="flex justify-end">
                            <button type="button" className="text-sm font-semibold" style={{ color: "#388e3c" }}>
                                {t("login_forgot")}
                            </button>
                        </div>

                        {/* CTA */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 rounded-2xl font-extrabold text-white text-sm tracking-wide mt-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60"
                            style={{ background: "linear-gradient(135deg, #2e7d32, #4caf50)", boxShadow: "0 6px 20px rgba(76,175,80,0.35)" }}
                        >
                            {loading ? "…" : t("login_cta")}
                        </button>
                    </form>

                    {/* Footer */}
                    <p className="text-center text-sm text-zinc-400 mt-6">
                        {t("login_no_account_cta")}{" "}
                        <Link href="/auth/register" className="font-bold" style={{ color: "#388e3c" }}>
                            {t("login_register_now")}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
