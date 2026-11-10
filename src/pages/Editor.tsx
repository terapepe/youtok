import { useEffect, useRef, useState } from 'react'
import { useBlobUrl, useMarket, useTable, go, query } from '../lib/hooks'
import { db, uid, AdType, Booking, OverlayStyle, Position, ZoneKey } from '../lib/db'
import { useAuth } from '../lib/auth'
import { windowOf } from '../lib/media'
import { AD_CATEGORIES, dateLabel, isLive, lengthOf, posLabel, SYMBOL, termLabel, tok, typeOf, ZONES } from '../lib/constants'
import { Page } from '../components/Layout'
import { AdOverlay, Avatar, MockFrame, PlatformStack, useObjectUrl } from '../components/Media'
import { Empty, Field, Icon, I } from '../components/ui'

const STYLE: OverlayStyle = { color: '#FFFFFF', bg: '#10111B', size: 22, weight: 700, radius: 12, opacity: 0.92 }
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
export const inZone = (b: { x: number; y: number; w: number; h: number }, zs: ZoneKey[]) =>
  zs.some((k) => { const z = ZONES[k]; return b.x >= z.x - 0.5 && b.y >= z.y - 0.5 && b.x + b.w <= z.x + z.w + 0.5 && b.y + b.h <= z.y + z.h + 0.5 })

