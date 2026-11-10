import type { AdType, Booking, LengthKey, PayTerms, PlatformKey, Position, Slot, User, ZoneKey } from './db'
import cfg from '../config/config.json'

export const SYMBOL = '$' + cfg.symbol

export const CATEGORIES = ['Gaming', 'Tech', 'Crypto', 'Finance', 'Education', 'Beauty', 'Fashion', 'Fitness', 'Food', 'Travel', 'Music', 'Comedy', 'Lifestyle', 'Sports', 'Kids & Family', 'News', 'Other']
export const LANGUAGES = ['English', 'Vietnamese', 'Spanish', 'Portuguese', 'Indonesian', 'Thai', 'Filipino', 'Hindi', 'Japanese', 'Korean', 'Chinese', 'French', 'German', 'Russian', 'Turkish', 'Arabic', 'Other']

// Platform badges: brand color + short monogram (no third-party logos)
export const PLATFORMS: Record<PlatformKey, { name: string; short: string; color: string; vertical: boolean; base: string }> = {
  youtube: { name: 'YouTube', short: 'YT', color: '#FF3B3B', vertical: false, base: 'https://youtube.com/@' },
  tiktok: { name: 'TikTok', short: 'TT', color: '#25F4EE', vertical: true, base: 'https://tiktok.com/@' },
  facebook: { name: 'Facebook', short: 'FB', color: '#3B82F6', vertical: false, base: 'https://facebook.com/' },
  x: { name: 'X', short: 'X', color: '#E7E9EA', vertical: false, base: 'https://x.com/' },
  instagram: { name: 'Instagram', short: 'IG', color: '#E1306C', vertical: true, base: 'https://instagram.com/' },
  twitch: { name: 'Twitch', short: 'TW', color: '#A970FF', vertical: false, base: 'https://twitch.tv/' },
  kick: { name: 'Kick', short: 'K', color: '#53FC18', vertical: false, base: 'https://kick.com/' },
  rumble: { name: 'Rumble', short: 'RU', color: '#85C742', vertical: false, base: 'https://rumble.com/c/' },
  other: { name: 'Other', short: '•••', color: '#9B9DBA', vertical: false, base: '' },
}
export const PLATFORM_KEYS = Object.keys(PLATFORMS) as PlatformKey[]

export const LENGTHS: { key: LengthKey; label: string; sec: number }[] = [
  { key: '30s', label: '30 sec', sec: 30 }, { key: '1m', label: '1 min', sec: 60 }, { key: '3m', label: '3 min', sec: 180 },
  { key: '5m', label: '5 min', sec: 300 }, { key: '10m', label: '10 min', sec: 600 }, { key: '30m', label: '30 min', sec: 1800 },
]
export const lengthOf = (k: LengthKey) => LENGTHS.find((l) => l.key === k)!

export const AD_TYPES: { key: AdType; label: string; desc: string; overlay: boolean }[] = [
  { key: 'image', label: 'Logo / image overlay', desc: 'Your logo or product image on screen', overlay: true },
  { key: 'text', label: 'Text overlay', desc: 'Your message as an on-screen caption', overlay: true },
  { key: 'combo', label: 'Image + text overlay', desc: 'Logo and message in one card', overlay: true },
  { key: 'mention', label: 'Verbal mention', desc: 'The creator says your message on camera', overlay: false },
  { key: 'segment', label: 'Sponsored segment', desc: 'A dedicated part of the video about your brand', overlay: false },
  { key: 'link', label: 'Link in description', desc: 'Your link pinned in the description / comments', overlay: false },
]
export const typeOf = (t: AdType) => AD_TYPES.find((a) => a.key === t)!
export const typeLabel = (t: AdType) => typeOf(t)?.label ?? t

export const POSITIONS: { key: Position; label: string }[] = [{ key: 'intro', label: 'Intro (start)' }, { key: 'mid', label: 'Mid-roll' }, { key: 'outro', label: 'Outro (end)' }]
export const posLabel = (p: Position) => POSITIONS.find((x) => x.key === p)?.label ?? p

export const PAY_TERMS: { key: PayTerms; label: string; desc: string }[] = [
  { key: 'delivery', label: 'Pay on delivery', desc: '100% after the advertiser approves the published video' },
  { key: 'split', label: '50 / 50', desc: '50% after acceptance, 50% after approval' },
  { key: 'upfront', label: 'Pay upfront', desc: '100% after the creator accepts the booking' },
]
export const termLabel = (k: PayTerms) => PAY_TERMS.find((x) => x.key === k)?.label ?? k

