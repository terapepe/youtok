import { useEffect, useRef, useState } from 'react'
import { useAccount } from 'wagmi'
import { useWallet } from '@solana/wallet-adapter-react'
import { db, uid, Placement, User, Video, Txn, PlacementStatus } from '../../lib/db'
import { useAuth } from '../../lib/auth'
import { useBlobUrl } from '../../lib/hooks'
import { usePay } from '../../lib/pay'
import { renderWithAd } from '../../lib/media'
import { activeNetworks, caOf, networks } from '../../config/chains'
import { AD_TYPES, ago, CATEGORIES, dur, fmt, short, SYMBOL, tok, typeLabel, ZONES, ZONE_KEYS } from '../../lib/constants'
import { AdOverlay, Avatar, Thumb } from '../../components/Media'
import { ChainIcon } from '../../components/Chain'
import { WalletButton } from '../../components/Layout'
import { Badge, Empty, Field, Icon, I, Modal, Progress } from '../../components/ui'

export const log = (p: Placement, by: string, action: string, note?: string) => [...p.history, { at: Date.now(), by, action, note }]
export const price = (p: Placement) => p.quote ?? p.offer

export async function setStatus(p: Placement, by: string, status: PlacementStatus, extra: Partial<Placement> = {}, note?: string) {
  await db.patch('placements', p.id, { ...extra, status, updatedAt: Date.now(), history: log(p, by, status, note) })
  if (status === 'approved') {
    await db.put('contracts', {
      id: uid(), placementId: p.id, creatorId: p.creatorId, advertiserId: p.advertiserId, amount: extra.quote ?? price(p), createdAt: Date.now(),
      terms: `${typeLabel(p.type)} shown ${p.start}s–${p.end}s at x${p.x.toFixed(0)}% y${p.y.toFixed(0)}%. Creator publishes the video with the ad; advertiser pays ${extra.quote ?? price(p)} ${SYMBOL} after publication.`,
    })
  }
}

// Plays the source video with the placement overlaid at its real timing
export function PlacementPreview({ p, v }: { p: Placement; v?: Video }) {
  const src = useBlobUrl(v?.blobId), img = useBlobUrl(p.imageId), pub = useBlobUrl(p.publishedId)
  const [t, setT] = useState(0)
  const [showPub, setShowPub] = useState(!!p.publishedId)
  const ref = useRef<HTMLVideoElement>(null)
  if (!v) return <p className="muted">Video was removed.</p>
  return (
    <div>
      {p.publishedId && <div className="seg mb"><button className={!showPub ? 'on' : ''} onClick={() => setShowPub(false)}>Overlay preview</button><button className={showPub ? 'on' : ''} onClick={() => setShowPub(true)}>Published video</button></div>}
      <div className="ed-stage" style={{ aspectRatio: `${v.width || 16} / ${v.height || 9}` }}>
        {showPub ? <video src={pub} controls playsInline /> : <>
          <video ref={ref} src={src} controls playsInline onTimeUpdate={() => setT(ref.current?.currentTime ?? 0)} />
          <AdOverlay p={p} imageUrl={img} visible={t >= p.start && t <= p.end} />
        </>}
      </div>
      <ul className="kv mt">
        <li><span>Format</span><b>{typeLabel(p.type)}</b></li>
        <li><span>On screen</span><b>{dur(p.start)} → {dur(p.end)} ({(p.end - p.start).toFixed(1)}s)</b></li>
        {p.text && <li><span>Text</span><b>{p.text}</b></li>}
        {p.link && <li><span>Link</span><b><a href={p.link} target="_blank" rel="noreferrer">{p.link}</a></b></li>}
        <li><span>Offer</span><b>{tok(p.offer)}</b></li>
        {p.quote != null && <li><span>Creator quote</span><b>{tok(p.quote)}</b></li>}
      </ul>
      <h5 className="mt">History</h5>
      <ul className="feed">{[...p.history].reverse().map((h, i) => <li key={i}><Badge s={h.action} /><span>{h.note}</span><em>{ago(h.at)}</em></li>)}</ul>
    </div>
  )
}