export default function Editor({ slotId }: { slotId?: string }) {
  const { user } = useAuth()
  const m = useMarket()
  const camps = useTable('campaigns')
  const s = m.slots.find((x) => x.id === slotId)
  const creator = m.users.find((u) => u.id === s?.creatorId)
  const sample = m.videos.find((v) => v.id === s?.sampleVideoId)
  const src = useBlobUrl(sample?.blobId)

  const [type, setType] = useState<AdType>('combo')
  const [position, setPosition] = useState<Position>('mid')
  const [adCategory, setAdCategory] = useState('')
  const [img, setImg] = useState<File | null>(null)
  const imgUrl = useObjectUrl(img)
  const [text, setText] = useState('')
  const [script, setScript] = useState('')
  const [style, setStyle] = useState(STYLE)
  const [box, setBox] = useState({ x: 52, y: 64, w: 44, h: 16 })
  const [showFor, setShowFor] = useState(8)
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

  useEffect(() => {
    if (!s) return
    const first = s.formats.find((f) => f.type === 'combo') || s.formats[0]
    if (first) setType(first.type)
    setPosition(s.positions.includes('mid') ? 'mid' : s.positions[0] || 'intro')
    const z = ZONES[s.zones.includes('br') ? 'br' : s.zones[0] || 'br']
    setBox({ x: z.x + 2, y: z.y + z.h - (s.orientation === 'portrait' ? 12 : 20), w: Math.min(z.w - 4, s.orientation === 'portrait' ? 46 : 44), h: s.orientation === 'portrait' ? 9 : 16 })
    setShowFor(Math.min(8, lengthOf(s.length).sec))
  }, [s?.id])
  useEffect(() => { const p = s?.formats.find((f) => f.type === type)?.price; if (p) setOffer(String(p)) }, [type, s?.id])

  const drag = (mode: 'move' | 'size') => (e: React.PointerEvent) => {
    e.preventDefault()
    const r = stage.current!.getBoundingClientRect(), sx = e.clientX, sy = e.clientY, b0 = { ...box }
    const mv = (ev: PointerEvent) => {
      const dx = ((ev.clientX - sx) / r.width) * 100, dy = ((ev.clientY - sy) / r.height) * 100
      setBox(mode === 'move'
        ? { ...b0, x: clamp(b0.x + dx, 0, 100 - b0.w), y: clamp(b0.y + dy, 0, 100 - b0.h) }
        : { ...b0, w: clamp(b0.w + dx, 6, 100 - b0.x), h: clamp(b0.h + dy, 4, 100 - b0.y) })
    }
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up) }
    addEventListener('pointermove', mv); addEventListener('pointerup', up)
  }

  if (!m.ready) return <Page><Empty title="Loading…" /></Page>
  if (s?.sample) return <Page><Empty title="Sample slot" text="This slot belongs to a fictional sample profile and cannot be booked." action={<a className="btn" href="#/slots">Browse ad slots</a>} /></Page>
  if (!s) return <Page><Empty title="Ad slot not found" action={<a className="btn" href="#/slots">Browse ad slots</a>} /></Page>

  const meta = typeOf(type)
  const listed = s.formats.find((f) => f.type === type)?.price || 0
  const overlay = meta.overlay
  const sec = lengthOf(s.length).sec
  const win = windowOf(position, sample?.duration || sec, showFor)
  const visible = !preview || !src || (t >= win.start && t <= win.end)
  const placed = !overlay || inZone(box, s.zones)
  const mine = camps.rows.filter((c) => c.advertiserId === user?.id)
  const live = isLive(s, m.bookings)
  const already = user && m.bookings.some((b) => b.slotId === s.id && b.advertiserId === user.id && ['requested', 'countered', 'accepted', 'delivered', 'revision'].includes(b.status))
  const blocked = !!adCategory && s.blocked.includes(adCategory)

  const submit = async () => {
    setErr('')
    if (!user) return go(`/auth?role=advertiser&next=${encodeURIComponent('/book/' + s.id)}`)
    if (user.role !== 'advertiser') return setErr('Only advertiser accounts can book slots. Switch role in your profile.')
    if (user.id === s.creatorId) return setErr('You cannot book your own slot.')
    if (!live) return setErr('This slot is no longer available.')
    if (already) return setErr('You already have an active booking on this slot. Open it from your dashboard.')
    if (!adCategory) return setErr('Choose your ad category.')
    if (blocked) return setErr(`${creator?.name} does not accept ${adCategory} ads on this slot.`)
    if ((type === 'image' || type === 'combo') && !img) return setErr('Upload your logo or image.')
    if ((type === 'text' || type === 'combo') && !text.trim()) return setErr('Enter the overlay text.')
    if ((type === 'mention' || type === 'segment') && script.trim().length < 10) return setErr('Write the script or key points (at least 10 characters).')
    if (type === 'link' && !/^https?:\/\//.test(link.trim())) return setErr('Enter the link to place (https://…).')
    if (!placed) return setErr('Move the overlay fully inside one of the allowed zones.')
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
      const imageId = img && type !== 'text' && type !== 'link' ? await db.putBlob(img) : undefined
      const now = Date.now()
      const b: Booking = {
        id: uid(), slotId: s.id, creatorId: s.creatorId, advertiserId: user.id, campaignId: cid, type, position, adCategory,
        imageId, text: ['text', 'combo'].includes(type) ? text.trim() : undefined, script: ['mention', 'segment'].includes(type) ? script.trim() : undefined,
        link: link.trim() || undefined, style, ...box, showFor, offer: amount, status: 'requested', due: s.publishBy,
        deliveries: [], messages: note.trim() ? [{ by: user.id, text: note.trim(), at: now }] : [],
        history: [{ at: now, by: user.id, action: 'requested', note: amount !== listed ? `Offer ${amount} ${SYMBOL} (listed ${listed})` : undefined }],
        reviews: {}, createdAt: now, updatedAt: now,
      }
      await db.put('bookings', b)
      go('/brand/bookings')
    } finally { setBusy(false) }
  }

  return (
    <Page>
      <section className="editor">
        <div className="ed-head">
          <div><span className="eyebrow">Book an ad slot</span><h2>{s.title}</h2>
            <div className="row-g"><PlatformStack list={s.platforms} size={20} /><span className="len-pill">{lengthOf(s.length).label}</span><span className="muted small">Publish by {dateLabel(s.publishBy)} · {termLabel(s.payTerms)}</span></div></div>
          {creator && <a className="glass vd-creator" href={`#/creator/${creator.id}`}><Avatar u={creator} size={38} /><div><b>{creator.name}</b><span className="muted small">@{creator.handle}</span></div></a>}
        </div>
        {!live && <p className="err">This slot is not available for new bookings.</p>}
        <div className="ed-grid">
          <div className="ed-stage-wrap">
            {overlay ? <>
              <div className={`ed-stage ${s.orientation}`} ref={stage}>
                {src ? <video ref={vid} src={src} playsInline onTimeUpdate={() => setT(vid.current?.currentTime ?? 0)} /> : <MockFrame portrait={s.orientation === 'portrait'} />}
                {!preview && s.zones.map((k) => { const z = ZONES[k]; return <div key={k} className="zone" style={{ left: `${z.x}%`, top: `${z.y}%`, width: `${z.w}%`, height: `${z.h}%` }}><span>{z.label}</span></div> })}
                <AdOverlay p={{ type, text, style, ...box }} imageUrl={imgUrl} visible={visible} selected={!preview} onPointerDown={preview ? undefined : drag('move')} onResize={preview ? undefined : drag('size')} />
              </div>
              <div className="ed-controls glass">
                {src && <button className="btn sm" onClick={() => { const el = vid.current!; el.currentTime = win.start; el.play(); setPreview(true) }}><Icon d={I.play} size={14} />Play ad window</button>}
                <label className="toggle"><input type="checkbox" checked={preview} onChange={(e) => setPreview(e.target.checked)} />Preview mode</label>
                <span className="grow" /><span className={`badge ${placed ? 'ok' : 'bad'}`}>{placed ? 'Inside allowed zone' : 'Outside allowed zones'}</span>
              </div>
              <p className="muted small">{src ? 'Preview on the creator\'s sample video.' : 'The video is not filmed yet. This frame shows where your overlay will sit.'} Drag to move, drag the corner to resize.</p>
            </> : (
              <div className="glass pane script-view">
                <Icon d={type === 'link' ? I.link : I.chat} size={30} />
                <h3>{meta.label}</h3><p className="muted">{meta.desc}. Position: <b>{posLabel(position)}</b>.</p>
                {type !== 'link' ? <blockquote>{script || 'Your script or key points will appear here…'}</blockquote> : <blockquote>{text || 'Description text'}<br /><a>{link || 'https://…'}</a></blockquote>}
              </div>
            )}
            <div className="glass pane mt">
              <h4>Slot rules</h4>
              <ul className="kv">
                <li><span>Video</span><b>{lengthOf(s.length).label} · {s.orientation === 'portrait' ? 'vertical' : 'landscape'} · {s.language}</b></li>
                <li><span>Positions offered</span><b>{s.positions.map(posLabel).join(', ')}</b></li>
                <li><span>Not accepted</span><b>{s.blocked.join(', ') || 'No restrictions'}</b></li>
                <li><span>Payment</span><b>{termLabel(s.payTerms)}</b></li>
              </ul>
            </div>
          </div>

          <div className="ed-panel">
            <div className="glass pane">
              <h4>1 · Format & position</h4>
              <div className="fmt-pick">{s.formats.map((f) => <button key={f.type} className={type === f.type ? 'on' : ''} onClick={() => setType(f.type)}><b>{typeOf(f.type).label}</b><span>{tok(f.price)}</span></button>)}</div>
              <Field label="Position in the video"><div className="seg">{s.positions.map((p) => <button key={p} className={position === p ? 'on' : ''} onClick={() => setPosition(p)}>{posLabel(p)}</button>)}</div></Field>
              <Field label="Your ad category"><select value={adCategory} onChange={(e) => setAdCategory(e.target.value)}><option value="">Choose…</option>{AD_CATEGORIES.map((c) => <option key={c} disabled={s.blocked.includes(c)}>{c}{s.blocked.includes(c) ? ' (not accepted)' : ''}</option>)}</select></Field>
            </div>
            <div className="glass pane">
              <h4>2 · Creative</h4>
              {(type === 'image' || type === 'combo' || type === 'segment') && <Field label={type === 'segment' ? 'Brand assets / product image (optional)' : 'Logo or image'}><input type="file" accept="image/*" onChange={(e) => setImg(e.target.files?.[0] || null)} /></Field>}
              {(type === 'text' || type === 'combo' || type === 'link') && <Field label={type === 'link' ? 'Description text' : 'Overlay text'}><input maxLength={type === 'link' ? 200 : 90} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Get 20% off with code LIP20" /></Field>}
              {(type === 'mention' || type === 'segment') && <Field label="Script / key points"><textarea rows={4} value={script} onChange={(e) => setScript(e.target.value)} placeholder="What should the creator say? Key messages, must-say phrases, do's and don'ts…" /></Field>}
              <Field label={type === 'link' ? 'Link' : 'Landing link (optional)'}><input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" /></Field>
              {overlay && <>
                <Field label={`On screen for ${showFor}s`}><input type="range" min={2} max={Math.min(60, sec)} value={showFor} onChange={(e) => setShowFor(+e.target.value)} /></Field>
                <div className="row3">
                  {type !== 'image' && <Field label="Text"><input type="color" value={style.color} onChange={(e) => setStyle({ ...style, color: e.target.value })} /></Field>}
                  {type !== 'image' && <Field label="Background"><input type="color" value={style.bg} onChange={(e) => setStyle({ ...style, bg: e.target.value })} /></Field>}
                  <Field label={`Opacity ${Math.round(style.opacity * 100)}%`}><input type="range" min={0.3} max={1} step={0.05} value={style.opacity} onChange={(e) => setStyle({ ...style, opacity: +e.target.value })} /></Field>
                </div>
                {type !== 'image' && <div className="row3">
                  <Field label={`Size ${style.size}`}><input type="range" min={12} max={48} value={style.size} onChange={(e) => setStyle({ ...style, size: +e.target.value })} /></Field>
                  <Field label="Weight"><select value={style.weight} onChange={(e) => setStyle({ ...style, weight: +e.target.value })}><option value={500}>Regular</option><option value={700}>Bold</option><option value={800}>Heavy</option></select></Field>
                  <Field label={`Radius ${style.radius}`}><input type="range" min={0} max={40} value={style.radius} onChange={(e) => setStyle({ ...style, radius: +e.target.value })} /></Field>
                </div>}
              </>}
            </div>
            <div className="glass pane">
              <h4>3 · Offer</h4>
              <Field label={`Your offer (${SYMBOL})`} hint={`Listed price: ${tok(listed)}. A different amount is sent as an offer the creator can accept or counter.`}><input type="number" min="0" value={offer} onChange={(e) => setOffer(e.target.value)} /></Field>
              <Field label="Campaign"><select value={campId} onChange={(e) => setCampId(e.target.value)}><option value="">+ New campaign</option>{mine.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
              {!campId && <Field label="New campaign name"><input value={campName} onChange={(e) => setCampName(e.target.value)} placeholder="e.g. Token launch Q1" /></Field>}
              <Field label="Message to creator (optional)"><textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
              {blocked && <p className="err">This category is not accepted on this slot.</p>}
              {already && <p className="err">You already have an active booking on this slot.</p>}
              {err && <p className="err">{err}</p>}
              <button className="btn block" disabled={busy || !live} onClick={submit}><Icon d={I.send} size={16} />{user ? `Send booking · ${tok(Number(offer) || 0)}` : 'Sign in to book'}</button>
            </div>
          </div>
        </div>
      </section>
    </Page>
  )
}
