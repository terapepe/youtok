import { CSSProperties, ReactNode, useEffect, useMemo } from 'react'
import { useBlobUrl, Market } from '../lib/hooks'
import { useAuth } from '../lib/auth'
import { db, Booking, PlatformKey, Slot, User, Video } from '../lib/db'
import {
  avgViewsOf, dateLabel, dealsDone, dur, fmt, followersOf, isLive, lengthOf, minPrice, PLATFORMS, ratingOf, spotsLeft, tierOf, tok, typeLabel,
} from '../lib/constants'
import { Icon, I } from './ui'
import { PlatformIcon, TierGem } from './Art'

const hue = (s: string) => [...s].reduce((a, c) => a + c.charCodeAt(0), 0) % 360

export function Avatar({ u, size = 40 }: { u?: Pick<User, 'name' | 'avatarId' | 'id'> | null; size?: number }) {
  const url = useBlobUrl(u?.avatarId)
  const h = hue(u?.id || 'x')
  const st: CSSProperties = { width: size, height: size, fontSize: size * 0.4, background: url ? undefined : `linear-gradient(135deg,hsl(${h} 70% 62%),hsl(${(h + 60) % 360} 70% 45%))` }
  return <span className="avatar" style={st}>{url ? <img src={url} alt="" /> : (u?.name || '?').slice(0, 1).toUpperCase()}</span>
}

export function Banner({ u, children }: { u: User; children?: ReactNode }) {
  const url = useBlobUrl(u.bannerId), h = hue(u.id)
  return <div className="banner" style={{ backgroundImage: url ? `url(${url})` : `radial-gradient(600px 200px at 20% 0, hsl(${h} 70% 45% / .55), transparent), radial-gradient(500px 200px at 90% 100%, hsl(${(h + 80) % 360} 70% 45% / .4), transparent)` }}>{children}</div>
}

export const PlatformBadge = ({ p, size = 22 }: { p: PlatformKey; size?: number }) => <PlatformIcon p={p} size={size} />
export const PlatformStack = ({ list, size = 20 }: { list: PlatformKey[]; size?: number }) => (
  <span className="pf-stack">{[...new Set(list)].map((p) => <PlatformBadge key={p} p={p} size={size} />)}</span>
)

export function Stars({ value, count, small }: { value: number; count?: number; small?: boolean }) {
  if (!count) return <span className={`stars none${small ? ' sm' : ''}`}>New</span>
  return <span className={`stars${small ? ' sm' : ''}`}><Icon d={I.star} size={small ? 12 : 14} />{value.toFixed(1)}<em>({count})</em></span>
}

export const TierBadge = ({ u }: { u: Pick<User, 'channels'> }) => { const t = tierOf(u); return <span className={`tier t-${t.key}`}><TierGem level={['nano', 'micro', 'mid', 'macro', 'mega'].indexOf(t.key)} />{t.label}</span> }

function SaveBtn({ kind, id }: { kind: 'creator' | 'slot'; id: string }) {
  const { user, update } = useAuth()
  const list = kind === 'creator' ? user?.saved || [] : user?.savedSlots || []
  const on = list.includes(id)
  return (
    <button className={`save${on ? ' on' : ''}`} title={on ? 'Saved' : 'Save'} onClick={(e) => {
      e.preventDefault(); e.stopPropagation()
      if (!user) return (location.hash = '#/auth?role=advertiser')
      const next = on ? list.filter((x) => x !== id) : [...list, id]
      update(kind === 'creator' ? { saved: next } : { savedSlots: next })
    }}><Icon d={I.bookmark} size={15} /></button>
  )
}

