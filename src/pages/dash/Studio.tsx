import { useState } from 'react'
import cfg from '../../config/config.json'
import { db, uid, AdType, Video } from '../../lib/db'
import { useAuth } from '../../lib/auth'
import { useTable, go } from '../../lib/hooks'
import { probeVideo } from '../../lib/media'
import { AD_TYPES, ago, CATEGORIES, dur, fmt, SYMBOL, tok, ZONES, ZONE_KEYS } from '../../lib/constants'
import { DashShell, NavItem } from '../../components/Layout'
import { Avatar, Thumb, useObjectUrl } from '../../components/Media'
import { Badge, Empty, Field, Icon, I, Modal, Progress, Stat } from '../../components/ui'
import { DailyBars, HBars, PlacementRow, PricingForm, ProfileForm, PublishButton, setStatus, TxTable, price } from './shared'

export default function Studio({ tab = 'overview' }: { tab?: string }) {
  const { user } = useAuth()
  const videos = useTable('videos'), pls = useTable('placements'), users = useTable('users'), txs = useTable('transactions'), reqs = useTable('requests')
  if (!user) return null
  const me = user.id
  const myVideos = videos.rows.filter((v) => v.creatorId === me).sort((a, b) => b.createdAt - a.createdAt)
  const myPl = pls.rows.filter((p) => p.creatorId === me).sort((a, b) => b.updatedAt - a.updatedAt)
  const myReq = reqs.rows.filter((r) => r.creatorId === me).sort((a, b) => b.updatedAt - a.updatedAt)
  const wallets = [user.wallets.evm, user.wallets.sol].filter(Boolean) as string[]
  const myTx = txs.rows.filter((t) => myPl.some((p) => p.id === t.placementId))
  const earned = myTx.reduce((s, t) => s + t.amount, 0)
  const pending = myPl.filter((p) => p.status === 'pending').length + myReq.filter((r) => r.status === 'open').length
  const views = myVideos.reduce((s, v) => s + v.views, 0)
  const vById = (id: string) => videos.rows.find((v) => v.id === id)
  const uById = (id: string) => users.rows.find((u) => u.id === id)

  const items: NavItem[] = [
    { key: 'overview', label: 'Overview', icon: I.grid }, { key: 'videos', label: 'My videos', icon: I.video, count: myVideos.length },
    { key: 'upload', label: 'Upload video', icon: I.upload }, { key: 'requests', label: 'Ad requests', icon: I.inbox, count: pending },
    { key: 'pricing', label: 'Pricing & zones', icon: I.tag }, { key: 'campaigns', label: 'Campaign history', icon: I.layers },
    { key: 'payments', label: 'Payments', icon: I.wallet }, { key: 'analytics', label: 'Analytics', icon: I.chart }, { key: 'profile', label: 'Profile', icon: I.user },
  ]
  const todo = [
    [!user.wallets.evm && !user.wallets.sol, 'Link a wallet to receive ' + SYMBOL, 'profile'],
    [!user.pricing.image && !user.pricing.text && !user.pricing.combo, 'Set your ad prices', 'pricing'],
    [!myVideos.length, 'Upload your first video', 'upload'],
    [!user.bio, 'Write a short bio', 'profile'],
    [pending > 0, `Answer ${pending} pending request${pending > 1 ? 's' : ''}`, 'requests'],
    [myPl.some((p) => p.status === 'approved'), 'Publish approved ads', 'requests'],
  ].filter((x) => x[0]) as [boolean, string, string][]
  const feed = myPl.flatMap((p) => p.history.map((h) => ({ ...h, p }))).sort((a, b) => b.at - a.at).slice(0, 6)

  const aside = <>
    <div className="glass pane">
      <h4>Activity feed</h4>
      {feed.length ? <ul className="feed">{feed.map((f, i) => <li key={i}><Badge s={f.action} /><span className="clamp1">{vById(f.p.videoId)?.title}</span><em>{ago(f.at)}</em></li>)}</ul> : <p className="muted small">No activity yet.</p>}
    </div>
    <div className="glass pane">
      <h4>To do</h4>
      {todo.length ? <ul className="todo">{todo.map(([, t, k]) => <li key={t}><a href={`#/studio/${k}`}><Icon d={I.check} size={14} />{t}</a></li>)}</ul> : <p className="muted small">All set 🎉</p>}
    </div>
  </>

  const title = items.find((i) => i.key === tab)?.label || 'Overview'
  return (
    <DashShell base="#/studio" title={tab === 'overview' ? 'Creator Studio' : title} crumbs={['Creator', title]} items={items} tab={tab} aside={tab === 'overview' ? aside : undefined}
      stats={<span className="bal"><small>Earned</small><b>{tok(earned)}</b></span>}>
      {tab === 'overview' && <>
        <div className="stats-row">
          <Stat value={fmt(earned, 2)} label={`Total earned (${SYMBOL})`} icon={I.wallet} />
          <Stat value={fmt(views)} label="Video views" icon={I.eye} />
          <Stat value={fmt(myPl.filter((p) => p.status === 'published' || p.status === 'paid').length)} label="Ads live" icon={I.bolt} />
          <Stat value={fmt(pending)} label="Pending requests" icon={I.inbox} />
        </div>
        <div className="sec-head row"><h3>Latest ad requests</h3><a className="btn ghost sm" href="#/studio/requests">View all</a></div>
        {myPl.length ? myPl.slice(0, 5).map((p) => <PlacementRow key={p.id} p={p} v={vById(p.videoId)} other={uById(p.advertiserId)}><CreatorActions p={p} v={vById(p.videoId)} /></PlacementRow>)
          : <Empty title="No requests yet" text="Upload videos and set prices — advertisers will find you in the marketplace." action={<a className="btn" href="#/studio/upload">Upload video</a>} />}
        <DailyBars label={`Earnings (${SYMBOL})`} points={myTx.map((t) => ({ at: t.createdAt, v: t.amount }))} />
      </>}

      {tab === 'videos' && (myVideos.length ? <div className="vlist">{myVideos.map((v) => <VideoRow key={v.id} v={v} />)}</div>
        : <Empty title="No videos yet" action={<a className="btn" href="#/studio/upload">Upload video</a>} />)}

      {tab === 'upload' && <Upload />}

      {tab === 'requests' && <>
        <h3>In-video ad requests</h3>
        {myPl.filter((p) => !['paid', 'rejected', 'cancelled'].includes(p.status)).length
          ? myPl.filter((p) => !['paid', 'rejected', 'cancelled'].includes(p.status)).map((p) => <PlacementRow key={p.id} p={p} v={vById(p.videoId)} other={uById(p.advertiserId)}><CreatorActions p={p} v={vById(p.videoId)} /></PlacementRow>)
          : <Empty title="No open ad requests" />}
        <h3 className="mt">Collaboration requests</h3>
        {myReq.length ? myReq.map((r) => <CollabRow key={r.id} r={r} adv={uById(r.advertiserId)} />) : <Empty title="No collaboration requests" text="Advertisers can hire you for full campaigns from your profile." />}
      </>}

      {tab === 'pricing' && <PricingForm />}

      {tab === 'campaigns' && (myPl.length ? myPl.map((p) => <PlacementRow key={p.id} p={p} v={vById(p.videoId)} other={uById(p.advertiserId)} />) : <Empty title="No campaigns yet" />)}

      {tab === 'payments' && <>
        <div className="stats-row"><Stat value={fmt(earned, 2)} label={`Received (${SYMBOL})`} /><Stat value={fmt(myPl.filter((p) => p.status === 'published').reduce((s, p) => s + price(p), 0), 2)} label="Awaiting payment" /><Stat value={myTx.length} label="Transactions" /></div>
        <TxTable rows={myTx} me={wallets} />
      </>}

      {tab === 'analytics' && <>
        <div className="stats-row">
          <Stat value={fmt(views)} label="Total views" /><Stat value={fmt(myVideos.reduce((s, v) => s + v.likes, 0))} label="Likes" />
          <Stat value={views ? ((myVideos.reduce((s, v) => s + v.likes, 0) / views) * 100).toFixed(1) + '%' : '—'} label="Engagement" />
          <Stat value={fmt(myPl.reduce((s, p) => s + p.adViews, 0))} label="Ad views delivered" />
        </div>
        <div className="two-col">
          <HBars label="Views by video" rows={myVideos.map((v) => ({ name: v.title, v: v.views })).sort((a, b) => b.v - a.v).slice(0, 8)} />
          <HBars label={`Revenue by video (${SYMBOL})`} rows={myVideos.map((v) => ({ name: v.title, v: myTx.filter((t) => myPl.find((p) => p.id === t.placementId)?.videoId === v.id).reduce((s, t) => s + t.amount, 0) })).filter((r) => r.v).sort((a, b) => b.v - a.v)} />
        </div>
      </>}

      {tab === 'profile' && <ProfileForm />}
    </DashShell>
  )
}

