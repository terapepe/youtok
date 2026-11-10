import { useEffect, useRef, useState } from 'react'
import { useBlobUrl, useTable, go, query } from '../lib/hooks'
import { db, uid, AdType, OverlayStyle, Placement, ZoneKey } from '../lib/db'
import { useAuth } from '../lib/auth'
import { AD_TYPES, dur, SYMBOL, tok, ZONES, ZONE_KEYS } from '../lib/constants'
import { Page } from '../components/Layout'
import { AdOverlay, Avatar, minPrice, useObjectUrl } from '../components/Media'
import { Empty, Field, Icon, I } from '../components/ui'

const STYLE: OverlayStyle = { color: '#FFFFFF', bg: 'rgba(16,17,27,0.78)', size: 22, weight: 700, radius: 12, opacity: 1 }
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const inZone = (b: { x: number; y: number; w: number; h: number }, zs: ZoneKey[]) =>
  zs.some((k) => { const z = ZONES[k]; return b.x >= z.x - 0.5 && b.y >= z.y - 0.5 && b.x + b.w <= z.x + z.w + 0.5 && b.y + b.h <= z.y + z.h + 0.5 })

export default function Editor({ videoId }: { videoId?: string }) {
  const { user } = useAuth()
  const videos = useTable('videos'), users = useTable('users'), camps = useTable('campaigns')
  const ready = videos.rows.filter((v) => v.adEnabled)
  const v = videos.rows.find((x) => x.id === videoId) || (videoId ? undefined : ready[0])
  const creator = users.rows.find((u) => u.id === v?.creatorId)
  const src = useBlobUrl(v?.blobId)
  const zones = (v?.zones?.length ? v.zones : creator?.zones) || ZONE_KEYS
  const formats = v?.formats?.length ? v.formats : AD_TYPES.map((a) => a.key)

  const [type, setType] = useState<AdType>('combo')
  const [img, setImg] = useState<File | null>(null)
  const imgUrl = useObjectUrl(img)
  const [text, setText] = useState('')
  const [style, setStyle] = useState(STYLE)
  const [box, setBox] = useState({ x: 52, y: 64, w: 44, h: 16 })
  const [range, setRange] = useState({ start: 0, end: 5 })
  const [t, setT] = useState(0)
  const [preview, setPreview] = useState(false)
  const [offer, setOffer] = useState('')
  const [link, setLink] = useState('')
  const [note, setNote] = useState('')
  const [campId, setCampId] = useState(query().get('campaign') || '')
  const [campName, setCampName] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const stage = useRef<HTMLDivElement>(null)
  const vid = useRef<HTMLVideoElement>(null)

  useEffect(() => { if (v) setRange({ start: Math.min(2, v.duration / 4), end: Math.min(v.duration, Math.min(2, v.duration / 4) + Math.max(3, v.duration / 3)) }) }, [v?.id])
  useEffect(() => { if (!formats.includes(type)) setType(formats[0]) }, [v?.id])
  useEffect(() => {
    if (!v) return
    const z = ZONES[zones.includes('br') ? 'br' : zones[0]]
    setBox({ x: z.x + 2, y: z.y + z.h - 20, w: Math.min(z.w - 4, 44), h: 16 })
  }, [v?.id, creator?.id])
  useEffect(() => { const p = { ...(creator?.pricing || {}), ...(v?.price || {}) } as Record<string, number>; if (p[type]) setOffer(String(p[type])) }, [type, v?.id, creator?.id])

  // Drag + resize in % of the stage
  const drag = (mode: 'move' | 'size') => (e: React.PointerEvent) => {
    e.preventDefault()
    const r = stage.current!.getBoundingClientRect(), sx = e.clientX, sy = e.clientY, b0 = { ...box }
    const mv = (ev: PointerEvent) => {
      const dx = ((ev.clientX - sx) / r.width) * 100, dy = ((ev.clientY - sy) / r.height) * 100
      setBox(mode === 'move'
        ? { ...b0, x: clamp(b0.x + dx, 0, 100 - b0.w), y: clamp(b0.y + dy, 0, 100 - b0.h) }
        : { ...b0, w: clamp(b0.w + dx, 6, 100 - b0.x), h: clamp(b0.h + dy, 5, 100 - b0.y) })
    }
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up) }
    addEventListener('pointermove', mv); addEventListener('pointerup', up)
  }

  if (!videos.ready) return <Page><Empty title="Loading…" /></Page>
  if (!v) return <Page><Empty title="No ad-ready video selected" text="Pick a video from the marketplace to start placing an ad." action={<a className="btn" href="#/videos">Open marketplace</a>} /></Page>

  const visible = !preview || (t >= range.start && t <= range.end)
  const placed = inZone(box, zones)
  const mine = camps.rows.filter((c) => c.advertiserId === user?.id)
  const p = { type, text, style, ...box }
  const sync = () => setT(vid.current?.currentTime ?? 0)

  const submit = async () => {
    setErr('')
    if (!user) return go(`/auth?role=advertiser&next=${encodeURIComponent('/editor/' + v.id)}`)
    if (user.role !== 'advertiser') return setErr('Only advertiser accounts can send ad requests. Switch role in your profile.')
    if (user.id === v.creatorId) return setErr('You cannot advertise on your own video.')
    if (type !== 'text' && !img) return setErr('Upload an image or logo.')
    if (type !== 'image' && !text.trim()) return setErr('Enter the advertising text.')
    if (!placed) return setErr('Move the ad fully inside one of the allowed zones (highlighted).')
    if (range.end - range.start < 1) return setErr('The ad must be on screen for at least 1 second.')
    const amount = Number(offer)
    if (!(amount > 0)) return setErr(`Enter your offer in ${SYMBOL}.`)
    if (!campId && !campName.trim()) return setErr('Choose a campaign or name a new one.')
    setBusy(true)
    try {
      let cid = campId
      if (!cid) {
        cid = uid()
        await db.put('campaigns', { id: cid, advertiserId: user.id, name: campName.trim(), brand: user.company || user.name, objective: '', budget: amount, status: 'active', createdAt: Date.now() })
      }
      const imageId = img && type !== 'text' ? await db.putBlob(img) : undefined
      const now = Date.now()
      const pl: Placement = {
        id: uid(), campaignId: cid, videoId: v.id, creatorId: v.creatorId, advertiserId: user.id, type, imageId,
        text: type !== 'image' ? text.trim() : undefined, style, ...box, start: +range.start.toFixed(2), end: +range.end.toFixed(2),
        offer: amount, note: note.trim() || undefined, link: link.trim() || undefined, status: 'pending', impressions: 0, adViews: 0, clicks: 0,
        history: [{ at: now, by: user.id, action: 'requested', note: note.trim() || undefined }], createdAt: now, updatedAt: now,
      }
      await db.put('placements', pl)
      go('/brand/campaigns')
    } finally { setBusy(false) }
  }

  return (
    <Page>
      <section className="editor">
        <div className="ed-head">
          <div><span className="eyebrow">Video Ad Placement Editor</span><h2>{v.title}</h2></div>
          <select value={v.id} onChange={(e) => go('/editor/' + e.target.value)}>{ready.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}</select>
        </div>
        <div className="ed-grid">
          <div className="ed-stage-wrap">
            <div className="ed-stage" ref={stage} style={{ aspectRatio: `${v.width || 16} / ${v.height || 9}` }}>
              {src && <video ref={vid} src={src} playsInline onTimeUpdate={sync} onSeeked={sync} onLoadedMetadata={sync} />}
              {!preview && zones.map((k) => { const z = ZONES[k]; return <div key={k} className="zone" style={{ left: `${z.x}%`, top: `${z.y}%`, width: `${z.w}%`, height: `${z.h}%` }}><span>{z.label}</span></div> })}
              <AdOverlay p={p} imageUrl={imgUrl} visible={visible} selected={!preview} onPointerDown={preview ? undefined : drag('move')} onResize={preview ? undefined : drag('size')} />
            </div>
            <div className="ed-controls glass">
              <button className="btn sm" onClick={() => { const el = vid.current!; el.paused ? el.play() : el.pause() }}><Icon d={I.play} size={14} />Play / Pause</button>
              <button className="btn ghost sm" onClick={() => { vid.current!.currentTime = range.start; vid.current!.play(); setPreview(true) }}>Preview ad window</button>
              <label className="toggle"><input type="checkbox" checked={preview} onChange={(e) => setPreview(e.target.checked)} />Preview mode</label>
              <span className="grow" /><code>{dur(t)} / {dur(v.duration)}</code>
            </div>
            <div className="timeline glass">
              <div className="tl-track" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); vid.current!.currentTime = ((e.clientX - r.left) / r.width) * v.duration }}>
                <i className="tl-win" style={{ left: `${(range.start / v.duration) * 100}%`, width: `${((range.end - range.start) / v.duration) * 100}%` }} />
                <i className="tl-head" style={{ left: `${(t / v.duration) * 100}%` }} />
              </div>
              <div className="row2">
                <Field label={`Start · ${range.start.toFixed(1)}s`}><input type="range" min={0} max={v.duration} step={0.1} value={range.start} onChange={(e) => setRange((r) => ({ start: Math.min(+e.target.value, r.end - 0.5), end: r.end }))} /></Field>
                <Field label={`End · ${range.end.toFixed(1)}s`}><input type="range" min={0} max={v.duration} step={0.1} value={range.end} onChange={(e) => setRange((r) => ({ start: r.start, end: Math.max(+e.target.value, r.start + 0.5) }))} /></Field>
              </div>
              <div className="cta-row"><button className="btn ghost sm" onClick={() => setRange((r) => ({ ...r, start: Math.min(t, r.end - 0.5) }))}>Set start = playhead</button><button className="btn ghost sm" onClick={() => setRange((r) => ({ ...r, end: Math.max(t, r.start + 0.5) }))}>Set end = playhead</button>
                <span className={`badge ${placed ? 'ok' : 'bad'}`}>{placed ? 'Inside allowed zone' : 'Outside allowed zones'}</span></div>
            </div>
          </div>

          <div className="ed-panel">
            {creator && <a className="glass vd-creator" href={`#/creator/${creator.id}`}><Avatar u={creator} size={38} /><div><b>{creator.name}</b><span className="muted small">from {tok(minPrice(v, creator))}</span></div></a>}
            <div className="glass pane">
              <h4>1 · Format</h4>
              <div className="seg">{AD_TYPES.filter((a) => formats.includes(a.key)).map((a) => <button key={a.key} className={type === a.key ? 'on' : ''} onClick={() => setType(a.key)}>{a.label.replace(' Placement', '')}</button>)}</div>
              {type !== 'text' && <Field label="Image or logo (PNG, JPG, SVG, WebP)"><input type="file" accept="image/*" onChange={(e) => setImg(e.target.files?.[0] || null)} /></Field>}
              {type !== 'image' && <Field label="Advertising text"><input maxLength={90} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Get 20% off with code YOUTOK" /></Field>}
            </div>
            <div className="glass pane">
              <h4>2 · Style</h4>
              <div className="row3">
                {type !== 'image' && <Field label="Text"><input type="color" value={style.color} onChange={(e) => setStyle({ ...style, color: e.target.value })} /></Field>}
                {type !== 'image' && <Field label="Background"><input type="color" value={style.bg.startsWith('#') ? style.bg : '#10111b'} onChange={(e) => setStyle({ ...style, bg: e.target.value })} /></Field>}
                <Field label={`Opacity ${Math.round(style.opacity * 100)}%`}><input type="range" min={0.3} max={1} step={0.05} value={style.opacity} onChange={(e) => setStyle({ ...style, opacity: +e.target.value })} /></Field>
              </div>
              {type !== 'image' && <div className="row3">
                <Field label={`Size ${style.size}`}><input type="range" min={12} max={48} value={style.size} onChange={(e) => setStyle({ ...style, size: +e.target.value })} /></Field>
                <Field label="Weight"><select value={style.weight} onChange={(e) => setStyle({ ...style, weight: +e.target.value })}><option value={500}>Regular</option><option value={700}>Bold</option><option value={800}>Heavy</option></select></Field>
                <Field label={`Radius ${style.radius}`}><input type="range" min={0} max={40} value={style.radius} onChange={(e) => setStyle({ ...style, radius: +e.target.value })} /></Field>
              </div>}
              <p className="muted small">Drag the card to move it, drag the corner to resize. Allowed zones: {zones.map((z) => ZONES[z].label).join(', ')}.</p>
            </div>
            <div className="glass pane">
              <h4>3 · Offer</h4>
              <Field label={`Your offer (${SYMBOL})`}><input type="number" min="0" value={offer} onChange={(e) => setOffer(e.target.value)} /></Field>
              <Field label="Campaign">
                <select value={campId} onChange={(e) => setCampId(e.target.value)}><option value="">+ New campaign</option>{mine.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              </Field>
              {!campId && <Field label="New campaign name"><input value={campName} onChange={(e) => setCampName(e.target.value)} placeholder="e.g. Winter launch" /></Field>}
              <Field label="Landing link (optional)"><input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" /></Field>
              <Field label="Message to creator (optional)"><textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
              {err && <p className="err">{err}</p>}
              <button className="btn block" disabled={busy} onClick={submit}><Icon d={I.send} size={16} />{user ? 'Submit ad request' : 'Sign in to submit'}</button>
            </div>
          </div>
        </div>
      </section>
    </Page>
  )
}
