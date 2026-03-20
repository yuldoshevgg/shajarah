import API_BASE from "./api"
import { apiFetch } from "@/lib/apiFetch"

export interface Story {
    id: string
    person_id: string
    title: string
    content: string
    created_at: string
}

export interface CreateStoryInput {
    person_id: string
    title: string
    content?: string
}

export async function getStories(personId: string): Promise<Story[]> {
    const res = await apiFetch(`${API_BASE}/stories/${personId}`)
    if (!res.ok) throw new Error("Failed to fetch stories")
    return res.json()
}

export async function createStory(input: CreateStoryInput): Promise<Story> {
    const res = await apiFetch(`${API_BASE}/stories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error("Failed to create story")
    return res.json()
}