function CreatorActions({ p, v }: { p: Parameters<typeof setStatus>[0]; v?: Video }) {
  const { user } = useAuth()
  const [quote, setQuote] = useState(false)
  const [amt, setAmt] = useState(String(p.offer))
  const [note, setNote] = useState('')
  const me = user!.id
  if (p.status === 'pending') return <>
    <button className="btn sm" onClick={() => setStatus(p, me, 'approved')}><Icon d={I.check} size={14} />Approve</button>
    <button className="btn ghost sm" onClick={() => setQuote(true)}>Quote</button>
    <button className="btn ghost sm danger" onClick={() => setStatus(p, me, 'rejected', {}, prompt('Reason (optional)') || undefined)}>Reject</button>
    <Modal open={quote} onClose={() => setQuote(false)} title="Send a quote">
      <Field label={`Your price (${SYMBOL})`}><input type="number" min="0" value={amt} onChange={(e) => setAmt(e.target.value)} /></Field>
      <Field label="Note"><textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <button className="btn block" onClick={async () => { await setStatus(p, me, 'quoted', { quote: Number(amt) }, note || `Quoted ${amt} ${SYMBOL}`); setQuote(false) }}>Send quote</button>
    </Modal>
  </>
  if (p.status === 'approved') return <PublishButton p={p} v={v} />
  return null
}