// Ad categories a creator may refuse
export const AD_CATEGORIES = ['Crypto / Web3', 'Gaming', 'Apps & Software', 'Finance', 'E-commerce', 'Beauty & Fashion', 'Food & Drink', 'Education', 'Health & Fitness', 'Travel', 'Entertainment', 'Gambling / Betting', 'Alcohol', 'Politics', 'Dating', 'Other']

export const TAG_SUGGESTIONS = ['review', 'tutorial', 'unboxing', 'vlog', 'gameplay', 'news', 'memecoin', 'defi', 'nft', 'airdrop', 'ai', 'trading', 'podcast', 'shorts', 'challenge', 'reaction', 'how-to', 'giveaway', 'live', 'comedy']

export const ZONES: Record<ZoneKey, { label: string; x: number; y: number; w: number; h: number }> = {
  tl: { label: 'Top left', x: 0, y: 0, w: 50, h: 40 },
  tr: { label: 'Top right', x: 50, y: 0, w: 50, h: 40 },
  top: { label: 'Top banner', x: 0, y: 0, w: 100, h: 22 },
  bl: { label: 'Bottom left', x: 0, y: 60, w: 50, h: 40 },
  br: { label: 'Bottom right', x: 50, y: 60, w: 50, h: 40 },
  bottom: { label: 'Bottom banner', x: 0, y: 75, w: 100, h: 25 },
}
export const ZONE_KEYS = Object.keys(ZONES) as ZoneKey[]

export const TIERS = [
  { key: 'nano', label: 'Nano', min: 0 }, { key: 'micro', label: 'Micro', min: 10_000 }, { key: 'mid', label: 'Mid-tier', min: 100_000 },
  { key: 'macro', label: 'Macro', min: 500_000 }, { key: 'mega', label: 'Mega', min: 1_000_000 },
]

// ── derived helpers ─────────────────────────────────────────
export const followersOf = (u: Pick<User, 'channels'>) => u.channels.reduce((s, c) => s + (c.followers || 0), 0)
export const avgViewsOf = (u: Pick<User, 'channels'>) => { const c = u.channels.filter((x) => x.avgViews); return c.length ? c.reduce((s, x) => s + x.avgViews, 0) / c.length : 0 }
export const tierOf = (u: Pick<User, 'channels'>) => { const f = followersOf(u); return [...TIERS].reverse().find((t) => f >= t.min)! }
export const minPrice = (s: Slot) => Math.min(...s.formats.map((f) => f.price).filter((p) => p > 0), Infinity)
export const ACTIVE: Booking['status'][] = ['accepted', 'delivered', 'revision', 'completed', 'disputed']
export const spotsTaken = (s: Slot, bookings: Booking[]) => bookings.filter((b) => b.slotId === s.id && ACTIVE.includes(b.status)).length
export const spotsLeft = (s: Slot, bookings: Booking[]) => Math.max(0, (s.exclusive ? 1 : s.spots) - spotsTaken(s, bookings))
export const isLive = (s: Slot, bookings: Booking[]) => s.status === 'open' && spotsLeft(s, bookings) > 0 && (!s.publishBy || s.publishBy >= today())
export const ratingOf = (creatorId: string, bookings: Booking[]) => {
  const r = bookings.filter((b) => b.creatorId === creatorId && b.reviews.adv).map((b) => b.reviews.adv!.rating)
  return { avg: r.length ? r.reduce((a, b) => a + b, 0) / r.length : 0, count: r.length }
}
export const dealsDone = (userId: string, bookings: Booking[]) => bookings.filter((b) => (b.creatorId === userId || b.advertiserId === userId) && b.status === 'completed').length
export const priceOf = (b: Booking) => b.counter ?? b.offer
export const overdue = (b: Booking) => ['accepted', 'revision'].includes(b.status) && !!b.due && b.due < today()

export const today = () => new Date().toISOString().slice(0, 10)
export const addDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10)
export const fmt = (n: number, d = 0) => Intl.NumberFormat('en', { notation: n >= 10000 ? 'compact' : 'standard', maximumFractionDigits: n >= 10000 ? 1 : d }).format(n || 0)
export const tok = (n?: number) => `${fmt(n || 0, 2)} ${SYMBOL}`
export const dur = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
export const ago = (t: number) => {
  const s = (Date.now() - t) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return new Date(t).toLocaleDateString('en', { month: 'short', day: 'numeric' })
}
export const dateLabel = (d: string) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
export const short = (a?: string) => (a ? `${a.slice(0, 4)}…${a.slice(-4)}` : '')
export const normTag = (t: string) => t.trim().toLowerCase().replace(/^#/, '').replace(/[^a-z0-9\-_ ]/g, '').replace(/\s+/g, '-').slice(0, 24)