export function PlacementRow({ p, v, other, children }: { p: Placement; v?: Video; other?: User; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const ctr = p.impressions ? (p.adViews / p.impressions) * 100 : 0
  return (
    <div className="prow glass">
      <button className="prow-thumb" onClick={() => setOpen(true)} title="Preview">{v ? <Thumb v={v} /> : <div className="thumb"><div className="thumb-ph" /></div>}</button>
      <div className="prow-main">
        <b className="clamp1">{v?.title || 'Removed video'}</b>
        <span className="muted small">{other && <><Avatar u={other} size={16} /> {other.name} · </>}{typeLabel(p.type)} · {dur(p.start)}–{dur(p.end)} · {ago(p.updatedAt)}</span>
        {(p.status === 'published' || p.status === 'paid') && <div className="prow-bar"><Progress value={ctr} /><span className="small">{fmt(p.impressions)} plays · {fmt(p.adViews)} ad views · {fmt(p.clicks)} clicks</span></div>}
      </div>
      <div className="prow-price"><b>{tok(price(p))}</b>{p.quote != null && p.quote !== p.offer && <span className="muted small">offer {tok(p.offer)}</span>}</div>
      <Badge s={p.status} />
      <div className="prow-act">{children}<button className="btn ghost sm" onClick={() => setOpen(true)}>Details</button></div>
      <Modal open={open} onClose={() => setOpen(false)} title="Ad placement" wide><PlacementPreview p={p} v={v} /></Modal>
    </div>
  )
}

// Creator: render the video with the ad burned in and publish it
export function PublishButton({ p, v }: { p: Placement; v?: Video }) {
  const { user } = useAuth()
  const src = useBlobUrl(v?.blobId), img = useBlobUrl(p.imageId)
  const [prog, setProg] = useState(-1)
  const [err, setErr] = useState('')
  const run = async () => {
    if (!v || !user) return
    setErr(''); setProg(0)
    try {
      const blob = await renderWithAd(src, p, img, setProg)
      const id = await db.putBlob(blob)
      await setStatus(p, user.id, 'published', { publishedId: id }, 'Video rendered with the ad and published')
    } catch (e) { setErr((e as Error).message) } finally { setProg(-1) }
  }
  if (prog >= 0) return <span className="render"><Progress value={prog * 100} /><small>Rendering {Math.round(prog * 100)}% (real-time)</small></span>
  return <>{err && <span className="err small">{err}</span>}<button className="btn sm" onClick={run}><Icon d={I.upload} size={14} />Publish</button></>
}

// Advertiser: pay the creator in $YOUTOK and record the transaction
export function PayModal({ p, creator, open, onClose }: { p: Placement; creator?: User; open: boolean; onClose: () => void }) {
  const { user } = useAuth()
  const { pay, options } = usePay()
  const [net, setNet] = useState(options[0]?.key || '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const n = networks.find((x) => x.key === net)
  const to = n?.vm === 'svm' ? creator?.wallets.sol : creator?.wallets.evm
  const go = async () => {
    if (!n || !user) return
    setErr(''); setBusy(true)
    try {
      const r = await pay(n, to || '', price(p))
      const tx: Txn = { id: uid(), placementId: p.id, from: r.from, to: to!, amount: price(p), network: n.key, txHash: r.hash, status: 'submitted', createdAt: Date.now() }
      await db.put('transactions', tx)
      await setStatus(p, user.id, 'paid', {}, `Paid ${price(p)} ${SYMBOL} on ${n.name}`)
      onClose()
    } catch (e) { setErr((e as Error).message.split('\n')[0]) } finally { setBusy(false) }
  }
  return (
    <Modal open={open} onClose={onClose} title={`Pay ${creator?.name || 'creator'}`}>
      <ul className="kv"><li><span>Amount</span><b>{tok(price(p))}</b></li><li><span>Recipient</span><b>{to ? short(to) : 'No wallet linked for this network'}</b></li></ul>
      {options.length ? <>
        <Field label="Network"><div className="seg">{options.map((o) => <button key={o.key} className={net === o.key ? 'on' : ''} onClick={() => setNet(o.key)}><ChainIcon n={o} size={16} />{o.short}</button>)}</div></Field>
        <div className="cta-row"><WalletButton className="btn ghost" /><button className="btn" disabled={busy || !to} onClick={go}>{busy ? 'Confirm in wallet…' : `Send ${tok(price(p))}`}</button></div>
      </> : <p className="muted">{SYMBOL} contract addresses are not published yet. Payments open as soon as the CA is added in config.</p>}
      {err && <p className="err">{err}</p>}
    </Modal>
  )
}

export function TxTable({ rows, me }: { rows: Txn[]; me: string[] }) {
  if (!rows.length) return <Empty title="No payments yet" text={`${SYMBOL} payments appear here after on-chain transfers.`} />
  return (
    <div className="table glass">
      <div className="tr th"><span>Date</span><span>Network</span><span>Direction</span><span>Amount</span><span>Tx</span></div>
      {[...rows].sort((a, b) => b.createdAt - a.createdAt).map((t) => {
        const n = networks.find((x) => x.key === t.network)
        const inbound = me.includes(t.to.toLowerCase()) || me.includes(t.to)
        return (
          <div key={t.id} className="tr">
            <span>{new Date(t.createdAt).toLocaleString('en')}</span>
            <span>{n && <ChainIcon n={n} size={16} />} {n?.name}</span>
            <span><Badge s={inbound ? 'paid' : 'submitted'}>{inbound ? 'Received' : 'Sent'}</Badge></span>
            <span><b>{tok(t.amount)}</b></span>
            <span>{n ? <a href={n.txExplorer + t.txHash} target="_blank" rel="noreferrer">{short(t.txHash)} ↗</a> : short(t.txHash)}</span>
          </div>
        )
      })}
    </div>
  )
}

// Simple bar chart: daily totals for the last N days
export function DailyBars({ points, label, days = 14 }: { points: { at: number; v: number }[]; label: string; days?: number }) {
  const day = 86400000, start = new Date(); start.setHours(0, 0, 0, 0)
  const buckets = Array.from({ length: days }, (_, i) => { const d = start.getTime() - (days - 1 - i) * day; return { d, v: points.filter((p) => p.at >= d && p.at < d + day).reduce((s, p) => s + p.v, 0) } })
  const max = Math.max(1, ...buckets.map((b) => b.v))
  return (
    <div className="chart glass">
      <div className="chart-h"><b>{label}</b><span className="muted small">last {days} days</span></div>
      <div className="bars">{buckets.map((b) => <div key={b.d} title={`${new Date(b.d).toLocaleDateString('en', { month: 'short', day: 'numeric' })}: ${fmt(b.v, 2)}`}><i style={{ height: `${(b.v / max) * 100}%` }} /></div>)}</div>
      <div className="bars-x"><span>{new Date(buckets[0].d).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span><span>Today</span></div>
    </div>
  )
}

export function HBars({ rows, label }: { rows: { name: string; v: number; sub?: string }[]; label: string }) {
  const max = Math.max(1, ...rows.map((r) => r.v))
  return (
    <div className="chart glass">
      <div className="chart-h"><b>{label}</b></div>
      {rows.length ? <div className="hbars">{rows.map((r, i) => <div key={i}><span className="clamp1">{r.name}</span><Progress value={(r.v / max) * 100} /><b>{r.sub ?? fmt(r.v)}</b></div>)}</div> : <p className="muted small">No data yet.</p>}
    </div>
  )
}

export function ProfileForm() {
  const { user, update } = useAuth()
  const evm = useAccount(), sol = useWallet()
  const [f, setF] = useState(user!)
  const [saved, setSaved] = useState(false)
  useEffect(() => setF(user!), [user?.id])
  if (!user) return null
  const set = (p: Partial<User>) => { setF({ ...f, ...p }); setSaved(false) }
  const save = async () => {
    const handle = f.handle.toLowerCase().replace(/[^a-z0-9_]/g, '')
    await update({ ...f, handle }); setSaved(true)
  }
  const avatar = async (file?: File) => { if (file) { const id = await db.putBlob(file); set({ avatarId: id }) } }
  const solAddr = sol.publicKey?.toBase58()
  return (
    <div className="form-grid">
      <div className="glass pane">
        <h4>Profile</h4>
        <div className="row-ava"><Avatar u={f} size={64} /><label className="btn ghost sm">Upload avatar<input hidden type="file" accept="image/*" onChange={(e) => avatar(e.target.files?.[0])} /></label></div>
        <div className="row2"><Field label="Display name"><input value={f.name} onChange={(e) => set({ name: e.target.value })} /></Field><Field label="Handle"><input value={f.handle} onChange={(e) => set({ handle: e.target.value })} /></Field></div>
        {f.role === 'creator' ? <div className="row2">
          <Field label="Category"><select value={f.category} onChange={(e) => set({ category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Total followers" hint="Across your social channels"><input type="number" min="0" value={f.followers} onChange={(e) => set({ followers: Number(e.target.value) })} /></Field>
        </div> : <Field label="Company / brand"><input value={f.company || ''} onChange={(e) => set({ company: e.target.value })} /></Field>}
        <Field label="Bio"><textarea rows={3} value={f.bio} onChange={(e) => set({ bio: e.target.value })} /></Field>
      </div>
      <div className="glass pane">
        <h4>Social links</h4>
        {(['x', 'youtube', 'tiktok', 'instagram', 'website'] as const).map((k) => <Field key={k} label={k === 'x' ? 'X' : k[0].toUpperCase() + k.slice(1)}><input value={f.socials[k] || ''} onChange={(e) => set({ socials: { ...f.socials, [k]: e.target.value } })} placeholder="https://" /></Field>)}
      </div>
      <div className="glass pane">
        <h4>Wallets</h4>
        <p className="muted small">{f.role === 'creator' ? `${SYMBOL} payments are sent to these addresses.` : 'Used to pay creators.'} One EVM address covers {activeNetworks.filter((n) => n.vm === 'evm').map((n) => n.short).join(' / ') || 'EVM'}.</p>
        <ul className="kv">
          <li><span>EVM</span><b>{f.wallets.evm ? short(f.wallets.evm) : '—'}</b></li>
          <li><span>Solana</span><b>{f.wallets.sol ? short(f.wallets.sol) : '—'}</b></li>
        </ul>
        <div className="cta-row">
          <WalletButton className="btn ghost sm" />
          {evm.address && <button className="btn sm" onClick={() => set({ wallets: { ...f.wallets, evm: evm.address!.toLowerCase() } })}>Link EVM {short(evm.address)}</button>}
          {solAddr && <button className="btn sm" onClick={() => set({ wallets: { ...f.wallets, sol: solAddr } })}>Link SOL {short(solAddr)}</button>}
        </div>
        <h4 className="mt">Account</h4>
        <ul className="kv"><li><span>Email</span><b>{user.email || 'Wallet account'}</b></li><li><span>Role</span><b>{f.role}</b></li></ul>
        <button className="btn ghost sm" onClick={async () => { const role = f.role === 'creator' ? 'advertiser' : 'creator'; await update({ role }); location.hash = role === 'creator' ? '#/studio' : '#/brand' }}>Switch to {f.role === 'creator' ? 'Advertiser' : 'Creator'}</button>
      </div>
      <div className="save-bar"><button className="btn" onClick={save}>{saved ? 'Saved ✓' : 'Save changes'}</button></div>
    </div>
  )
}

export function PricingForm() {
  const { user, update } = useAuth()
  const [p, setP] = useState(user!.pricing)
  const [z, setZ] = useState(user!.zones)
  const [on, setOn] = useState(user!.acceptsAds)
  const [saved, setSaved] = useState(false)
  return (
    <div className="form-grid">
      <div className="glass pane">
        <h4>Default prices ({SYMBOL})</h4>
        <p className="muted small">Used for every video unless overridden. Leave 0 to accept open offers.</p>
        {AD_TYPES.map((a) => <Field key={a.key} label={a.label} hint={a.desc}><input type="number" min="0" value={p[a.key]} onChange={(e) => { setP({ ...p, [a.key]: Number(e.target.value) }); setSaved(false) }} /></Field>)}
        <label className="toggle"><input type="checkbox" checked={on} onChange={(e) => { setOn(e.target.checked); setSaved(false) }} />Listed in the creator marketplace</label>
      </div>
      <div className="glass pane">
        <h4>Allowed ad zones</h4>
        <p className="muted small">Advertisers can only place ads inside the zones you allow.</p>
        <div className="zone-pick">
          {ZONE_KEYS.map((k) => { const zz = ZONES[k]; return <button key={k} className={z.includes(k) ? 'on' : ''} style={{ left: `${zz.x}%`, top: `${zz.y}%`, width: `${zz.w}%`, height: `${zz.h}%` }} onClick={() => { setZ(z.includes(k) ? z.filter((x) => x !== k) : [...z, k]); setSaved(false) }}>{zz.label}</button> })}
        </div>
      </div>
      <div className="save-bar"><button className="btn" onClick={async () => { await update({ pricing: p, zones: z, acceptsAds: on }); setSaved(true) }}>{saved ? 'Saved ✓' : 'Save pricing'}</button></div>
    </div>
  )
}
