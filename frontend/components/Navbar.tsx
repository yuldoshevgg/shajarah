"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { getToken } from "@/lib/auth"
import { getUnreadCount, getNotifications, markRead, Notification } from "@/services/notificationService"
import { apiFetch } from "@/lib/apiFetch"
import { useT, Lang } from "@/lib/i18n"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

const LANG_LABELS: Record<Lang, string> = { uz: "UZ", ru: "RU", en: "EN" }

export default function Navbar() {
    const router = useRouter()
    const pathname = usePathname()
    const { t, lang, setLang } = useT()
    const [unread, setUnread] = useState(0)
    const [bellOpen, setBellOpen] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)
    const [langOpen, setLangOpen] = useState(false)
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [loggedIn, setLoggedIn] = useState(false)
    const [acting, setActing] = useState<string | null>(null)

    useEffect(() => { setLoggedIn(!!getToken()) }, [])

    useEffect(() => {
        if (!loggedIn) return
        getUnreadCount().then(setUnread).catch(() => { })
    }, [loggedIn])

    const NAV_LINKS = [
        { href: "/families", label: t("nav_families") },
        { href: "/me", label: t("nav_my_profile") },
    ]

    async function openBell() {
        if (!bellOpen) {
            try {
                const data = await getNotifications()
                setNotifications(data.notifications)
                setUnread(0)
            } catch { }
        }
        setBellOpen(v => !v)
        setMenuOpen(false)
        setLangOpen(false)
    }

    async function handleAccept(n: Notification) {
        if (!n.ref) return
        setActing(n.id)
        try {
            const res = await apiFetch(`${API}/invitations/${n.ref}/accept`, { method: "POST" })
            const data = await res.json()
            await markRead(n.id)
            setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
            setBellOpen(false)
            if (data.family_id) router.push(`/family-tree/${data.family_id}`)
        } catch { } finally { setActing(null) }
    }

    async function handleDecline(n: Notification) {
        setActing(n.id)
        try {
            await markRead(n.id)
            setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
        } finally { setActing(null) }
    }

    const isNoNavRoute = pathname === "/" || pathname?.startsWith("/auth") || pathname?.startsWith("/family-tree") || pathname?.startsWith("/invitations") || pathname?.startsWith("/person") || pathname === "/families" || pathname === "/me" || pathname === "/settings" || pathname === "/invite" || pathname === "/reminders" || pathname === "/memories"
    if (!loggedIn || isNoNavRoute) return null

    return (
        <>
            <nav className="sticky top-0 z-50 bg-[#1a1a2e] text-white flex items-center justify-between px-4 sm:px-6 h-13 min-h-[52px]">
                {/* Left: logo + desktop links */}
                <div className="flex items-center gap-6">
                    <Link href="/" className="text-white font-bold text-lg no-underline shrink-0">
                        {t("nav_brand")}
                    </Link>
                    <div className="hidden sm:flex items-center gap-5">
                        {NAV_LINKS.map(l => (
                            <Link key={l.href} href={l.href} className="text-[#ccc] hover:text-white text-sm transition-colors no-underline">
                                {l.label}
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Right: lang switcher + bell + hamburger */}
                <div className="flex items-center gap-1">

                    {/* Language switcher */}
                    <div className="relative">
                        <button
                            onClick={() => { setLangOpen(v => !v); setBellOpen(false); setMenuOpen(false) }}
                            className="bg-transparent border border-white/20 rounded-md cursor-pointer text-white text-xs font-semibold px-2.5 py-1 hover:bg-white/10 transition-colors"
                        >
                            {LANG_LABELS[lang]}
                        </button>
                        {langOpen && (
                            <div className="absolute right-0 top-10 bg-white text-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden min-w-16">
                                {(["uz", "ru", "en"] as Lang[]).map(l => (
                                    <button
                                        key={l}
                                        onClick={() => { setLang(l); setLangOpen(false) }}
                                        className={`block w-full text-left px-4 py-2 text-sm hover:bg-zinc-100 transition-colors font-medium ${lang === l ? "bg-zinc-50 text-zinc-900" : "text-zinc-600"}`}
                                    >
                                        {LANG_LABELS[l]}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Bell */}
                    <div className="relative">
                        <button
                            onClick={openBell}
                            className="bg-transparent border-none cursor-pointer text-white text-xl p-2 relative"
                            aria-label={t("nav_notifications")}
                        >
                            🔔
                            {unread > 0 && (
                                <span className="absolute top-1 right-1 bg-red-500 rounded-full w-4 h-4 text-[10px] flex items-center justify-center font-bold">
                                    {unread > 9 ? "9+" : unread}
                                </span>
                            )}
                        </button>

                        {bellOpen && (
                            <div className="absolute right-0 top-12 w-screen max-w-xs sm:w-80 bg-white text-zinc-800 rounded-xl shadow-2xl z-50 max-h-96 overflow-y-auto">
                                <div className="px-4 py-3 border-b border-zinc-100 font-semibold text-sm">
                                    {t("nav_notifications")}
                                </div>
                                {notifications.length === 0 ? (
                                    <div className="px-4 py-6 text-center text-sm text-zinc-400">
                                        {t("nav_no_notifications")}
                                    </div>
                                ) : notifications.map(n => (
                                    <div key={n.id} className={`px-4 py-3 border-b border-zinc-50 ${n.read ? "bg-white" : "bg-blue-50"}`}>
                                        <p className="text-sm leading-snug text-zinc-700 mb-1">
                                            {n.type === "invitation" && !n.read ? n.message.split(".")[0] + "." : n.message}
                                        </p>
                                        <p className="text-[11px] text-zinc-400 mb-2">
                                            {new Date(n.created_at).toLocaleString()}
                                        </p>
                                        {n.type === "invitation" && !n.read && (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleAccept(n)}
                                                    disabled={acting === n.id}
                                                    className="flex-1 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold disabled:opacity-60"
                                                >
                                                    {acting === n.id ? "..." : t("nav_accept")}
                                                </button>
                                                <button
                                                    onClick={() => handleDecline(n)}
                                                    disabled={acting === n.id}
                                                    className="flex-1 py-1.5 bg-white text-zinc-500 border border-zinc-200 rounded-lg text-sm font-semibold"
                                                >
                                                    {t("nav_decline")}
                                                </button>
                                            </div>
                                        )}
                                        {(n.type !== "invitation" || n.read) && !n.read && (
                                            <button onClick={() => handleDecline(n)} className="text-indigo-500 text-xs">
                                                {t("nav_mark_read")}
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Hamburger — mobile only */}
                    <button
                        className="sm:hidden bg-transparent border-none cursor-pointer text-white p-2"
                        onClick={() => { setMenuOpen(v => !v); setBellOpen(false); setLangOpen(false) }}
                        aria-label="Menu"
                    >
                        {menuOpen ? (
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                            </svg>
                        )}
                    </button>
                </div>
            </nav>

            {/* Mobile menu drawer */}
            {menuOpen && (
                <div className="sm:hidden bg-[#1a1a2e] border-t border-white/10 px-4 py-3 space-y-1 z-40 relative">
                    {NAV_LINKS.map(l => (
                        <Link
                            key={l.href}
                            href={l.href}
                            className="block text-[#ccc] hover:text-white text-sm py-2 px-2 rounded-lg hover:bg-white/10 transition-colors no-underline"
                            onClick={() => setMenuOpen(false)}
                        >
                            {l.label}
                        </Link>
                    ))}
                </div>
            )}

            {/* Backdrop to close dropdowns */}
            {(bellOpen || menuOpen || langOpen) && (
                <div
                    className="fixed inset-0 z-30"
                    onClick={() => { setBellOpen(false); setMenuOpen(false); setLangOpen(false) }}
                />
            )}
        </>
    )
}