function CollabRow({ r, adv }: { r: import('../../lib/db').CollabRequest; adv?: import('../../lib/db').User }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState(String(r.budget || ''))
  const [reply, setReply] = useState('')
  return (
    <div className="prow glass">
      <Avatar u={adv} size={40} />
      <div className="prow-main"><b>{adv?.company || adv?.name || 'Advertiser'}</b><span className="muted small clamp2">{r.brief}</span></div>
      <div className="prow-price"><b>{tok(r.quote ?? r.budget)}</b>{r.deadline && <span className="muted small">by {r.deadline}</span>}</div>
      <Badge s={r.status} />
      <div className="prow-act">{r.status === 'open' && <><button className="btn sm" onClick={() => setOpen(true)}>Quote</button><button className="btn ghost sm danger" onClick={() => db.patch('requests', r.id, { status: 'declined', updatedAt: Date.now() })}>Decline</button></>}</div>
      <Modal open={open} onClose={() => setOpen(false)} title="Quote this campaign">
        <p className="muted small pre">{r.brief}</p>
        <Field label={`Quote (${SYMBOL})`}><input type="number" value={q} onChange={(e) => setQ(e.target.value)} /></Field>
        <Field label="Reply"><textarea rows={3} value={reply} onChange={(e) => setReply(e.target.value)} /></Field>
        <button className="btn block" onClick={async () => { await db.patch('requests', r.id, { quote: Number(q), reply, status: 'quoted', updatedAt: Date.now() }); setOpen(false) }}>Send quote</button>
      </Modal>
    </div>
  )
}

function VideoRow({ v }: { v: Video }) {
  const [edit, setEdit] = useState(false)
  const [f, setF] = useState(v)
  return (
    <div className="prow glass">
      <a className="prow-thumb" href={`#/video/${v.id}`}><Thumb v={v} /></a>
      <div className="prow-main"><b className="clamp1">{v.title}</b><span className="muted small">{v.category} · {dur(v.duration)} · {ago(v.createdAt)}</span>
        <span className="small"><Icon d={I.eye} size={13} /> {fmt(v.views)} · <Icon d={I.heart} size={13} /> {fmt(v.likes)}</span></div>
      <Badge s={v.adEnabled ? 'active' : 'draft'}>{v.adEnabled ? 'Ad-ready' : 'Ads off'}</Badge>
      <div className="prow-act">
        <button className="btn ghost sm" onClick={() => setEdit(true)}><Icon d={I.edit} size={14} />Edit</button>
        <button className="btn ghost sm danger" onClick={() => confirm('Delete this video?') && db.del('videos', v.id)}>Delete</button>
      </div>
      <Modal open={edit} onClose={() => setEdit(false)} title="Edit video">
        <VideoFields f={f} set={(p) => setF({ ...f, ...p })} />
        <button className="btn block" onClick={async () => { await db.put('videos', f); setEdit(false) }}>Save</button>
      </Modal>
    </div>
  )
}

