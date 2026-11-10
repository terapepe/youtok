import type { AdType, Pricing, ZoneKey } from './db'
import cfg from '../config/config.json'

export const SYMBOL = '$' + cfg.symbol

export const CATEGORIES = ['Gaming', 'Tech', 'Beauty', 'Fitness', 'Food', 'Travel', 'Music', 'Education', 'Finance', 'Crypto', 'Comedy', 'Lifestyle', 'Fashion', 'Sports', 'Other']

export const AD_TYPES: { key: AdType; label: string; desc: string }[] = [
  { key: 'image', label: 'Image Placement', desc: 'Logo or product image inside the video' },
  { key: 'text', label: 'Text Placement', desc: 'Promotional message as an on-screen caption' },
  { key: 'combo', label: 'Image + Text', desc: 'Visual and message combined in one card' },
]
export const typeLabel = (t: AdType) => AD_TYPES.find((a) => a.key === t)?.label ?? t

// Ad zones in % of the frame (x, y, w, h). Creators choose which zones they allow.
export const ZONES: Record<ZoneKey, { label: string; x: number; y: number; w: number; h: number }> = {
  tl: { label: 'Top left', x: 0, y: 0, w: 50, h: 40 },
  tr: { label: 'Top right', x: 50, y: 0, w: 50, h: 40 },
  top: { label: 'Top banner', x: 0, y: 0, w: 100, h: 22 },
  bl: { label: 'Bottom left', x: 0, y: 60, w: 50, h: 40 },
  br: { label: 'Bottom right', x: 50, y: 60, w: 50, h: 40 },
  bottom: { label: 'Bottom banner', x: 0, y: 75, w: 100, h: 25 },
}
export const ZONE_KEYS = Object.keys(ZONES) as ZoneKey[]

export const DEFAULT_PRICING: Pricing = { image: 0, text: 0, combo: 0 }

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
export const short = (a?: string) => (a ? `${a.slice(0, 4)}…${a.slice(-4)}` : '')