export function CreatorCard({ c, m, list }: { c: User; m: Market; list?: boolean }) {
  const open = m.slots.filter((s) => s.creatorId === c.id && isLive(s, m.bookings))
  const from = Math.min(...open.map(minPrice))
  const r = ratingOf(c.id, m.bookings)
  const tags = [...new Set(open.flatMap((s) => s.tags))].slice(0, 4)
  return (
    <a className={`ccard glass${list ? ' list' : ''}`} href={`#/creator/${c.id}`}>
      {!list && <Banner u={c} />}
      <div className="ccard-h">
        <Avatar u={c} size={list ? 52 : 60} />
        <div className="grow"><b className="clamp1">{c.name}{c.channels.some((x) => x.verified) && <Icon d={I.check} size={14} />}</b><span className="muted small">{c.sample && <span className="sample first">Sample</span>}@{c.handle} · {c.category}</span></div>
        <SaveBtn kind="creator" id={c.id} />
      </div>
      {!list && <p className="muted small clamp2">{c.bio || 'No bio yet.'}</p>}
      <div className="ccard-pf">{c.channels.length ? c.channels.slice(0, 5).map((ch, i) => <span key={i}><PlatformBadge p={ch.platform} size={20} />{fmt(ch.followers)}</span>) : <span className="muted small">No channels linked</span>}</div>
      <div className="ccard-s">
        <div><b>{fmt(followersOf(c))}</b><span>Followers</span></div>
        <div><b>{fmt(avgViewsOf(c))}</b><span>Avg views</span></div>
        <div><b>{dealsDone(c.id, m.bookings)}</b><span>Deals</span></div>
        <div><b>{open.length}</b><span>Open slots</span></div>
      </div>
      {tags.length > 0 && <div className="tags">{tags.map((t) => <span key={t}>#{t}</span>)}</div>}
      <div className="ccard-f">
        <span className="row-g"><TierBadge u={c} /><Stars value={r.avg} count={r.count} small /><span className="muted small">{c.language}</span></span>
        <span className="price">{Number.isFinite(from) ? <>from <b>{tok(from)}</b></> : <span className="muted">No open slots</span>}</span>
      </div>
    </a>
  )
}

export function SlotCard({ s, c, bookings }: { s: Slot; c?: User; bookings: Booking[] }) {
  const left = spotsLeft(s, bookings), live = isLive(s, bookings), p = minPrice(s)
  return (
    <article className={`scard glass${live ? '' : ' off'}`}>
      <a href={`#/slot/${s.id}`} className="scard-top">
        <div className={`scard-frame ${s.orientation}`}><span className="len">{lengthOf(s.length).label}</span><Icon d={I.play} size={20} /></div>
        <div className="grow">
          <div className="row-g"><PlatformStack list={s.platforms} size={20} /><span className="muted small">{s.category}</span></div>
          <b className="clamp2 stitle">{s.title}</b>
        </div>
        <SaveBtn kind="slot" id={s.id} />
      </a>
      {c && <a className="vby" href={`#/creator/${c.id}`}><Avatar u={c} size={22} />{c.name}<span className="muted">· {fmt(followersOf(c))} followers</span></a>}
      <div className="tags">{s.tags.slice(0, 5).map((t) => <span key={t}>#{t}</span>)}</div>
      <ul className="fmt-prices">{s.formats.slice(0, 3).map((f) => <li key={f.type}><span>{typeLabel(f.type)}</span><b>{tok(f.price)}</b></li>)}{s.formats.length > 3 && <li className="muted small">+{s.formats.length - 3} more formats</li>}</ul>
      <div className="scard-f">
        <span className="small muted"><Icon d={I.cal} size={13} /> by {dateLabel(s.publishBy)} · {s.exclusive ? 'Exclusive' : `${left}/${s.spots} spots`}</span>
        {s.sample ? <span className="sample" title="Sample profile — not bookable">Sample · {tok(p)}</span> : live ? <a className="btn sm" href={`#/book/${s.id}`}>Book · {tok(p)}</a> : <span className="badge muted">{s.status !== 'open' ? s.status : left ? 'Expired' : 'Sold out'}</span>}
      </div>
    </article>
  )
}

export function Thumb({ v, children }: { v: Video; children?: ReactNode }) {
  const url = useBlobUrl(v.thumbId)
  return (
    <div className="thumb">
      {url ? <img src={url} alt="" loading="lazy" /> : <div className="thumb-ph">{v.platform && <PlatformBadge p={v.platform} size={34} />}</div>}
      {v.duration > 0 && <span className="dur">{dur(v.duration)}</span>}
      {children}
    </div>
  )
}

export function PortfolioCard({ v }: { v: Video }) {
  const href = v.blobId ? `#/video/${v.id}` : v.url
  return (
    <a className="vcard glass" href={href} target={v.blobId ? undefined : '_blank'} rel="noreferrer" onClick={() => db.patch('videos', v.id, { views: v.views + 1 })}>
      <Thumb v={v} />
      <div className="vcard-b"><b className="clamp2">{v.title}</b><span className="muted small">{v.platform ? PLATFORMS[v.platform].name : 'Sample'} · {v.category}{v.blobId ? '' : ' ↗'}</span></div>
    </a>
  )
}

// HTML overlay identical in layout to drawPlacement() in lib/media.ts
export function AdOverlay({ p, imageUrl, visible = true, selected, onPointerDown, onResize }: {
  p: Pick<Booking, 'type' | 'text' | 'style' | 'x' | 'y' | 'w' | 'h'>; imageUrl?: string; visible?: boolean; selected?: boolean
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

// Placeholder "video frame" used when the slot has no sample video yet
export function MockFrame({ portrait, label }: { portrait?: boolean; label?: string }) {
  return (
    <div className="mock" aria-hidden>
      <svg viewBox={portrait ? '0 0 180 320' : '0 0 320 180'} preserveAspectRatio="xMidYMid slice">
        <defs><linearGradient id="mk" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#2A2350" /><stop offset="1" stopColor="#15142A" /></linearGradient></defs>
        <rect width="100%" height="100%" fill="url(#mk)" />
        <circle cx="50%" cy="38%" r={portrait ? 34 : 26} fill="#8B7CFF" opacity=".25" />
        <rect x="35%" y="58%" width="30%" height="5%" rx="4" fill="#fff" opacity=".12" />
      </svg>
      {label && <span>{label}</span>}
    </div>
  )
}

export function useObjectUrl(b?: Blob | null) {
  const u = useMemo(() => (b ? URL.createObjectURL(b) : ''), [b])
  useEffect(() => () => { u && URL.revokeObjectURL(u) }, [u])
  return u
}
