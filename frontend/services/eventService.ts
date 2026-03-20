import API_BASE from "./api"
import { apiFetch } from "@/lib/apiFetch"

export interface Event {
    id: string
    person_id: string
    event_type: string
    event_date: string | null
    description: string
}

export interface CreateEventInput {
    person_id: string
    event_type: string
    event_date?: string
    description?: string
}

export const EVENT_TYPES = ["birth", "marriage", "migration", "death"] as const

export async function getEvents(personId: string): Promise<Event[]> {
    const res = await apiFetch(`${API_BASE}/events/${personId}`)
    if (!res.ok) throw new Error("Failed to fetch events")
    return res.json()
}

export async function createEvent(input: CreateEventInput): Promise<Event> {
    const res = await apiFetch(`${API_BASE}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error("Failed to create event")
    return res.json()
}
