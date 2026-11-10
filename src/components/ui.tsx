import { ReactNode, useEffect, useState } from 'react'
import cfg from '../config/config.json'

export function Logo({ size = 30, word = true }: { size?: number; word?: boolean }) {
  const [main, tld] = cfg.brand.split('.'), cut = Math.ceil(main.length / 2)
  return (
    <a href="#/" className="logo" aria-label={cfg.brand}>
      <img src="/logo.svg" width={size} height={size} alt="" />
      {word && <span className="word">{main.slice(0, cut)}<em>{main.slice(cut)}</em>{tld && <small>.{tld}</small>}</span>}
    </a>
  )
}

export const Icon = ({ d, size = 18 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {d.split('|').map((p, i) => <path key={i} d={p} />)}
  </svg>
)
// Minimal line icons (paths separated by |)
export const I = {
  home: 'M3 11l9-7 9 7|M5 10v10h14V10',
  grid: 'M4 4h7v7H4z|M13 4h7v7h-7z|M4 13h7v7H4z|M13 13h7v7h-7z',
  video: 'M3 6h13v12H3z|M16 10l5-3v10l-5-3',
  upload: 'M12 16V4|M7 9l5-5 5 5|M4 20h16',
  inbox: 'M3 13h5l2 3h4l2-3h5|M5 5h14l2 8v6H3v-6z',
  tag: 'M3 12V3h9l9 9-9 9z|M7.5 7.5h.01',
  chart: 'M4 20V10|M10 20V4|M16 20v-7|M22 20H2',
  wallet: 'M3 7h18v13H3z|M3 7l3-4h12l3 4|M16 13h2',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z|M4 21a8 8 0 0 1 16 0',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z|M2 21a7 7 0 0 1 14 0|M17 3a4 4 0 0 1 0 8|M22 21a7 7 0 0 0-4-6.3',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z|M21 21l-5-5',
  star: 'M12 3l2.7 5.6 6.3.9-4.5 4.4 1 6.1L12 17l-5.5 3 1-6.1L3 9.5l6.3-.9z',
  layers: 'M12 3l9 5-9 5-9-5z|M3 13l9 5 9-5',
  edit: 'M4 20h4L19 9l-4-4L4 16z|M14 6l4 4',
  book: 'M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z|M20 4h-6|M20 4v14h-6',
  logout: 'M15 4h4v16h-4|M10 8l-4 4 4 4|M6 12h10',
  check: 'M5 12l5 5 9-10',
  x: 'M6 6l12 12|M18 6L6 18',
  copy: 'M9 9h11v11H9z|M5 15H4V4h11v1',
  play: 'M7 4v16l13-8z',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z|M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  menu: 'M4 7h16|M4 12h16|M4 17h16',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
  plus: 'M12 5v14|M5 12h14',
  send: 'M22 2L11 13|M22 2l-7 20-4-9-9-4z',
  doc: 'M6 2h9l5 5v15H6z|M14 2v6h6',
  bookmark: 'M6 3h12v18l-6-4-6 4z',
  cal: 'M4 6h16v14H4z|M4 10h16|M8 3v5|M16 3v5',
  flag: 'M5 21V4|M5 4h11l-2 4 2 4H5',
  chat: 'M4 5h16v11H9l-5 4z',
  link: 'M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1|M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z|M12 7v5l3 2',
  slot: 'M4 5h16v14H4z|M4 9h16|M9 13h6',
}

export function Stat({ label, value, sub, icon }: { label: string; value: ReactNode; sub?: ReactNode; icon?: string }) {
  return (
    <div className="stat">
      <div className="stat-v">{value}</div>
      <div className="stat-l">{icon && <Icon d={icon} size={15} />}{label}</div>
      {sub && <div className="stat-s">{sub}</div>}
    </div>
  )
}

export function Empty({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <img src="/logo.svg" width={40} height={40} alt="" />
      <h4>{title}</h4>
      {text && <p>{text}</p>}
      {action}
    </div>
  )
}

const STATUS_TONE: Record<string, string> = {
  requested: 'warn', open: 'warn', countered: 'info', quoted: 'info', accepted: 'brand', delivered: 'info', revision: 'warn',
  completed: 'ok', declined: 'bad', cancelled: 'bad', disputed: 'bad', overdue: 'bad', active: 'brand', draft: 'muted',
  paused: 'muted', closed: 'muted', confirmed: 'ok', submitted: 'info', paid: 'ok', message: 'muted',
}
export const Badge = ({ s, children }: { s: string; children?: ReactNode }) => <span className={`badge ${STATUS_TONE[s] || 'muted'}`}>{children ?? s}</span>

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    addEventListener('keydown', k); return () => removeEventListener('keydown', k)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="modal-back" onClick={onClose}>
      <div className={`modal${wide ? ' wide' : ''}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="modal-head"><span>{title}</span><button className="x" onClick={onClose} aria-label="Close"><Icon d={I.x} /></button></div>
        {children}
      </div>
    </div>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>
}

export function useToast() {
  const [msg, setMsg] = useState('')
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(''), 2600); return () => clearTimeout(t) }, [msg])
  return { toast: setMsg, node: msg ? <div className="toast">{msg}</div> : null }
}

export function Progress({ value, tone }: { value: number; tone?: string }) {
  return <div className={`bar ${tone || ''}`}><i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>
}
