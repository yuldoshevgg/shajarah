import API_BASE from "./api"
import { apiFetch } from "@/lib/apiFetch"

export interface Photo {
    id: string
    person_id: string
    url: string
    uploaded_at: string
}

export async function getPhotos(personId: string): Promise<Photo[]> {
    const res = await apiFetch(`${API_BASE}/persons/${personId}/photos`)
    if (!res.ok) throw new Error("Failed to fetch photos")
    return res.json()
}

export async function uploadPhoto(personId: string, file: File): Promise<Photo> {
    const form = new FormData()
    form.append("photo", file)

    const res = await apiFetch(`${API_BASE}/persons/${personId}/photos`, {
        method: "POST",
        body: form,
    })

    if (!res.ok) throw new Error("Failed to upload photo")
    return res.json()
}