function VideoFields({ f, set }: { f: Pick<Video, 'title' | 'description' | 'category' | 'adEnabled' | 'formats' | 'price' | 'zones'>; set: (p: Partial<Video>) => void }) {
  const toggle = (k: AdType) => set({ formats: f.formats.includes(k) ? f.formats.filter((x) => x !== k) : [...f.formats, k] })
  return <>
    <Field label="Title"><input maxLength={100} value={f.title} onChange={(e) => set({ title: e.target.value })} /></Field>
    <Field label="Description"><textarea rows={3} value={f.description} onChange={(e) => set({ description: e.target.value })} /></Field>
    <Field label="Category"><select value={f.category} onChange={(e) => set({ category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
    <label className="toggle"><input type="checkbox" checked={f.adEnabled} onChange={(e) => set({ adEnabled: e.target.checked })} />Open for ad placements</label>
    {f.adEnabled && <>
      <Field label="Formats & price override (0 = use default)">
        <div className="fmt-list">{AD_TYPES.map((a) => <div key={a.key}><label className="toggle"><input type="checkbox" checked={f.formats.includes(a.key)} onChange={() => toggle(a.key)} />{a.label}</label>
          <input type="number" min="0" placeholder={SYMBOL} value={f.price?.[a.key] ?? ''} onChange={(e) => set({ price: { ...f.price, [a.key]: e.target.value === '' ? undefined : Number(e.target.value) } })} /></div>)}</div>
      </Field>
      <Field label="Zones for this video (none = profile default)">
        <div className="chips">{ZONE_KEYS.map((k) => <button type="button" key={k} className={f.zones?.includes(k) ? 'on' : ''} onClick={() => set({ zones: f.zones?.includes(k) ? f.zones.filter((x) => x !== k) : [...(f.zones || []), k] })}>{ZONES[k].label}</button>)}</div>
      </Field>
    </>}
  </>
}

function Upload() {
  const { user } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [f, setF] = useState<Pick<Video, 'title' | 'description' | 'category' | 'adEnabled' | 'formats' | 'price' | 'zones'>>({ title: '', description: '', category: user?.category || 'Other', adEnabled: true, formats: ['image', 'text', 'combo'], price: {}, zones: [] })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const preview = useObjectUrl(file)
  const pick = (x?: File) => {
    setErr('')
    if (!x) return
    if (!x.type.startsWith('video/')) return setErr('Choose a video file (MP4, WebM, MOV).')
    if (x.size > cfg.maxVideoMB * 1048576) return setErr(`Max file size is ${cfg.maxVideoMB} MB.`)
    setFile(x); if (!f.title) setF({ ...f, title: x.name.replace(/\.[^.]+$/, '') })
  }
  const save = async () => {
    if (!file || !user) return setErr('Choose a video first.')
    if (!f.title.trim()) return setErr('Add a title.')
    if (f.adEnabled && !f.formats.length) return setErr('Enable at least one ad format.')
    setBusy(true)
    try {
      const meta = await probeVideo(file)
      const [blobId, thumbId] = await Promise.all([db.putBlob(file), db.putBlob(meta.thumb)])
      const v: Video = { id: uid(), creatorId: user.id, ...f, title: f.title.trim(), blobId, thumbId, duration: meta.duration, width: meta.width, height: meta.height, views: 0, likes: 0, createdAt: Date.now() }
      await db.put('videos', v)
      go('/studio/videos')
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }
  return (
    <div className="form-grid">
      <div className="glass pane">
        <h4>Video file</h4>
        <label className={`drop${file ? ' has' : ''}`} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files[0]) }}>
          <Icon d={I.upload} size={28} />
          <b>{file ? file.name : 'Drop a video here or click to browse'}</b>
          <span className="muted small">{file ? `${(file.size / 1048576).toFixed(1)} MB` : `MP4 / WebM / MOV · up to ${cfg.maxVideoMB} MB`}</span>
          <input hidden type="file" accept="video/*" onChange={(e) => pick(e.target.files?.[0])} />
        </label>
        {file && <video className="mt" src={preview} controls style={{ width: '100%', borderRadius: 12 }} />}
      </div>
      <div className="glass pane">
        <h4>Details & ad settings</h4>
        <VideoFields f={f} set={(p) => setF({ ...f, ...p })} />
        {err && <p className="err">{err}</p>}
        {busy && <Progress value={60} />}
        <button className="btn block" disabled={busy} onClick={save}>{busy ? 'Processing…' : 'Upload video'}</button>
      </div>
    </div>
  )
}
