import { CSSProperties, useEffect, useMemo } from 'react'
import { useBlobUrl } from '../lib/hooks'
import type { Placement, User, Video } from '../lib/db'
import { AD_TYPES, dur, fmt, tok } from '../lib/constants'
import { Icon, I } from './ui'

const hue = (s: string) => [...s].reduce((a, c) => a + c.charCodeAt(0), 0) % 360

export function Avatar({ u, size = 40 }: { u?: Pick<User, 'name' | 'avatarId' | 'id'> | null; size?: number }) {
  const url = useBlobUrl(u?.avatarId)
  const h = hue(u?.id || 'x')
  const st: CSSProperties = { width: size, height: size, fontSize: size * 0.4, background: url ? undefined : `linear-gradient(135deg,hsl(${h} 70% 62%),hsl(${(h + 60) % 360} 70% 45%))` }
  return <span className="avatar" style={st}>{url ? <img src={url} alt="" /> : (u?.name || '?').slice(0, 1).toUpperCase()}</span>
}

export function Thumb({ v, children }: { v: Video; children?: React.ReactNode }) {
  const url = useBlobUrl(v.thumbId)
  return (
    <div className="thumb">
      {url ? <img src={url} alt="" loading="lazy" /> : <div className="thumb-ph" />}
      <span className="dur">{dur(v.duration)}</span>
      {children}
    </div>
  )
}

export const minPrice = (v: Video, c?: User) => {
  const p = { ...(c?.pricing || {}), ...(v.price || {}) } as Record<string, number>
  const vals = v.formats.map((f) => p[f]).filter((x) => x > 0)
  return vals.length ? Math.min(...vals) : 0
}

export function VideoCard({ v, c, ads = true }: { v: Video; c?: User; ads?: boolean }) {
  const price = minPrice(v, c)
  return (
    <article className="vcard glass">
      <a href={`#/video/${v.id}`}><Thumb v={v}>{v.adEnabled && <span className="ad-ok"><Icon d={I.bolt} size={12} />Ad-ready</span>}</Thumb></a>
      <div className="vcard-b">
        <a href={`#/video/${v.id}`} className="vtitle">{v.title}</a>
        {c && <a href={`#/creator/${c.id}`} className="vby"><Avatar u={c} size={20} />{c.name}</a>}
        <div className="vmeta"><span><Icon d={I.eye} size={13} />{fmt(v.views)}</span><span><Icon d={I.heart} size={13} />{fmt(v.likes)}</span><span>{v.category}</span></div>
        {ads && v.adEnabled && <>
          <div className="formats">{AD_TYPES.filter((a) => v.formats.includes(a.key)).map((a) => <span key={a.key}>{a.label.replace(' Placement', '')}</span>)}</div>
          <div className="vcard-f">
            <span className="price">{price ? <>from <b>{tok(price)}</b></> : <span className="muted">Open to offers</span>}</span>
            <a className="btn sm" href={`#/editor/${v.id}`}>Request Ad</a>
          </div>
        </>}
      </div>
    </article>
  )
}

export function CreatorCard({ c, videos }: { c: User; videos: Video[] }) {
  const mine = videos.filter((v) => v.creatorId === c.id)
  const avg = mine.length ? mine.reduce((s, v) => s + v.views, 0) / mine.length : 0
  const from = Math.min(...[c.pricing.image, c.pricing.text, c.pricing.combo].filter((x) => x > 0), Infinity)
  return (
    <a className="ccard glass" href={`#/creator/${c.id}`}>
      <div className="ccard-h"><Avatar u={c} size={52} /><div><b>{c.name}</b><span className="muted small">@{c.handle}</span></div><span className="cat">{c.category}</span></div>
      <p className="muted small clamp2">{c.bio || 'No bio yet.'}</p>
      <div className="ccard-s">
        <div><b>{fmt(c.followers)}</b><span>Followers</span></div>
        <div><b>{fmt(avg)}</b><span>Avg views</span></div>
        <div><b>{mine.length}</b><span>Videos</span></div>
      </div>
      <div className="ccard-f">
        <Socials s={c.socials} />
        <span className="price">{Number.isFinite(from) ? <>from <b>{tok(from)}</b></> : <span className="muted">Open to offers</span>}</span>
      </div>
    </a>
  )
}

const SOC: [keyof User['socials'], string][] = [['x', 'X'], ['youtube', 'YouTube'], ['tiktok', 'TikTok'], ['instagram', 'Instagram'], ['website', 'Web']]
export function Socials({ s }: { s: User['socials'] }) {
  const list = SOC.filter(([k]) => s[k])
  if (!list.length) return <span />
  return <span className="socials">{list.map(([k, l]) => <span key={k} className="soc" onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(s[k]!.startsWith('http') ? s[k] : `https://${s[k]}`, '_blank', 'noopener') }}>{l}</span>)}</span>
}

// HTML overlay identical in layout to drawPlacement() in lib/media.ts
export function AdOverlay({ p, imageUrl, visible = true, selected, onPointerDown, onResize }: {
  p: Pick<Placement, 'type' | 'text' | 'style' | 'x' | 'y' | 'w' | 'h'>; imageUrl?: string; visible?: boolean; selected?: boolean
  onPointerDown?: (e: React.PointerEvent) => void; onResize?: (e: React.PointerEvent) => void
}) {
  const s = p.style
  const st: CSSProperties = {
    left: `${p.x}%`, top: `${p.y}%`, width: `${p.w}%`, height: `${p.h}%`, opacity: visible ? s.opacity : 0,
    background: p.type === 'image' ? 'transparent' : s.bg, borderRadius: `${(s.radius / 640) * 100}cqw`,
    padding: p.type === 'image' ? 0 : `${(8 / 640) * 100}cqw`, color: s.color, fontWeight: s.weight, fontSize: `${(s.size / 640) * 100}cqw`,
  }
  return (
    <div className={`ad-ov t-${p.type}${selected ? ' sel' : ''}${onPointerDown ? ' drag' : ''}`} style={st} onPointerDown={onPointerDown}>
      {p.type !== 'text' && (imageUrl ? <img src={imageUrl} alt="" draggable={false} /> : <span className="ph">Logo</span>)}
      {p.type !== 'image' && <span className="txt">{p.text || 'Your message'}</span>}
      {onResize && <i className="handle" onPointerDown={(e) => { e.stopPropagation(); onResize(e) }} />}
    </div>
  )
}

export function useObjectUrl(b?: Blob | null) {
  const u = useMemo(() => (b ? URL.createObjectURL(b) : ''), [b])
  useEffect(() => () => { u && URL.revokeObjectURL(u) }, [u])
  return u
}
