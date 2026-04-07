import API_BASE from "./api"
import { setToken, setPersonId, getToken } from "@/lib/auth"

export interface AuthUser {
    id: string
    email: string
    plan: "free" | "premium"
    created_at: string
}

export interface AuthPerson {
    id: string
    first_name: string
    last_name: string
    gender: string
}

export interface AuthResponse {
    token: string
    user: AuthUser
    person?: AuthPerson
    person_id?: string
}

export async function register(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    gender: string
): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, first_name: firstName, last_name: lastName, gender }),
    })
    if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Registration failed")
    }
    const data: AuthResponse = await res.json()
    setToken(data.token)
    if (data.person_id) setPersonId(data.person_id)
    return data
}

export async function login(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Login failed")
    }
    const data: AuthResponse = await res.json()
    setToken(data.token)
    if (data.person_id) setPersonId(data.person_id)
    return data
}

export async function upgradePlan(plan: "free" | "premium"): Promise<{ plan: string }> {
    const res = await fetch(`${API_BASE}/auth/plan`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ plan }),
    })
    if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Failed to update plan")
    }
    return res.json()
}
