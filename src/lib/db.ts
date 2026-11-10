// Local data layer (IndexedDB). Every table mirrors supabase/schema.sql so the
// store can later be swapped for a hosted database without touching the UI.

export type Role = 'creator' | 'advertiser'
export type AdType = 'image' | 'text' | 'combo'
export type ZoneKey = 'tl' | 'tr' | 'bl' | 'br' | 'bottom' | 'top'

export interface Pricing { image: number; text: number; combo: number }
export interface Socials { x?: string; youtube?: string; tiktok?: string; instagram?: string; website?: string }

export interface User {
  id: string; email?: string; passHash?: string; salt?: string
  role: Role; name: string; handle: string; bio: string; category: string
  avatarId?: string; socials: Socials; followers: number
  wallets: { evm?: string; sol?: string }
  pricing: Pricing; zones: ZoneKey[]; acceptsAds: boolean
  company?: string; saved: string[]; createdAt: number
}
export interface Video {
  id: string; creatorId: string; title: string; description: string; category: string
  blobId: string; thumbId?: string; duration: number; width: number; height: number
  adEnabled: boolean; formats: AdType[]; price?: Partial<Pricing>; zones?: ZoneKey[]
  views: number; likes: number; createdAt: number
}
export interface Campaign {
  id: string; advertiserId: string; name: string; brand: string; objective: string
  budget: number; status: 'draft' | 'active' | 'completed'; createdAt: number
}
export type PlacementStatus = 'pending' | 'quoted' | 'approved' | 'rejected' | 'published' | 'paid' | 'cancelled'
export interface OverlayStyle { color: string; bg: string; size: number; weight: number; radius: number; opacity: number }
export interface Placement {
  id: string; campaignId: string; videoId: string; creatorId: string; advertiserId: string
  type: AdType; imageId?: string; text?: string; style: OverlayStyle
  x: number; y: number; w: number; h: number; start: number; end: number
  offer: number; quote?: number; note?: string; status: PlacementStatus
  publishedId?: string; impressions: number; adViews: number; clicks: number; link?: string
  history: { at: number; by: string; action: string; note?: string }[]
  createdAt: number; updatedAt: number
}
export interface Contract { id: string; placementId: string; creatorId: string; advertiserId: string; amount: number; terms: string; createdAt: number }
export interface Txn {
  id: string; placementId: string; from: string; to: string; amount: number
  network: string; txHash: string; status: 'confirmed' | 'submitted'; createdAt: number
}
export interface CollabRequest {
  id: string; advertiserId: string; creatorId: string; brief: string; budget: number; deadline?: string
  quote?: number; reply?: string; status: 'open' | 'quoted' | 'accepted' | 'declined'; createdAt: number; updatedAt: number
}
export interface BlobRec { id: string; blob: Blob; type: string }

type Tables = {
  users: User; videos: Video; campaigns: Campaign; placements: Placement
  contracts: Contract; transactions: Txn; requests: CollabRequest; blobs: BlobRec
}
export type Table = keyof Tables
const TABLES: Table[] = ['users', 'videos', 'campaigns', 'placements', 'contracts', 'transactions', 'requests', 'blobs']

let dbp: Promise<IDBDatabase> | null = null
function open() {
  return (dbp ??= new Promise((res, rej) => {
    const r = indexedDB.open('youtok', 1)
    r.onupgradeneeded = () => TABLES.forEach((t) => r.result.objectStoreNames.contains(t) || r.result.createObjectStore(t, { keyPath: 'id' }))
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  }))
}
const req = <T,>(r: IDBRequest<T>) => new Promise<T>((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) })

const listeners = new Set<() => void>()
export const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn) } }
const emit = () => listeners.forEach((f) => f())

export const uid = () => crypto.randomUUID().replace(/-/g, '').slice(0, 16)

export const db = {
  async all<T extends Table>(t: T): Promise<Tables[T][]> {
    const d = await open()
    return req(d.transaction(t).objectStore(t).getAll()) as Promise<Tables[T][]>
  },
  async get<T extends Table>(t: T, id?: string): Promise<Tables[T] | undefined> {
    if (!id) return undefined
    const d = await open()
    return req(d.transaction(t).objectStore(t).get(id)) as Promise<Tables[T] | undefined>
  },
  async put<T extends Table>(t: T, v: Tables[T]) {
    const d = await open()
    await req(d.transaction(t, 'readwrite').objectStore(t).put(v))
    if (t !== 'blobs') emit()
    return v
  },
  async patch<T extends Table>(t: T, id: string, p: Partial<Tables[T]>) {
    const cur = await db.get(t, id)
    if (!cur) throw new Error(`${t}/${id} not found`)
    return db.put(t, { ...cur, ...p })
  },
  async del(t: Table, id: string) {
    const d = await open()
    await req(d.transaction(t, 'readwrite').objectStore(t).delete(id))
    emit()
  },
  async putBlob(blob: Blob) {
    const id = uid()
    await db.put('blobs', { id, blob, type: blob.type })
    return id
  },
}

// Object URLs for stored blobs (cached per id)
const urls = new Map<string, string>()
export async function blobUrl(id?: string) {
  if (!id) return ''
  if (urls.has(id)) return urls.get(id)!
  const b = await db.get('blobs', id)
  if (!b) return ''
  const u = URL.createObjectURL(b.blob)
  urls.set(id, u)
  return u
}

export async function sha256(s: string) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
