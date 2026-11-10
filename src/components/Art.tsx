// Original SVG artwork for YOULIP.FUN (no third-party logos).
import { CSSProperties, ReactNode, useId } from 'react'
import cfg from '../config/config.json'
import type { AdType, PlatformKey } from '../lib/db'
import { PLATFORMS } from '../lib/constants'

const shade = (hex: string, amt: number) => {
  const v = parseInt(hex.slice(1), 16), f = (c: number) => Math.max(0, Math.min(255, Math.round(c + (amt > 0 ? (255 - c) : c) * amt)))
  return `rgb(${f(v >> 16)},${f((v >> 8) & 255)},${f(v & 255)})`
}
const lum = (hex: string) => { const v = parseInt(hex.slice(1), 16); return (0.299 * (v >> 16) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255)) / 255 }

// Official icon files can be dropped in public/platforms/ and listed in config.json → platformIcons
const ICONS = ((cfg as { platformIcons?: Record<string, string> }).platformIcons) || {}

// Platform badge: glossy squircle in the platform color with a monogram
export function PlatformIcon({ p, size = 22, title = true }: { p: PlatformKey; size?: number; title?: boolean }) {
  const id = useId().replace(/:/g, '')
  const m = PLATFORMS[p]
  if (ICONS[p]) return <img className="pf-img" src={ICONS[p]} width={size} height={size} alt={m.name} title={title ? m.name : undefined} />
  const ink = lum(m.color) > 0.6 ? '#0B0C14' : '#fff'
  const fs = m.short.length >= 3 ? 9 : m.short.length === 2 ? 11.5 : 15
  return (
    <svg className="pf-svg" width={size} height={size} viewBox="0 0 32 32" role="img" aria-label={m.name}>
      {title && <title>{m.name}</title>}
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={shade(m.color, 0.25)} /><stop offset="1" stopColor={shade(m.color, -0.28)} /></linearGradient>
        <linearGradient id={`h${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".38" /><stop offset=".55" stopColor="#fff" stopOpacity="0" /></linearGradient>
      </defs>
      <path d="M16 1.5c9.6 0 14.5 4.9 14.5 14.5S25.6 30.5 16 30.5 1.5 25.6 1.5 16 6.4 1.5 16 1.5Z" fill={`url(#g${id})`} />
      <path d="M16 2.5c8.4 0 12.9 3.8 13.4 11.3C25 11 20.8 10 16 10S7 11 2.6 13.8C3.1 6.3 7.6 2.5 16 2.5Z" fill={`url(#h${id})`} />
      <path d="M16 1.5c9.6 0 14.5 4.9 14.5 14.5S25.6 30.5 16 30.5 1.5 25.6 1.5 16 6.4 1.5 16 1.5Z" fill="none" stroke="#fff" strokeOpacity=".22" />
      <text x="16" y="16.5" textAnchor="middle" dominantBaseline="central" fill={ink} fontFamily="Plus Jakarta Sans, Inter, sans-serif" fontWeight="800" fontSize={fs} letterSpacing="-.3">{m.short}</text>
    </svg>
  )
}

// Duotone icon tile used for feature lists
export function Duo({ children, tone = 'brand', size = 44 }: { children: ReactNode; tone?: 'brand' | 'accent' | 'warn' | 'bad' | 'ok'; size?: number }) {
  return <span className={`duo duo-${tone}`} style={{ width: size, height: size }}>{children}</span>
}

// Proportional dial for video lengths (arc = share of 30 min, log-scaled)
export function LengthDial({ sec, size = 44 }: { sec: number; size?: number }) {
  const f = Math.min(1, Math.log(sec / 15) / Math.log(1800 / 15)), r = 17, c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" className="dial" aria-hidden>
      <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="5" />
      <circle cx="22" cy="22" r={r} fill="none" stroke="url(#dialg)" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${c * Math.max(f, 0.06)} ${c}`} transform="rotate(-90 22 22)" />
      <defs><linearGradient id="dialg" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#8B7CFF" /><stop offset="1" stopColor="#35D6C5" /></linearGradient></defs>
      <path d="M19 17v10l8-5z" fill="#fff" opacity=".85" />
    </svg>
  )
}

// Mini scene for each ad format
export function FormatArt({ type }: { type: AdType }) {
  const frame = (inner: ReactNode) => (
    <svg viewBox="0 0 240 135" className="fmt-art" aria-hidden>
      <defs>
        <linearGradient id="fa-bg" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#2A2350" /><stop offset="1" stopColor="#14132A" /></linearGradient>
        <radialGradient id="fa-glow" cx=".72" cy=".3" r=".45"><stop stopColor="#8B7CFF" stopOpacity=".55" /><stop offset="1" stopColor="#8B7CFF" stopOpacity="0" /></radialGradient>
        <linearGradient id="fa-brand" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#A99EFF" /><stop offset="1" stopColor="#35D6C5" /></linearGradient>
      </defs>
      <rect width="240" height="135" rx="12" fill="url(#fa-bg)" />
      <rect width="240" height="135" rx="12" fill="url(#fa-glow)" />
      <path d="M0 108 46 78l34 20 44-34 46 30 70-38v79H0Z" fill="#1E1B3A" opacity=".9" />
      <circle cx="56" cy="42" r="14" fill="#35D6C5" opacity=".14" />
      {inner}
    </svg>
  )
  const card = (x: number, y: number, w: number, h: number, c: ReactNode) => <g><rect x={x} y={y} width={w} height={h} rx="8" fill="rgba(16,17,27,.86)" stroke="rgba(255,255,255,.18)" />{c}</g>
  const mark = (x: number, y: number, s = 22) => <g transform={`translate(${x} ${y}) scale(${s / 32})`}><rect width="32" height="32" rx="9" fill="url(#fa-brand)" /><path d="M12 9v14l11-7z" fill="#fff" /></g>
  const lines = (x: number, y: number, ws: number[]) => ws.map((w, i) => <rect key={i} x={x} y={y + i * 8} width={w} height="4" rx="2" fill="#fff" opacity={i ? 0.45 : 0.9} />)
  switch (type) {
    case 'image': return frame(<>{card(172, 86, 52, 36, mark(186, 93))}<rect x="166" y="80" width="64" height="48" rx="10" fill="none" stroke="#35D6C5" strokeDasharray="4 3" opacity=".8" /></>)
    case 'text': return frame(<>{card(18, 98, 204, 24, <>{lines(30, 106, [150])}</>)}</>)
    case 'combo': return frame(<>{card(108, 88, 118, 34, <>{mark(115, 94)}{lines(144, 99, [70, 48])}</>)}</>)
    case 'mention': return frame(<>
      <circle cx="120" cy="58" r="20" fill="#8B7CFF" opacity=".55" /><circle cx="120" cy="52" r="7" fill="#fff" opacity=".85" /><path d="M108 70c3-7 21-7 24 0" fill="#fff" opacity=".85" />
      {[0, 1, 2].map((i) => <path key={i} d={`M${146 + i * 9} ${44 - i * 4}q${8 + i * 3} ${14 + i * 4} 0 ${28 + i * 8}`} fill="none" stroke="#35D6C5" strokeWidth="3" strokeLinecap="round" opacity={0.9 - i * 0.25} />)}
      {card(70, 96, 100, 24, <>{lines(80, 104, [80])}</>)}
    </>)
    case 'segment': return frame(<>
      <rect x="18" y="112" width="204" height="8" rx="4" fill="rgba(255,255,255,.12)" />
      <rect x="92" y="112" width="58" height="8" rx="4" fill="url(#fa-brand)" />
      <path d="M92 104h58" stroke="#35D6C5" strokeWidth="2" strokeDasharray="3 3" />
      {card(84, 40, 74, 50, <>{mark(108, 50, 26)}</>)}
    </>)
    case 'link': return frame(<>
      <rect x="18" y="18" width="204" height="99" rx="10" fill="rgba(16,17,27,.82)" stroke="rgba(255,255,255,.12)" />
      {lines(32, 32, [120, 170, 150])}
      <rect x="32" y="66" width="120" height="22" rx="11" fill="url(#fa-brand)" />
      <path d="M44 77h8m-2-4 4 4-4 4" stroke="#10111B" strokeWidth="2" fill="none" strokeLinecap="round" />
      <rect x="60" y="74" width="80" height="6" rx="3" fill="#10111B" opacity=".7" />
      {lines(32, 98, [140])}
    </>)
  }
}

// Empty-state illustration: stacked cards with a play tile and sparkles
export function EmptyArt({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.75} viewBox="0 0 160 120" aria-hidden className="empty-art">
      <defs><linearGradient id="ea" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#A99EFF" /><stop offset="1" stopColor="#5B4BE0" /></linearGradient></defs>
      <rect x="34" y="30" width="92" height="64" rx="12" fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.12)" transform="rotate(-8 80 62)" />
      <rect x="34" y="28" width="92" height="64" rx="12" fill="rgba(255,255,255,.06)" stroke="rgba(255,255,255,.16)" transform="rotate(5 80 60)" />
      <rect x="36" y="26" width="88" height="62" rx="12" fill="#1B1C2E" stroke="rgba(255,255,255,.2)" />
      <rect x="66" y="42" width="28" height="28" rx="9" fill="url(#ea)" /><path d="M76 50v12l10-6z" fill="#fff" />
      <rect x="48" y="78" width="40" height="4" rx="2" fill="#fff" opacity=".2" />
      <circle cx="122" cy="22" r="3" fill="#35D6C5" /><path d="M30 18v8m-4-4h8" stroke="#35D6C5" strokeWidth="2" strokeLinecap="round" />
      <path d="M134 86v6m-3-3h6" stroke="#8B7CFF" strokeWidth="2" strokeLinecap="round" /><circle cx="22" cy="92" r="2.5" fill="#8B7CFF" />
    </svg>
  )
}

// Decorative orbit of platform badges (explore header, auth)
export function PlatformOrbit({ size = 260 }: { size?: number }) {
  const ps: PlatformKey[] = ['youtube', 'tiktok', 'facebook', 'x', 'instagram', 'twitch', 'kick', 'rumble']
  return (
    <div className="orbit" style={{ width: size, height: size } as CSSProperties} aria-hidden>
      <svg viewBox="0 0 260 260" width={size} height={size}>
        <defs><radialGradient id="ob" cx=".5" cy=".5" r=".5"><stop stopColor="#8B7CFF" stopOpacity=".35" /><stop offset="1" stopColor="#8B7CFF" stopOpacity="0" /></radialGradient></defs>
        <circle cx="130" cy="130" r="128" fill="url(#ob)" />
        <circle cx="130" cy="130" r="104" fill="none" stroke="rgba(255,255,255,.1)" strokeDasharray="3 6" />
        <circle cx="130" cy="130" r="64" fill="none" stroke="rgba(53,214,197,.25)" />
      </svg>
      <img className="orbit-core" src="/logo.svg" alt="" />
      <div className="orbit-ring">{ps.map((p, i) => <span key={p} style={{ transform: `rotate(${(i * 360) / ps.length}deg) translate(${size * 0.4}px) rotate(-${(i * 360) / ps.length}deg)` }}><span className="orbit-i"><PlatformIcon p={p} size={size * 0.13} /></span></span>)}</div>
    </div>
  )
}

// Soft grid + glow behind hero sections
export function HeroDeco() {
  return (
    <svg className="hero-deco" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <pattern id="hd-grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0v48" fill="none" stroke="rgba(255,255,255,.045)" /></pattern>
        <radialGradient id="hd-fade" cx=".5" cy=".35" r=".7"><stop stopColor="#fff" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
        <mask id="hd-m"><rect width="1200" height="600" fill="url(#hd-fade)" /></mask>
      </defs>
      <rect width="1200" height="600" fill="url(#hd-grid)" mask="url(#hd-m)" />
      <path d="M-20 470C220 380 380 520 620 430s420-170 620-90" fill="none" stroke="url(#hd-l)" strokeWidth="1.5" opacity=".6" />
      <defs><linearGradient id="hd-l" x1="0" x2="1"><stop stopColor="#8B7CFF" stopOpacity="0" /><stop offset=".5" stopColor="#8B7CFF" /><stop offset="1" stopColor="#35D6C5" stopOpacity="0" /></linearGradient></defs>
    </svg>
  )
}

// Numbered step badge with gradient ring
export function StepNum({ n }: { n: number }) {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" className="step-num" aria-hidden>
      <defs><linearGradient id="sn" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#8B7CFF" /><stop offset="1" stopColor="#35D6C5" /></linearGradient></defs>
      <circle cx="17" cy="17" r="15.5" fill="rgba(139,124,255,.12)" stroke="url(#sn)" strokeWidth="1.5" />
      <text x="17" y="17.5" textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize="13" fontWeight="800" fontFamily="Plus Jakarta Sans, sans-serif">{n}</text>
    </svg>
  )
}

// Tier gem (Nano → Mega), fill grows with tier
export function TierGem({ level }: { level: number }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden className="gem">
      <path d="M8 1 15 6 8 15 1 6Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      {level > 0 && <path d={['', 'M8 11 11 8H5Z', 'M8 13 13 7H3Z', 'M8 14 14 6H2Z', 'M8 1 15 6 8 15 1 6Z'][level]} fill="currentColor" opacity=".85" />}
    </svg>
  )
}
