import API_BASE from "./api"
import { apiFetch } from "@/lib/apiFetch"

export interface Family {
    id: string
    name: string
    owner_id: string | null
    created_at: string
    user_role?: string
}

export async function getFamilies(): Promise<Family[]> {
    const res = await apiFetch(`${API_BASE}/families`)
    if (!res.ok) throw new Error("Failed to fetch families")
    return res.json()
}

export async function createFamily(name: string): Promise<Family> {
    const res = await apiFetch(`${API_BASE}/families`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
    })
    if (!res.ok) throw new Error("Failed to create family")
    return res.json()
}
