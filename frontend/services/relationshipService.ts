import API_BASE from "./api"
import { apiFetch } from "@/lib/apiFetch"

export interface CreateRelationshipInput {
    person1_id: string
    person2_id: string
    relation_type: string
}

export async function createRelationship(input: CreateRelationshipInput): Promise<void> {
    const res = await apiFetch(`${API_BASE}/relationships`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error("Failed to create relationship")
}
