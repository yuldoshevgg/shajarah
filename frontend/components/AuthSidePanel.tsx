"use client"

import { useT } from "@/lib/i18n"

const FEATURES = [
    { icon: "🌳", key: "auth_feature_trees" as const },
    { icon: "📷", key: "auth_feature_memories" as const },
    { icon: "🔔", key: "auth_feature_birthdays" as const },
    { icon: "👥", key: "auth_feature_invite" as const },
]

export default function AuthSidePanel() {
    const { t } = useT()

    return (
        <div
            className="relative flex flex-col overflow-hidden w-full h-[30vh] sm:h-screen sm:w-[44%] flex-shrink-0"
            style={{ background: "linear-gradient(160deg, #1b5e20 0%, #388e3c 50%, #4caf50 100%)" }}
        >
            {/* Decorative circles */}
            <div className="absolute rounded-full" style={{ width: 340, height: 340, background: "rgba(255,255,255,0.06)", top: -80, right: -80 }} />
            <div className="absolute rounded-full" style={{ width: 200, height: 200, background: "rgba(255,255,255,0.06)", top: 120, left: -60 }} />
            <div className="absolute rounded-full" style={{ width: 280, height: 280, background: "rgba(255,255,255,0.05)", bottom: -60, right: -40 }} />
            <div className="absolute rounded-full" style={{ width: 120, height: 120, background: "rgba(255,255,255,0.07)", bottom: 140, left: 20 }} />

            {/* TOP: logo + tagline + description */}
            <div className="relative z-10 flex flex-col gap-6 p-6 sm:p-10">
                {/* Logo */}
                <div className="flex items-center gap-3">
                    <div
                        className="flex items-center justify-center rounded-xl text-xl select-none flex-shrink-0"
                        style={{ width: 42, height: 42, background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
                    >
                        🌿
                    </div>
                    <span className="font-bold text-white text-xl tracking-tight">Shajarah</span>
                </div>

                {/* Tagline + description */}
                <div className="hidden sm:block">
                    <h2
                        className="font-extrabold text-white leading-tight mb-3"
                        style={{ fontSize: "clamp(1.5rem, 2.8vw, 2.4rem)", whiteSpace: "pre-line" }}
                    >
                        {t("auth_tagline")}
                    </h2>
                    <p className="text-white/70 text-sm sm:text-base leading-relaxed">
                        {t("auth_tagline_desc")}
                    </p>
                </div>
            </div>

            {/* BOTTOM: feature list — desktop only */}
            <ul className="relative z-10 hidden sm:flex flex-col gap-3 mt-auto px-10 pb-10">
                {FEATURES.map(f => (
                    <li key={f.key} className="flex items-center gap-3">
                        <div
                            className="flex items-center justify-center rounded-xl text-base flex-shrink-0"
                            style={{ width: 38, height: 38, background: "rgba(255,255,255,0.15)" }}
                        >
                            {f.icon}
                        </div>
                        <span className="text-white/90 text-sm font-medium">{t(f.key)}</span>
                    </li>
                ))}
            </ul>
        </div>
    )
}
