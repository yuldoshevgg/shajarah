"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
    getPerson,
    getPersonRelationships,
    Person,
    PersonRelationshipView,
} from "../../../services/personService"
import { getPhotos, uploadPhoto, Photo } from "../../../services/photoService"
import { getStories, createStory, Story } from "../../../services/storyService"
import { getEvents, createEvent, Event, EVENT_TYPES } from "../../../services/eventService"
import { getDocuments, uploadDocument, deleteDocument, Document } from "../../../services/documentService"
import API_BASE from "../../../services/api"
import { apiFetch } from "../../../lib/apiFetch"
import { getPersonId } from "../../../lib/auth"

interface Props {
    params: Promise<{ id: string }>
}

export default function PersonProfilePage({ params }: Props) {
    const router = useRouter()
    const { id: personId } = use(params)

    const [person, setPerson] = useState<Person | null>(null)
    const [relationships, setRelationships] = useState<PersonRelationshipView[]>([])
    const [photos, setPhotos] = useState<Photo[]>([])
    const [uploading, setUploading] = useState(false)
    const [stories, setStories] = useState<Story[]>([])
    const [showStoryForm, setShowStoryForm] = useState(false)
    const [storyTitle, setStoryTitle] = useState("")
    const [storyContent, setStoryContent] = useState("")
    const [storyError, setStoryError] = useState("")
    const [events, setEvents] = useState<Event[]>([])
    const [showEventForm, setShowEventForm] = useState(false)
    const [eventType, setEventType] = useState<string>(EVENT_TYPES[0])
    const [eventDate, setEventDate] = useState("")
    const [eventDescription, setEventDescription] = useState("")
    const [eventError, setEventError] = useState("")
    const [documents, setDocuments] = useState<Document[]>([])
    const [uploadingDoc, setUploadingDoc] = useState(false)
    const [docDescription, setDocDescription] = useState("")
    const [showDocForm, setShowDocForm] = useState(false)
    const [error, setError] = useState("")
    const [claimMsg, setClaimMsg] = useState("")

    useEffect(() => {
        getPerson(personId)
            .then(setPerson)
            .catch(() => setError("Person not found"))

        getPersonRelationships(personId)
            .then(setRelationships)
            .catch(() => {})

        getPhotos(personId)
            .then(setPhotos)
            .catch(() => {})

        getStories(personId)
            .then(setStories)
            .catch(() => {})

        getEvents(personId)
            .then(setEvents)
            .catch(() => {})

        getDocuments(personId)
            .then(setDocuments)
            .catch(() => {})
    }, [personId])

    const handleCreateEvent = async () => {
        setEventError("")
        try {
            const event = await createEvent({
                person_id: personId,
                event_type: eventType,
                event_date: eventDate || undefined,
                description: eventDescription || undefined,
            })
            setEvents(prev => {
                const updated = [...prev, event]
                return updated.sort((a, b) => {
                    if (!a.event_date) return 1
                    if (!b.event_date) return -1
                    return new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
                })
            })
            setEventType(EVENT_TYPES[0])
            setEventDate("")
            setEventDescription("")
            setShowEventForm(false)
        } catch {
            setEventError("Failed to save event")
        }
    }

    const handleCreateStory = async () => {
        setStoryError("")
        try {
            const story = await createStory({
                person_id: personId,
                title: storyTitle,
                content: storyContent || undefined,
            })
            setStories(prev => [story, ...prev])
            setStoryTitle("")
            setStoryContent("")
            setShowStoryForm(false)
        } catch {
            setStoryError("Failed to save story")
        }
    }

    const handleDocFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setUploadingDoc(true)
        try {
            const doc = await uploadDocument(personId, file, docDescription)
            setDocuments(prev => [doc, ...prev])
            setDocDescription("")
            setShowDocForm(false)
        } catch {
        } finally {
            setUploadingDoc(false)
            e.target.value = ""
        }
    }

    const handleDeleteDoc = async (id: string) => {
        await deleteDocument(id)
        setDocuments(prev => prev.filter(d => d.id !== id))
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setUploading(true)
        try {
            const photo = await uploadPhoto(personId, file)
            setPhotos(prev => [photo, ...prev])
        } catch {
        } finally {
            setUploading(false)
            e.target.value = ""
        }
    }

    const handleClaim = async () => {
        setClaimMsg("")
        try {
            const r = await apiFetch(`${API_BASE}/persons/${personId}/claim-request`, { method: "POST" })
            const body = await r.json()
            if (!r.ok) { setClaimMsg(body.error ?? "Failed to submit claim"); return }
            setClaimMsg("Claim request submitted. Waiting for admin approval.")
        } catch { setClaimMsg("Failed to submit claim") }
    }

    if (error) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
                <p className="text-zinc-500">{error}</p>
            </div>
        )
    }

    if (!person) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
                <p className="text-zinc-400">Loading...</p>
            </div>
        )
    }

    const fullName = [person.first_name, person.last_name].filter(Boolean).join(" ")

    const formattedBirthDate = person.birth_date
        ? new Date(person.birth_date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
          })
        : null

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
                <button
                    onClick={() => router.push(`/family-tree/${person.family_id}`)}
                    className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors mb-6 inline-block"
                >
                    ← Back to Tree
                </button>

                <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-5 sm:p-8 mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                        <div className="flex-1">
                            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                                {fullName}
                            </h1>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 capitalize">
                                {person.gender}
                            </p>
                        </div>
                        {/* Claim Profile button — only for users not already linked to this person */}
                        {getPersonId() !== personId && (
                            <div className="sm:flex-shrink-0">
                                <button
                                    onClick={handleClaim}
                                    className="w-full sm:w-auto text-sm px-4 py-2 border border-indigo-300 text-indigo-700 dark:text-indigo-300 rounded-lg font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                                >
                                    Claim Profile
                                </button>
                                {claimMsg && (
                                    <p className={`text-xs mt-1 ${claimMsg.includes("submitted") ? "text-green-600" : "text-red-500"}`}>
                                        {claimMsg}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="grid gap-4">
                        {formattedBirthDate && (
                            <div>
                                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1">
                                    Born
                                </p>
                                <p className="text-zinc-800 dark:text-zinc-200">
                                    {formattedBirthDate}
                                </p>
                            </div>
                        )}

                        {person.biography && (
                            <div>
                                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1">
                                    Biography
                                </p>
                                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                    {person.biography}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-8 mb-6">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                        Relationships
                    </h2>
                    {relationships.length === 0 ? (
                        <p className="text-sm text-zinc-400">No relationships recorded.</p>
                    ) : (
                        <ul className="divide-y divide-zinc-100 dark:divide-zinc-700">
                            {relationships.map(rel => {
                                const name = [rel.related_person.first_name, rel.related_person.last_name]
                                    .filter(Boolean)
                                    .join(" ")
                                return (
                                    <li key={rel.id} className="py-3 flex items-center justify-between">
                                        <button
                                            onClick={() => router.push(`/person/${rel.related_person.id}`)}
                                            className="font-medium text-zinc-900 dark:text-zinc-50 hover:underline"
                                        >
                                            {name}
                                        </button>
                                        <span className="text-sm text-zinc-500 capitalize">
                                            {rel.relation_type}
                                        </span>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>

                <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-8 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                            Stories
                        </h2>
                        <button
                            onClick={() => setShowStoryForm(true)}
                            className="text-sm px-4 py-1.5 border border-zinc-300 dark:border-zinc-600 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                        >
                            Add Story
                        </button>
                    </div>

                    {showStoryForm && (
                        <div className="mb-4 flex flex-col gap-3">
                            <input
                                className="border border-zinc-300 dark:border-zinc-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 outline-none focus:ring-2 focus:ring-zinc-400"
                                placeholder="Title *"
                                value={storyTitle}
                                onChange={(e) => setStoryTitle(e.target.value)}
                            />
                            <textarea
                                className="border border-zinc-300 dark:border-zinc-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 outline-none focus:ring-2 focus:ring-zinc-400 resize-none"
                                placeholder="Content"
                                rows={4}
                                value={storyContent}
                                onChange={(e) => setStoryContent(e.target.value)}
                            />
                            {storyError && <p className="text-red-500 text-xs">{storyError}</p>}
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCreateStory}
                                    className="flex-1 py-2 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors"
                                >
                                    Save
                                </button>
                                <button
                                    onClick={() => { setShowStoryForm(false); setStoryTitle(""); setStoryContent(""); setStoryError("") }}
                                    className="flex-1 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {stories.length === 0 && !showStoryForm ? (
                        <p className="text-sm text-zinc-400">No stories yet.</p>
                    ) : (
                        <ul className="divide-y divide-zinc-100 dark:divide-zinc-700">
                            {stories.map(story => (
                                <li key={story.id} className="py-4">
                                    <p className="font-medium text-zinc-900 dark:text-zinc-50 mb-1">
                                        {story.title}
                                    </p>
                                    {story.content && (
                                        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap mb-2">
                                            {story.content}
                                        </p>
                                    )}
                                    <p className="text-xs text-zinc-400">
                                        {new Date(story.created_at).toLocaleDateString("en-US", {
                                            year: "numeric",
                                            month: "long",
                                            day: "numeric",
                                        })}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-8 mb-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                            Timeline
                        </h2>
                        <button
                            onClick={() => setShowEventForm(true)}
                            className="text-sm px-4 py-1.5 border border-zinc-300 dark:border-zinc-600 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                        >
                            Add Event
                        </button>
                    </div>

                    {showEventForm && (
                        <div className="mb-6 flex flex-col gap-3">
                            <select
                                className="border border-zinc-300 dark:border-zinc-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 outline-none focus:ring-2 focus:ring-zinc-400"
                                value={eventType}
                                onChange={(e) => setEventType(e.target.value)}
                            >
                                {EVENT_TYPES.map(t => (
                                    <option key={t} value={t} className="capitalize">{t}</option>
                                ))}
                            </select>
                            <input
                                className="border border-zinc-300 dark:border-zinc-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 outline-none focus:ring-2 focus:ring-zinc-400"
                                type="date"
                                value={eventDate}
                                onChange={(e) => setEventDate(e.target.value)}
                            />
                            <textarea
                                className="border border-zinc-300 dark:border-zinc-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 outline-none focus:ring-2 focus:ring-zinc-400 resize-none"
                                placeholder="Description"
                                rows={3}
                                value={eventDescription}
                                onChange={(e) => setEventDescription(e.target.value)}
                            />
                            {eventError && <p className="text-red-500 text-xs">{eventError}</p>}
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCreateEvent}
                                    className="flex-1 py-2 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors"
                                >
                                    Save
                                </button>
                                <button
                                    onClick={() => { setShowEventForm(false); setEventDate(""); setEventDescription(""); setEventError("") }}
                                    className="flex-1 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {events.length === 0 && !showEventForm ? (
                        <p className="text-sm text-zinc-400">No events recorded.</p>
                    ) : (
                        <div className="relative">
                            <div className="absolute left-[90px] top-0 bottom-0 w-px bg-zinc-200 dark:bg-zinc-700" />
                            <ul className="space-y-6">
                                {events.map(event => (
                                    <li key={event.id} className="flex gap-4 items-start">
                                        <div className="w-[82px] text-right shrink-0">
                                            <span className="text-xs text-zinc-400">
                                                {event.event_date
                                                    ? new Date(event.event_date).toLocaleDateString("en-US", { year: "numeric", month: "short" })
                                                    : "—"}
                                            </span>
                                        </div>
                                        <div className="relative flex items-center justify-center w-4 shrink-0 mt-0.5">
                                            <div className="w-2.5 h-2.5 rounded-full bg-zinc-400 dark:bg-zinc-500 ring-2 ring-white dark:ring-zinc-800" />
                                        </div>
                                        <div className="pb-2">
                                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 capitalize">
                                                {event.event_type}
                                            </p>
                                            {event.description && (
                                                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                                                    {event.description}
                                                </p>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-8 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                            Photos
                        </h2>
                        <label className="cursor-pointer text-sm px-4 py-1.5 border border-zinc-300 dark:border-zinc-600 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors">
                            {uploading ? "Uploading..." : "Upload"}
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileChange}
                                disabled={uploading}
                            />
                        </label>
                    </div>
                    {photos.length === 0 ? (
                        <p className="text-sm text-zinc-400">No photos yet.</p>
                    ) : (
                        <div className="grid grid-cols-3 gap-3">
                            {photos.map(photo => (
                                <img
                                    key={photo.id}
                                    src={`${API_BASE}${photo.url}`}
                                    alt=""
                                    className="w-full aspect-square object-cover rounded-xl"
                                />
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                            Documents
                        </h2>
                        <button
                            onClick={() => setShowDocForm(v => !v)}
                            className="text-sm px-4 py-1.5 border border-zinc-300 dark:border-zinc-600 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                        >
                            Upload
                        </button>
                    </div>

                    {showDocForm && (
                        <div className="mb-4 flex flex-col gap-3">
                            <input
                                className="border border-zinc-300 dark:border-zinc-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 outline-none focus:ring-2 focus:ring-zinc-400"
                                placeholder="Description (optional)"
                                value={docDescription}
                                onChange={e => setDocDescription(e.target.value)}
                            />
                            <label className="cursor-pointer flex items-center justify-center border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-lg py-6 text-sm text-zinc-500 hover:border-zinc-400 transition-colors">
                                {uploadingDoc ? "Uploading..." : "Choose file…"}
                                <input
                                    type="file"
                                    className="hidden"
                                    onChange={handleDocFileChange}
                                    disabled={uploadingDoc}
                                />
                            </label>
                        </div>
                    )}

                    {documents.length === 0 ? (
                        <p className="text-sm text-zinc-400">No documents yet.</p>
                    ) : (
                        <ul className="divide-y divide-zinc-100 dark:divide-zinc-700">
                            {documents.map(doc => (
                                <li key={doc.id} className="py-3 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className="text-lg shrink-0">📄</span>
                                        <div className="min-w-0">
                                            <a
                                                href={`${API_BASE}${doc.file_url}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-sm font-medium text-blue-600 hover:underline truncate block"
                                            >
                                                {doc.file_url.split("/").pop()}
                                            </a>
                                            {doc.description && (
                                                <p className="text-xs text-zinc-400 mt-0.5">{doc.description}</p>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteDoc(doc.id)}
                                        className="text-xs text-zinc-400 hover:text-red-500 shrink-0 transition-colors"
                                    >
                                        Remove
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    )
}
