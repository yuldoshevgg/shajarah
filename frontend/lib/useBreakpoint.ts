"use client"

import { useEffect, useState } from "react"

export interface Breakpoint {
    isMobile: boolean   // < 768px  — phone
    isTablet: boolean   // 768–1023px — tablet / small laptop
    isDesktop: boolean  // ≥ 1024px — laptop / desktop
    width: number
}

function compute(): Breakpoint {
    if (typeof window === "undefined")
        return { isMobile: false, isTablet: false, isDesktop: true, width: 1280 }
    const w = window.innerWidth
    return {
        isMobile:  w < 768,
        isTablet:  w >= 768 && w < 1024,
        isDesktop: w >= 1024,
        width: w,
    }
}

// SSR-safe defaults — must match what the server renders so hydration succeeds.
// useEffect updates to the real values after mount.
const SSR_DEFAULT: Breakpoint = { isMobile: false, isTablet: false, isDesktop: true, width: 1280 }

export function useBreakpoint(): Breakpoint {
    const [bp, setBp] = useState<Breakpoint>(SSR_DEFAULT)
    useEffect(() => {
        const handler = () => setBp(compute())
        handler()
        window.addEventListener("resize", handler)
        return () => window.removeEventListener("resize", handler)
    }, [])
    return bp
}
