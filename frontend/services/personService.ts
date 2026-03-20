import API_BASE from "./api"
import { apiFetch } from "@/lib/apiFetch"

export interface Person {
    id: string
    family_id: string
    first_name: string
    last_name: string
    gender: string
    birth_date: string | null
    biography: string
    created_at: string
}

export interface CreatePersonInput {
    family_id: string
    first_name: string
    last_name: string
    gender: string
    birth_date?: string
    biography?: string
}

export interface PersonRelationshipView {
    id: string
    relation_type: string
    related_person: {
        id: string
        first_name: string
        last_name: string
    }
}

export async function getPerson(id: string): Promise<Person> {
    const res = await apiFetch(`${API_BASE}/persons/${id}`)
    if (!res.ok) throw new Error("Person not found")
    return res.json()
}

export async function getPersons(familyId: string): Promise<Person[]> {
    const res = await apiFetch(`${API_BASE}/persons?family_id=${familyId}`)
    if (!res.ok) throw new Error("Failed to fetch persons")
    return res.json()
}

export async function getPersonRelationships(id: string): Promise<PersonRelationshipView[]> {
    const res = await apiFetch(`${API_BASE}/persons/${id}/relationships`)
    if (!res.ok) throw new Error("Failed to fetch relationships")
    return res.json()
}

export async function createPerson(input: CreatePersonInput): Promise<Person> {
    const res = await apiFetch(`${API_BASE}/persons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error("Failed to create person")
    return res.json()
}
