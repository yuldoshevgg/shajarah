import { getToken, removeToken } from "./auth"

export async function apiFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
    const token = getToken()

    const headers: HeadersInit = {
        ...(init?.headers ?? {}),
    }

    if (token) {
        (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`
    }

    const res = await fetch(input, { ...init, headers })

    if (res.status === 401) {
        removeToken()
        window.location.href = "/auth/login"
    }

    return res
}
