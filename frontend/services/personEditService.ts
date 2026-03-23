import API_BASE from "./api"
import { apiFetch } from "@/lib/apiFetch"
import { Person } from "./personService"

export interface UpdatePersonInput {
    first_name?: string
    last_name?: string
    email?: string
    gender?: string
    birth_date?: string
    biography?: string
}

export async function updatePerson(id: string, input: UpdatePersonInput): Promise<Person> {
    const res = await apiFetch(`${API_BASE}/persons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error("Failed to update person")
    return res.json()
}
