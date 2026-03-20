import { apiFetch } from "@/lib/apiFetch"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

export interface Notification {
    id: string
    user_id: string
    family_id: string | null
    type: string
    ref: string
    message: string
    read: boolean
    created_at: string
}

export async function getNotifications(): Promise<{ notifications: Notification[]; unread: number }> {
    const res = await apiFetch(`${API}/notifications`)
    if (!res.ok) throw new Error("failed to fetch notifications")
    return res.json()
}

export async function markRead(id: string): Promise<void> {
    await apiFetch(`${API}/notifications/${id}/read`, { method: "PATCH" })
}

export async function getUnreadCount(): Promise<number> {
    const res = await apiFetch(`${API}/notifications/unread-count`)
    if (!res.ok) return 0
    const data = await res.json()
    return data.unread ?? 0
}
