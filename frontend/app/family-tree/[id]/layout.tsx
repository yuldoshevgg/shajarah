"use client"

import { useParams } from "next/navigation"
import AppSidebar from "@/components/AppSidebar"

export default function FamilyTreeLayout({ children }: { children: React.ReactNode }) {
    const params = useParams()
    const familyId = params?.id as string

    return (
        <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden" }}>
            <AppSidebar activeFamilyId={familyId} activeSection="tree" />
            <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {children}
            </main>
        </div>
    )
}
