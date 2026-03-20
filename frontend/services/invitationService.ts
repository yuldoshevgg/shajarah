import API_BASE from "./api"
import { apiFetch } from "@/lib/apiFetch"

export interface Invitation {
    id: string
    family_id: string
    email: string
    role: string
    status: string
    token: string
    invited_by: string
    created_at: string
}

export async function inviteMember(familyId: string, email: string, role: string): Promise<Invitation> {
    const res = await apiFetch(`${API_BASE}/families/${familyId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
    })
    if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Failed to send invitation")
    }
    return res.json()
}

export async function getInvitations(familyId: string): Promise<Invitation[]> {
    const res = await apiFetch(`${API_BASE}/families/${familyId}/invitations`)
    if (!res.ok) throw new Error("Failed to fetch invitations")
    return res.json()
}

export async function acceptInvitation(token: string): Promise<{ family_id: string; role: string }> {
    const res = await apiFetch(`${API_BASE}/invitations/${token}/accept`, { method: "POST" })
    if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Failed to accept invitation")
    }
    return res.json()
}
