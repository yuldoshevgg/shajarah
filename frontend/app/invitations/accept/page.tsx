"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { acceptInvitation } from "@/services/invitationService"
import { isAuthenticated } from "@/lib/auth"

function AcceptContent() {
    const router = useRouter()
    const params = useSearchParams()
    const token = params.get("token") ?? ""
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
    const [message, setMessage] = useState("")

    useEffect(() => {
        if (!token) {
            setStatus("error")
            setMessage("Invalid invitation link.")
            return
        }
        if (!isAuthenticated()) {
            router.push(`/auth/login?next=/invitations/accept?token=${token}`)
            return
        }
        acceptInvitation(token)
            .then(data => {
                setStatus("success")
                setMessage(`You joined the family as ${data.role}.`)
                setTimeout(() => router.push("/families"), 2000)
            })
            .catch(err => {
                setStatus("error")
                setMessage(err instanceof Error ? err.message : "Failed to accept invitation.")
            })
    }, [token, router])

    return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-8 max-w-sm w-full text-center">
                {status === "loading" && <p className="text-stone-500 text-sm">Joining family...</p>}
                {status === "success" && (
                    <>
                        <p className="text-green-600 font-medium mb-1">Joined!</p>
                        <p className="text-stone-500 text-sm">{message}</p>
                    </>
                )}
                {status === "error" && (
                    <>
                        <p className="text-red-600 font-medium mb-1">Error</p>
                        <p className="text-stone-500 text-sm">{message}</p>
                        <button
                            onClick={() => router.push("/families")}
                            className="mt-4 text-sm text-stone-600 underline"
                        >
                            Go to families
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}

export default function AcceptInvitationPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-stone-500 text-sm">Loading...</p></div>}>
            <AcceptContent />
        </Suspense>
    )
}
