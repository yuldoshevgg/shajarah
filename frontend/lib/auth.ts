const TOKEN_KEY = "shajarah_token"
const PERSON_ID_KEY = "shajarah_person_id"

export function getToken(): string | null {
    if (typeof window === "undefined") return null
    return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token)
}

export function removeToken(): void {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(PERSON_ID_KEY)
}

export function getPersonId(): string | null {
    if (typeof window === "undefined") return null
    return localStorage.getItem(PERSON_ID_KEY)
}

export function setPersonId(personId: string): void {
    localStorage.setItem(PERSON_ID_KEY, personId)
}

export function isAuthenticated(): boolean {
    return !!getToken()
}
