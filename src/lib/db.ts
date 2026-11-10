// Local data layer (IndexedDB). Tables mirror supabase/schema.sql so the store
// can be swapped for a hosted database without touching the UI.

export type Role = 'creator' | 'advertiser'
export type PlatformKey = 'youtube' | 'tiktok' | 'facebook' | 'x' | 'instagram' | 'twitch' | 'kick' | 'rumble' | 'other'
export type LengthKey = '30s' | '1m' | '3m' | '5m' | '10m' | '30m'
export type AdType = 'image' | 'text' | 'combo' | 'mention' | 'segment' | 'link'
export type Position = 'intro' | 'mid' | 'outro'
export type PayTerms = 'delivery' | 'split' | 'upfront'
export type ZoneKey = 'tl' | 'tr' | 'bl' | 'br' | 'bottom' | 'top'

export interface Channel { platform: PlatformKey; url: string; handle: string; followers: number; avgViews: number; code: string; verified: boolean }

export interface User {
  id: string; email?: string; passHash?: string; salt?: string
  role: Role; name: string; handle: string; bio: string; category: string; language: string; country: string
  avatarId?: string; bannerId?: string; channels: Channel[]; website?: string
  wallets: { evm?: string; sol?: string }
  listed: boolean; company?: string; saved: string[]; savedSlots: string[]; createdAt: number
  sample?: boolean // fictional sample profile (src/data/samples.ts), not bookable
}

// A creator's offer: "I will make a <length> video about <tags> on <platforms>, ad space costs X $LIP"
export interface SlotFormat { type: AdType; price: number }
export interface Slot {
  id: string; creatorId: string; title: string; description: string
  platforms: PlatformKey[]; length: LengthKey; orientation: 'landscape' | 'portrait'
  category: string; tags: string[]; language: string
  formats: SlotFormat[]; positions: Position[]; zones: ZoneKey[]
  spots: number; exclusive: boolean; publishBy: string; payTerms: PayTerms; blocked: string[]
  sampleVideoId?: string; status: 'open' | 'paused' | 'closed'; views: number; createdAt: number; updatedAt: number
  sample?: boolean
}

export type BookingStatus = 'requested' | 'countered' | 'accepted' | 'delivered' | 'revision' | 'completed' | 'declined' | 'cancelled' | 'disputed'
export interface OverlayStyle { color: string; bg: string; size: number; weight: number; radius: number; opacity: number }
export interface Delivery { platform: PlatformKey; url: string; adAt: string; views?: number; note?: string; at: number }
export interface Review { rating: number; text: string; at: number }
export interface Booking {
  id: string; slotId: string; creatorId: string; advertiserId: string; campaignId: string
  type: AdType; position: Position; adCategory: string
  imageId?: string; text?: string; link?: string; script?: string
  style: OverlayStyle; x: number; y: number; w: number; h: number; showFor: number
  offer: number; counter?: number; status: BookingStatus; due: string
  deliveries: Delivery[]; messages: { by: string; text: string; at: number }[]
  history: { at: number; by: string; action: string; note?: string }[]
  reviews: { adv?: Review; creator?: Review }
  extension?: { date: string; note: string; by: string }
  dispute?: { by: string; reason: string; at: number }
  cancelBy?: string
  createdAt: number; updatedAt: number
}

// Portfolio: uploaded sample videos or links to published videos
export interface Video {
  id: string; creatorId: string; title: string; description: string; category: string
  platform?: PlatformKey; url?: string; blobId?: string; thumbId?: string
  duration: number; width: number; height: number; views: number; likes: number; createdAt: number
}
export interface Campaign {
  id: string; advertiserId: string; name: string; brand: string; objective: string
  budget: number; status: 'draft' | 'active' | 'completed'; createdAt: number
}
export interface Contract { id: string; bookingId: string; creatorId: string; advertiserId: string; amount: number; terms: string; createdAt: number }
export interface Txn {
  id: string; bookingId: string; kind: 'upfront' | 'final' | 'full'; from: string; to: string; amount: number
  network: string; txHash: string; status: 'confirmed' | 'submitted'; createdAt: number
}
export interface CollabRequest {
  id: string; advertiserId: string; creatorId: string; brief: string; budget: number; deadline?: string
  quote?: number; reply?: string; status: 'open' | 'quoted' | 'accepted' | 'declined'; createdAt: number; updatedAt: number
}
export interface BlobRec { id: string; blob: Blob; type: string }

type Tables = {
  users: User; slots: Slot; bookings: Booking; videos: Video; campaigns: Campaign
  contracts: Contract; transactions: Txn; requests: CollabRequest; blobs: BlobRec
}
export type Table = keyof Tables
const TABLES: Table[] = ['users', 'slots', 'bookings', 'videos', 'campaigns', 'contracts', 'transactions', 'requests', 'blobs']

let dbp: Promise<IDBDatabase> | null = null
function open() {
  return (dbp ??= new Promise((res, rej) => {
    const r = indexedDB.open('youlip', 1)
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
