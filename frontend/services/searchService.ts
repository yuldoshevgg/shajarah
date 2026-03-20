import { apiFetch } from "@/lib/apiFetch"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

export interface PersonResult {
    id: string
    family_id: string | null
    first_name: string
    last_name: string
    gender: string
    birth_date: string | null
    biography: string
    created_at: string
}

export async function searchPersons(q: string): Promise<PersonResult[]> {
    const res = await apiFetch(`${API}/search/persons?q=${encodeURIComponent(q)}`)
    if (!res.ok) throw new Error("search failed")
    const data = await res.json()
    return data.persons ?? []
}
