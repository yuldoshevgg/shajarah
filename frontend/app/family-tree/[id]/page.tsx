"use client"

import { use, useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, Bell, Plus, Users, GitBranch } from "lucide-react"
import API_BASE from "../../../services/api"
import { createPerson, getPersons, Person } from "../../../services/personService"
import { createRelationship } from "../../../services/relationshipService"
import { apiFetch } from "../../../lib/apiFetch"
import { getPersonId } from "../../../lib/auth"
import FamilyTree from "../../../components/FamilyTree"
import { PersonCardData } from "../../../components/PersonCard"
import { computeKinship } from "../../../lib/kinship"
import { useT } from "../../../lib/i18n"

interface Props {
    params: Promise<{ id: string }>
}

interface GenealogyPerson {
    id: string
    first_name: string
    last_name: string
    gender: string
    birth_date?: string | null
    death_date?: string | null
    photo_url?: string | null
}

interface GenealogyTree {
    persons: GenealogyPerson[]
    parent_child: { parent_id: string; child_id: string }[]
    spouses: { person1_id: string; person2_id: string }[]
}

interface FamilyInfo {
    id: string
    name: string
}

const RELATION_TYPES = ["parent", "child", "spouse", "sibling", "father", "mother"]

export default function FamilyTreePage({ params }: Props) {
    const router = useRouter()
    const { id: familyId } = use(params)
    const { t } = useT()

    const [tree, setTree] = useState<GenealogyTree>({ persons: [], parent_child: [], spouses: [] })
    const [persons, setPersons] = useState<Person[]>([])
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [search, setSearch] = useState("")
    const [searchOpen, setSearchOpen] = useState(false)
    const [treeMode, setTreeMode] = useState<"family" | "ancestors" | "descendants">("family")
    const [familyInfo, setFamilyInfo] = useState<FamilyInfo | null>(null)
    const [generationCount, setGenerationCount] = useState(0)

    // Add Person form
    const [showPersonForm, setShowPersonForm] = useState(false)
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [gender, setGender] = useState("male")
    const [birthDate, setBirthDate] = useState("")
    const [biography, setBiography] = useState("")
    const [personError, setPersonError] = useState("")

    // Add Relationship form
    const [showRelForm, setShowRelForm] = useState(false)
    const [person1Id, setPerson1Id] = useState("")
    const [person2Id, setPerson2Id] = useState("")
    const [relationType, setRelationType] = useState(RELATION_TYPES[0])
    const [relError, setRelError] = useState("")

    const loadFamilyTree = useCallback((focusId?: string | null) => {
        apiFetch(`${API_BASE}/families/${familyId}/tree`)
            .then(r => r.json())
            .then((data: GenealogyTree) => {
                setTreeMode("family")
                setTree(data)
                if (focusId) setSelectedId(focusId)
                // Compute generation count from parent-child depth
                const childIds = new Set(data.parent_child.map(r => r.child_id))
                const roots = data.persons.filter(p => !childIds.has(p.id))
                let maxDepth = 0
                const dfs = (id: string, depth: number) => {
                    if (depth > maxDepth) maxDepth = depth
                    const children = data.parent_child.filter(r => r.parent_id === id).map(r => r.child_id)
                    for (const c of children) dfs(c, depth + 1)
                }
                for (const r of roots) dfs(r.id, 1)
                setGenerationCount(maxDepth || (data.persons.length > 0 ? 1 : 0))
            })
            .catch(console.error)
    }, [familyId])

    useEffect(() => {
        loadFamilyTree()
        getPersons(familyId).then(setPersons).catch(() => { })
        // Load family name
        apiFetch(`${API_BASE}/families/${familyId}`)
            .then(r => r.json())
            .then((data: FamilyInfo) => setFamilyInfo(data))
            .catch(() => { })
    }, [familyId])

    const handleAncestorMode = async () => {
        if (!selectedId) return
        try {
            const res = await apiFetch(`${API_BASE}/persons/${selectedId}/ancestors`)
            const data: GenealogyTree = await res.json()
            setTreeMode("ancestors")
            setTree(data)
        } catch (e) { console.error(e) }
    }

    const handleDescendantMode = async () => {
        if (!selectedId) return
        try {
            const res = await apiFetch(`${API_BASE}/persons/${selectedId}/descendants`)
            const data: GenealogyTree = await res.json()
            setTreeMode("descendants")
            setTree(data)
        } catch (e) { console.error(e) }
    }

    const handleShowChildren = async () => {
        if (!selectedId) return
        try {
            const res = await apiFetch(`${API_BASE}/persons/${selectedId}/children`)
            const data: { children: GenealogyPerson[] } = await res.json()
            const newKids = data.children.filter(c => !tree.persons.find(p => p.id === c.id))
            if (newKids.length === 0) return
            setTree(t => ({
                persons: [...t.persons, ...newKids],
                parent_child: [...t.parent_child, ...newKids.map(c => ({ parent_id: selectedId, child_id: c.id }))],
                spouses: t.spouses,
            }))
        } catch (e) { console.error(e) }
    }

    const handleSearch = (v: string) => {
        setSearch(v)
        if (!v.trim()) return
        const match = tree.persons.find(p =>
            `${p.first_name} ${p.last_name}`.toLowerCase().includes(v.toLowerCase())
        )
        if (match) setSelectedId(match.id)
    }

    const resetPersonForm = () => {
        setFirstName(""); setLastName(""); setGender("male")
        setBirthDate(""); setBiography(""); setPersonError("")
        setShowPersonForm(false)
    }
    const resetRelForm = () => {
        setPerson1Id(""); setPerson2Id(""); setRelationType(RELATION_TYPES[0])
        setRelError(""); setShowRelForm(false)
    }

    const handleCreatePerson = async () => {
        setPersonError("")
        try {
            await createPerson({ family_id: familyId, first_name: firstName, last_name: lastName, gender, birth_date: birthDate || undefined, biography: biography || undefined })
            resetPersonForm()
            loadFamilyTree(selectedId)
            getPersons(familyId).then(setPersons).catch(() => { })
        } catch { setPersonError("Failed to create person") }
    }

    const handleCreateRelationship = async () => {
        setRelError("")
        if (!person1Id || !person2Id) { setRelError("Select both persons"); return }
        if (person1Id === person2Id) { setRelError("Select two different persons"); return }
        try {
            await createRelationship({ person1_id: person1Id, person2_id: person2Id, relation_type: relationType })
            resetRelForm()
            loadFamilyTree(selectedId)
        } catch { setRelError("Failed to create relationship") }
    }

    // Compute kinship labels
    const selfId = getPersonId()
    const kinshipMap = computeKinship(
        tree.persons.map(p => ({ id: p.id, gender: p.gender })),
        tree.parent_child.map(r => ({ parentId: r.parent_id, childId: r.child_id })),
        tree.spouses.map(s => ({ person1Id: s.person1_id, person2Id: s.person2_id })),
        selfId,
    )

    function toCardData(p: GenealogyPerson): PersonCardData {
        return {
            id: p.id,
            firstName: p.first_name,
            lastName: p.last_name,
            gender: p.gender,
            birthDate: p.birth_date,
            deathDate: p.death_date,
            photoUrl: p.photo_url ? `${API_BASE}${p.photo_url}` : null,
            kinship: kinshipMap.get(p.id) ?? null,
        }
    }

    const selectedPerson = tree.persons.find(p => p.id === selectedId)
    const selectedName = selectedPerson
        ? [selectedPerson.first_name, selectedPerson.last_name].filter(Boolean).join(" ")
        : null
    const isAltMode = treeMode !== "family"
    const showForm = showPersonForm || showRelForm

    const inputCls = "border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white text-gray-900 outline-none focus:ring-2 focus:ring-green-300 w-full"

    const familyTitle = familyInfo ? `${familyInfo.name}` : "Family Tree"
    const memberCount = tree.persons.length

    return (
        <div className="flex flex-col" style={{ height: "100vh" }}>

            {/* ── Header ── */}
            <header
                className="flex items-center justify-between flex-shrink-0"
                style={{ padding: "20px 32px", background: "#FFFFFF", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", zIndex: 10 }}
            >
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1A1A2E", letterSpacing: -0.5, lineHeight: 1.2 }}>
                        {familyTitle}
                    </h1>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 4 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <Users size={13} color="#888" />
                            <span style={{ fontSize: 13, color: "#888" }}>{memberCount} members</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <GitBranch size={13} color="#888" />
                            <span style={{ fontSize: 13, color: "#888" }}>{generationCount || "—"} generations</span>
                        </div>
                    </div>
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {/* Search */}
                    {searchOpen ? (
                        <input
                            autoFocus
                            style={{ padding: "10px 14px", background: "#F5F5F5", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 500, color: "#333", outline: "none", width: 180 }}
                            placeholder="Search member…"
                            value={search}
                            onChange={e => handleSearch(e.target.value)}
                            onBlur={() => { if (!search) setSearchOpen(false) }}
                        />
                    ) : (
                        <button
                            onClick={() => setSearchOpen(true)}
                            style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", background: "#F5F5F5", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#555" }}
                        >
                            <Search size={15} /> Search
                        </button>
                    )}

                    {/* Bell */}
                    <button
                        style={{ width: 40, height: 40, borderRadius: 10, background: "#FFF8E1", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}
                    >
                        <Bell size={17} color="#FF9800" />
                        <div style={{ position: "absolute", top: 7, right: 7, width: 8, height: 8, borderRadius: "50%", background: "#FF5252", border: "1.5px solid white" }} />
                    </button>

                    {/* Add Member / Full Tree */}
                    {!isAltMode ? (
                        <button
                            onClick={() => { resetRelForm(); setShowPersonForm(v => !v) }}
                            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "linear-gradient(135deg, #4CAF50, #2E7D32)", color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(76,175,80,0.35)" }}
                        >
                            <Plus size={16} strokeWidth={2.5} /> Add Member
                        </button>
                    ) : (
                        <button
                            onClick={() => loadFamilyTree(selectedId)}
                            style={{ padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", background: treeMode === "descendants" ? "#d1fae5" : "#fef3c7", color: treeMode === "descendants" ? "#065f46" : "#92400e" }}
                        >
                            {t("tree_full_tree")}
                        </button>
                    )}
                </div>
            </header>

            {/* ── Selected person action bar ── */}
            {selectedId && selectedName && (
                <div className="border-b border-gray-100 bg-gray-50 px-4 py-2 flex-shrink-0">
                    <div className="flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                        <span className="text-xs font-semibold text-gray-800 shrink-0 max-w-[120px] truncate">
                            {selectedName}
                        </span>
                        <button
                            onClick={() => router.push(`/person/${selectedId}`)}
                            className="text-xs px-2.5 py-1 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors shrink-0"
                        >
                            {t("tree_profile")}
                        </button>
                        {!isAltMode && (
                            <>
                                <button onClick={handleAncestorMode} className="text-xs px-2.5 py-1 border border-amber-300 text-amber-700 rounded-lg font-medium hover:bg-amber-50 transition-colors shrink-0 whitespace-nowrap">
                                    {t("tree_ancestors")}
                                </button>
                                <button onClick={handleDescendantMode} className="text-xs px-2.5 py-1 border border-emerald-300 text-emerald-700 rounded-lg font-medium hover:bg-emerald-50 transition-colors shrink-0 whitespace-nowrap">
                                    {t("tree_descendants")}
                                </button>
                            </>
                        )}
                        <button onClick={handleShowChildren} className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition-colors shrink-0 whitespace-nowrap">
                            {t("tree_children")}
                        </button>
                        <button
                            onClick={() => { resetPersonForm(); setShowRelForm(v => !v) }}
                            className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition-colors shrink-0 whitespace-nowrap"
                        >
                            {t("tree_add_relation")}
                        </button>
                        <button onClick={() => { setSelectedId(null); setSearch("") }} className="text-gray-400 hover:text-gray-600 ml-auto shrink-0 p-1">✕</button>
                    </div>
                </div>
            )}

            {/* ── Tree canvas ── */}
            <div className="flex-1 overflow-hidden">
                <FamilyTree
                    persons={tree.persons.map(toCardData)}
                    parentChild={tree.parent_child.map(r => ({ parentId: r.parent_id, childId: r.child_id }))}
                    spouses={tree.spouses.map(s => ({ person1Id: s.person1_id, person2Id: s.person2_id }))}
                    selectedId={selectedId}
                    onSelect={id => { setSelectedId(id || null); if (!id) setSearch("") }}
                    onOpen={id => router.push(`/person/${id}`)}
                />
            </div>

            {/* ── Bottom stats bar ── */}
            <div
                className="flex-shrink-0"
                style={{ padding: "14px 32px", background: "#FFFFFF", borderTop: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 32 }}
            >
                {[
                    { label: "Total Members", value: memberCount, emoji: "👥" },
                    { label: "Generations", value: generationCount || "—", emoji: "🌳" },
                    { label: "Memories", value: 0, emoji: "📸" },
                    { label: "Reminders", value: 0, emoji: "🔔" },
                ].map(stat => (
                    <div key={stat.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: "#F0F8F1", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontSize: 18 }}>{stat.emoji}</span>
                        </div>
                        <div>
                            <p style={{ fontSize: 18, fontWeight: 800, color: "#1A1A2E", lineHeight: 1 }}>{stat.value}</p>
                            <p style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{stat.label}</p>
                        </div>
                    </div>
                ))}

                <div style={{ marginLeft: "auto" }}>
                    <button
                        onClick={() => router.push("/families")}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "#E8F5E9", color: "#2E7D32", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                    >
                        <Plus size={15} /> Invite Relatives
                    </button>
                </div>
            </div>

            {/* ── Form modal ── */}
            {showForm && (
                <div
                    className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/20 backdrop-blur-sm"
                    onClick={e => { if (e.target === e.currentTarget) { resetPersonForm(); resetRelForm() } }}
                >
                    <div className="w-full sm:w-96 bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 max-h-[85vh] overflow-y-auto">
                        {showPersonForm && (
                            <>
                                <h3 className="font-bold text-gray-900 text-base mb-4">{t("tree_add_person_title")}</h3>
                                <div className="flex flex-col gap-3">
                                    <input className={inputCls} placeholder={t("tree_first_name")} value={firstName} onChange={e => setFirstName(e.target.value)} />
                                    <input className={inputCls} placeholder={t("tree_last_name")} value={lastName} onChange={e => setLastName(e.target.value)} />
                                    <select className={inputCls} value={gender} onChange={e => setGender(e.target.value)}>
                                        <option value="male">{t("male")}</option>
                                        <option value="female">{t("female")}</option>
                                    </select>
                                    <input className={inputCls} type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} />
                                    <textarea className={`${inputCls} resize-none`} placeholder={t("tree_biography")} rows={3} value={biography} onChange={e => setBiography(e.target.value)} />
                                    {personError && <p className="text-red-500 text-xs">{personError}</p>}
                                    <div className="flex gap-2 pt-1">
                                        <button onClick={handleCreatePerson} className="flex-1 py-3 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors">{t("save")}</button>
                                        <button onClick={resetPersonForm} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">{t("cancel")}</button>
                                    </div>
                                </div>
                            </>
                        )}

                        {showRelForm && (
                            <>
                                <h3 className="font-bold text-gray-900 text-base mb-4">{t("tree_add_rel_title")}</h3>
                                {persons.length < 2 ? (
                                    <p className="text-sm text-gray-500">{t("tree_need_two")}</p>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        <select className={inputCls} value={person1Id} onChange={e => setPerson1Id(e.target.value)}>
                                            <option value="">{t("tree_person_a")}</option>
                                            {persons.map(p => <option key={p.id} value={p.id}>{[p.first_name, p.last_name].filter(Boolean).join(" ")}</option>)}
                                        </select>
                                        <select className={inputCls} value={relationType} onChange={e => setRelationType(e.target.value)}>
                                            {RELATION_TYPES.map(rt => <option key={rt} value={rt}>{rt}</option>)}
                                        </select>
                                        <select className={inputCls} value={person2Id} onChange={e => setPerson2Id(e.target.value)}>
                                            <option value="">{t("tree_person_b")}</option>
                                            {persons.map(p => <option key={p.id} value={p.id}>{[p.first_name, p.last_name].filter(Boolean).join(" ")}</option>)}
                                        </select>
                                        {relError && <p className="text-red-500 text-xs">{relError}</p>}
                                        <div className="flex gap-2 pt-1">
                                            <button onClick={handleCreateRelationship} className="flex-1 py-3 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors">{t("tree_connect")}</button>
                                            <button onClick={resetRelForm} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">{t("cancel")}</button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
