import API_BASE from "./api"
import { apiFetch } from "@/lib/apiFetch"

export interface InvitationPreview {
    token: string
    family_id: string
    family_name: string
    invited_as: string
    invited_email: string
    inviter_name: string
    member_count: number
    status: string
}

export interface Invitation {
    id: string
    family_id: string
    person_id: string
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

export async function getInvitationPreview(token: string): Promise<InvitationPreview> {
    const res = await fetch(`${API_BASE}/invitations/${token}/preview`)
    if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Invitation not found")
    }
    return res.json()
}

export async function joinFamilyByLink(familyId: string): Promise<{
    family_id: string
    role: string
    owner_person_id: string
    owner_name: string
}> {
    const res = await apiFetch(`${API_BASE}/families/${familyId}/join`, { method: "POST" })
    if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Failed to join family")
    }
    return res.json()
}
