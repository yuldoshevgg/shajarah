"use client"

import { use, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { apiFetch } from "@/lib/apiFetch"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

interface Photo {
    id: string
    url: string
    caption: string
    created_at: string
}

export default function GalleryPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: personId } = use(params)
    const [photos, setPhotos] = useState<Photo[]>([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [selected, setSelected] = useState<Photo | null>(null)
    const fileRef = useRef<HTMLInputElement>(null)

    async function load() {
        try {
            const res = await apiFetch(`${API}/persons/${personId}/photos`)
            if (res.ok) {
                const data = await res.json()
                setPhotos(data.photos ?? data ?? [])
            }
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [personId])

    async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        setUploading(true)
        const form = new FormData()
        form.append("photo", file)
        try {
            await apiFetch(`${API}/persons/${personId}/photos`, { method: "POST", body: form })
            await load()
        } finally {
            setUploading(false)
            if (fileRef.current) fileRef.current.value = ""
        }
    }

    return (
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Link href={`/person/${personId}`} style={{ color: "#888", textDecoration: "none", fontSize: 14 }}>← Profile</Link>
                    <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Photo Gallery</h1>
                </div>
                <div>
                    <input type="file" accept="image/*" ref={fileRef} onChange={handleUpload} style={{ display: "none" }} />
                    <button onClick={() => fileRef.current?.click()} disabled={uploading}
                        style={{ padding: "8px 16px", background: "#4361ee", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, opacity: uploading ? 0.7 : 1 }}>
                        {uploading ? "Uploading..." : "+ Upload Photo"}
                    </button>
                </div>
            </div>

            {loading && <p style={{ color: "#888" }}>Loading photos...</p>}
            {!loading && photos.length === 0 && <p style={{ color: "#888" }}>No photos yet. Upload the first one!</p>}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
                {photos.map(photo => (
                    <div key={photo.id} onClick={() => setSelected(photo)}
                        style={{ cursor: "pointer", borderRadius: 10, overflow: "hidden", border: "1px solid #e5e7eb", background: "#f9f9f9", transition: "transform 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}
                        onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.02)")}
                        onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}>
                        <img src={`${API}${photo.url}`} alt={photo.caption || "photo"}
                            style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} />
                        {photo.caption && (
                            <div style={{ padding: "8px 10px", fontSize: 12, color: "#555" }}>{photo.caption}</div>
                        )}
                    </div>
                ))}
            </div>

            {selected && (
                <div onClick={() => setSelected(null)}
                    style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
                    <div onClick={e => e.stopPropagation()} style={{ maxWidth: 800, maxHeight: "90vh", background: "#fff", borderRadius: 12, overflow: "hidden" }}>
                        <img src={`${API}${selected.url}`} alt={selected.caption || "photo"}
                            style={{ width: "100%", maxHeight: "80vh", objectFit: "contain", display: "block" }} />
                        {selected.caption && (
                            <div style={{ padding: "12px 16px", fontSize: 14, color: "#333" }}>{selected.caption}</div>
                        )}
                        <div style={{ padding: "0 16px 12px", textAlign: "right" }}>
                            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: 13 }}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
