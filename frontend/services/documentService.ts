import API_BASE from "./api"
import { apiFetch } from "@/lib/apiFetch"

export interface Document {
    id: string
    person_id: string
    file_url: string
    description: string
    uploaded_at: string
}

export async function getDocuments(personId: string): Promise<Document[]> {
    const res = await apiFetch(`${API_BASE}/persons/${personId}/documents`)
    if (!res.ok) throw new Error("Failed to fetch documents")
    return res.json()
}

export async function uploadDocument(personId: string, file: File, description?: string): Promise<Document> {
    const form = new FormData()
    form.append("document", file)
    if (description) form.append("description", description)
    const res = await apiFetch(`${API_BASE}/persons/${personId}/documents`, { method: "POST", body: form })
    if (!res.ok) throw new Error("Failed to upload document")
    return res.json()
}

export async function deleteDocument(id: string): Promise<void> {
    await apiFetch(`${API_BASE}/documents/${id}`, { method: "DELETE" })
}
