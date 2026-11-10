import { useState } from 'react'
import cfg from '../../config/config.json'
import { db, uid, AdType, PlatformKey, Slot, Video, CollabRequest, User } from '../../lib/db'
import { useAuth } from '../../lib/auth'
import { useTable, useMarket, go } from '../../lib/hooks'
import { probeVideo } from '../../lib/media'
import {
  AD_CATEGORIES, AD_TYPES, addDays, ago, CATEGORIES, dateLabel, fmt, isLive, LANGUAGES, LENGTHS, lengthOf, minPrice, normTag, overdue, PAY_TERMS,
  PLATFORMS, PLATFORM_KEYS, POSITIONS, priceOf, ratingOf, spotsLeft, spotsTaken, SYMBOL, TAG_SUGGESTIONS, today, tok, typeLabel, ZONES, ZONE_KEYS, followersOf,
} from '../../lib/constants'
import { DashShell, NavItem } from '../../components/Layout'
import { Avatar, PlatformBadge, PlatformStack, PortfolioCard, Stars } from '../../components/Media'
import { Badge, Empty, Field, Icon, I, Modal, Stat } from '../../components/ui'
import { BookingModal, BookingRow, ChannelsForm, DailyBars, HBars, ProfileForm, ReviewList, SlotThumb, TxTable } from './shared'

export default function Studio({ tab = 'overview', sub }: { tab?: string; sub?: string }) {
  const { user } = useAuth()
  const m = useMarket()
  const txs = useTable('transactions'), reqs = useTable('requests')
  const [openId, setOpenId] = useState('')
  if (!user) return null
  const me = user.id
  const mySlots = m.slots.filter((s) => s.creatorId === me).sort((a, b) => b.createdAt - a.createdAt)
  const myBk = m.bookings.filter((b) => b.creatorId === me).sort((a, b) => b.updatedAt - a.updatedAt)
  const myVideos = m.videos.filter((v) => v.creatorId === me).sort((a, b) => b.createdAt - a.createdAt)
  const myReq = reqs.rows.filter((r) => r.creatorId === me).sort((a, b) => b.updatedAt - a.updatedAt)
  const myTx = txs.rows.filter((t) => myBk.some((b) => b.id === t.bookingId))
  const earned = myTx.reduce((s, t) => s + t.amount, 0)
  const slotOf = (id: string) => m.slots.find((s) => s.id === id)
  const uById = (id: string) => m.users.find((u) => u.id === id)
  const needs = myBk.filter((b) => b.status === 'requested' || ((b.status === 'accepted' || b.status === 'revision') && !b.extension) || (b.cancelBy && b.cancelBy !== me) || (b.status === 'disputed' && b.dispute?.by !== me))
  const r = ratingOf(me, m.bookings)
  const open = myBk.find((b) => b.id === openId)

  const items: NavItem[] = [
    { key: 'overview', label: 'Overview', icon: I.grid }, { key: 'channels', label: 'Channels', icon: I.link, count: user.channels.length ? 0 : 1 },
    { key: 'slots', label: 'Ad slots', icon: I.slot, count: mySlots.filter((s) => isLive(s, m.bookings)).length }, { key: 'bookings', label: 'Bookings', icon: I.inbox, count: needs.length },
    { key: 'portfolio', label: 'Portfolio', icon: I.video }, { key: 'requests', label: 'Custom requests', icon: I.send, count: myReq.filter((x) => x.status === 'open').length },
    { key: 'payments', label: 'Payments', icon: I.wallet }, { key: 'analytics', label: 'Analytics', icon: I.chart }, { key: 'reviews', label: 'Reviews', icon: I.star }, { key: 'profile', label: 'Profile', icon: I.user },
  ]
  const todo = ([
    [!user.channels.length, 'Link your first channel', 'channels'], [!mySlots.length, 'List your first ad slot', 'slots/new'],
    [!user.wallets.evm && !user.wallets.sol, 'Link a wallet to receive ' + SYMBOL, 'profile'], [!user.bio, 'Write a short bio', 'profile'],
    [!user.avatarId, 'Upload an avatar', 'profile'], [needs.length > 0, `${needs.length} booking(s) need your action`, 'bookings'],
    [myBk.some(overdue), 'You have overdue bookings', 'bookings'],
  ] as [boolean, string, string][]).filter((x) => x[0])
  const feed = myBk.flatMap((b) => b.history.map((h) => ({ ...h, b }))).sort((a, b) => b.at - a.at).slice(0, 7)
  const aside = <>
    <div className="glass pane"><h4>Activity</h4>{feed.length ? <ul className="feed">{feed.map((f, i) => <li key={i}><Badge s={f.action}>{f.action.replace(/_/g, ' ')}</Badge><span className="clamp1">{slotOf(f.b.slotId)?.title}</span><em>{ago(f.at)}</em></li>)}</ul> : <p className="muted small">No activity yet.</p>}</div>
    <div className="glass pane"><h4>To do</h4>{todo.length ? <ul className="todo">{todo.map(([, t, k]) => <li key={t}><a href={`#/studio/${k}`}><Icon d={I.check} size={14} />{t}</a></li>)}</ul> : <p className="muted small">All set 🎉</p>}</div>
  </>

  const title = items.find((i) => i.key === tab)?.label || 'Overview'
  const list = (rows: typeof myBk, empty: string) => rows.length ? rows.map((b) => <BookingRow key={b.id} b={b} slot={slotOf(b.slotId)} other={uById(b.advertiserId)} txs={txs.rows} onOpen={() => setOpenId(b.id)} />) : <Empty title={empty} />

  return (
    <DashShell base="#/studio" title={tab === 'overview' ? 'Creator Studio' : title} crumbs={['Creator', title]} items={items} tab={tab} aside={tab === 'overview' ? aside : undefined}
      stats={<span className="bal"><small>Earned</small><b>{tok(earned)}</b></span>}>
      {tab === 'overview' && <>
        <div className="stats-row">
          <Stat value={fmt(earned, 2)} label={`Earned (${SYMBOL})`} icon={I.wallet} />
          <Stat value={fmt(followersOf(user))} label={`Followers · ${user.channels.length} channels`} icon={I.users} />
          <Stat value={mySlots.filter((s) => isLive(s, m.bookings)).length} label="Open ad slots" icon={I.slot} />
          <Stat value={r.count ? r.avg.toFixed(1) + ' ★' : '—'} label={`${r.count} reviews`} icon={I.star} />
        </div>
        {!user.channels.length && <div className="note">Start here: <a href="#/studio/channels">link your channels</a>, then <a href="#/studio/slots/new">list an ad slot</a> for a video you are about to make.</div>}
        <div className="sec-head row"><h3>Needs your action</h3><a className="btn ghost sm" href="#/studio/bookings">All bookings</a></div>
        {list(needs.slice(0, 5), 'Nothing waiting on you')}
        <DailyBars label={`Earnings (${SYMBOL})`} points={myTx.map((t) => ({ at: t.createdAt, v: t.amount }))} />
      </>}

      {tab === 'channels' && <ChannelsForm />}

      {tab === 'slots' && (sub ? <SlotForm key={sub} slot={sub === 'new' ? undefined : mySlots.find((s) => s.id === sub)} videos={myVideos} /> : <>
        <div className="sec-head row"><p className="muted">An ad slot is a video you will make. Brands book it before you film.</p><a className="btn" href="#/studio/slots/new"><Icon d={I.plus} size={16} />New ad slot</a></div>
        {mySlots.length ? mySlots.map((s) => {
          const taken = spotsTaken(s, m.bookings), pend = m.bookings.filter((b) => b.slotId === s.id && b.status === 'requested').length
          const live = isLive(s, m.bookings)
          return (
            <div key={s.id} className="prow glass">
              <SlotThumb s={s} />
              <div className="prow-main"><a href={`#/slot/${s.id}`} className="clamp1"><b>{s.title}</b></a><span className="muted small">{s.tags.map((t) => '#' + t).join(' ')} · publish by {dateLabel(s.publishBy)}</span>
                <span className="small">{taken}/{s.exclusive ? 1 : s.spots} booked · {pend} pending · {fmt(s.views)} views</span></div>
              <div className="prow-price"><b>from {tok(minPrice(s))}</b></div>
              <div className="prow-badges"><Badge s={live ? 'active' : s.status}>{live ? 'live' : s.status === 'open' ? (spotsLeft(s, m.bookings) ? 'expired' : 'sold out') : s.status}</Badge></div>
              <div className="prow-act">
                <a className="btn ghost sm" href={`#/studio/slots/${s.id}`}><Icon d={I.edit} size={14} />Edit</a>
                <button className="btn ghost sm" onClick={() => db.patch('slots', s.id, { status: s.status === 'open' ? 'paused' : 'open', updatedAt: Date.now() })}>{s.status === 'open' ? 'Pause' : 'Reopen'}</button>
                <button className="btn ghost sm" onClick={async () => { const id = uid(); await db.put('slots', { ...s, id, title: s.title + ' (copy)', publishBy: addDays(14), views: 0, status: 'paused', createdAt: Date.now(), updatedAt: Date.now() }); go('/studio/slots/' + id) }}>Duplicate</button>
                <button className="btn ghost sm danger" onClick={() => (taken || pend) ? db.patch('slots', s.id, { status: 'closed', updatedAt: Date.now() }) : confirm('Delete this ad slot?') && db.del('slots', s.id)}>{taken || pend ? 'Close' : 'Delete'}</button>
              </div>
            </div>
          )
        }) : <Empty title="No ad slots yet" text="List the next video you plan to make: length, platforms, tags and your price." action={<a className="btn" href="#/studio/slots/new">New ad slot</a>} />}
      </>)}

      {tab === 'bookings' && <>
        <h3>Waiting for you</h3>{list(needs, 'Nothing waiting on you')}
        <h3 className="mt">In progress</h3>{list(myBk.filter((b) => ['accepted', 'delivered', 'countered', 'revision', 'disputed'].includes(b.status) && !needs.includes(b)), 'No bookings in progress')}
        <h3 className="mt">Finished</h3>{list(myBk.filter((b) => ['completed', 'declined', 'cancelled'].includes(b.status)), 'No finished bookings yet')}
      </>}

      {tab === 'portfolio' && <Portfolio videos={myVideos} />}

      {tab === 'requests' && (myReq.length ? myReq.map((x) => <CollabRow key={x.id} r={x} adv={uById(x.advertiserId)} />) : <Empty title="No custom requests" text="Advertisers can send you custom briefs from your profile." />)}

      {tab === 'payments' && <>
        <div className="stats-row"><Stat value={fmt(earned, 2)} label={`Received (${SYMBOL})`} /><Stat value={fmt(Math.max(0, myBk.filter((b) => b.status === 'completed').reduce((s, b) => s + priceOf(b), 0) - earned), 2)} label="Outstanding on completed deals" /><Stat value={myTx.length} label="Transactions" /></div>
        <TxTable rows={myTx} me={[user.wallets.evm, user.wallets.sol].filter(Boolean) as string[]} />
      </>}

      {tab === 'analytics' && <>
        <div className="stats-row">
          <Stat value={myBk.filter((b) => b.status === 'completed').length} label="Completed deals" />
          <Stat value={myBk.length ? Math.round((myBk.filter((b) => !['requested', 'declined'].includes(b.status)).length / myBk.length) * 100) + '%' : '—'} label="Acceptance rate" />
          <Stat value={fmt(mySlots.reduce((s, x) => s + x.views, 0))} label="Slot page views" />
          <Stat value={fmt(myBk.flatMap((b) => b.deliveries).reduce((s, d) => s + (d.views || 0), 0))} label="Sponsored video views" />
        </div>
        <div className="two-col">
          <HBars label={`Revenue by ad format (${SYMBOL})`} rows={AD_TYPES.map((a) => ({ name: a.label, v: myTx.filter((t) => myBk.find((b) => b.id === t.bookingId)?.type === a.key).reduce((s, t) => s + t.amount, 0) })).filter((x) => x.v)} />
          <HBars label="Bookings by video length" rows={LENGTHS.map((l) => ({ name: l.label, v: myBk.filter((b) => slotOf(b.slotId)?.length === l.key && !['declined', 'cancelled'].includes(b.status)).length })).filter((x) => x.v)} />
          <HBars label="Slot views" rows={mySlots.map((s) => ({ name: s.title, v: s.views })).sort((a, b) => b.v - a.v).slice(0, 8)} />
          <DailyBars label={`Earnings (${SYMBOL})`} points={myTx.map((t) => ({ at: t.createdAt, v: t.amount }))} />
        </div>
      </>}

      {tab === 'reviews' && <><div className="row-g mb"><Stars value={r.avg} count={r.count} /></div>
        <ReviewList items={myBk.filter((b) => b.reviews.adv).map((b) => ({ who: uById(b.advertiserId), r: b.reviews.adv!, label: typeLabel(b.type) }))} /></>}

      {tab === 'profile' && <ProfileForm />}

      {open && <BookingModal b={open} slot={slotOf(open.slotId)} creator={user} advertiser={uById(open.advertiserId)} txs={txs.rows} sample={m.videos.find((v) => v.id === slotOf(open.slotId)?.sampleVideoId)} onClose={() => setOpenId('')} />}
    </DashShell>
  )
}

function SlotForm({ slot, videos }: { slot?: Slot; videos: Video[] }) {
  const { user } = useAuth()
  const linked = [...new Set(user!.channels.map((c) => c.platform))]
  const [f, setF] = useState<Slot>(slot || {
    id: uid(), creatorId: user!.id, title: '', description: '', platforms: linked.slice(0, 1), length: '3m', orientation: linked[0] && PLATFORMS[linked[0]].vertical ? 'portrait' : 'landscape',
    category: user!.category || 'Other', tags: [], language: user!.language || 'English', formats: [{ type: 'combo', price: 0 }, { type: 'mention', price: 0 }],
    positions: ['intro', 'mid', 'outro'], zones: [...ZONE_KEYS], spots: 1, exclusive: false, publishBy: addDays(14), payTerms: 'delivery', blocked: [],
    status: 'open', views: 0, createdAt: Date.now(), updatedAt: Date.now(),
  })
  const [tag, setTag] = useState('')
  const [err, setErr] = useState('')
  const set = (p: Partial<Slot>) => setF({ ...f, ...p })
  const tg = <T,>(a: T[], v: T) => (a.includes(v) ? a.filter((x) => x !== v) : [...a, v])
  const addTag = (t: string) => { const n = normTag(t); if (n && !f.tags.includes(n) && f.tags.length < 10) set({ tags: [...f.tags, n] }); setTag('') }
  const fmtOf = (t: AdType) => f.formats.find((x) => x.type === t)
  const order = (t: AdType) => AD_TYPES.findIndex((x) => x.key === t)
  const setFmt = (t: AdType, on: boolean, price?: number) => set({ formats: on ? [...f.formats.filter((x) => x.type !== t), { type: t, price: price ?? fmtOf(t)?.price ?? 0 }].sort((a, b) => order(a.type) - order(b.type)) : f.formats.filter((x) => x.type !== t) })
  const hasOverlay = f.formats.some((x) => AD_TYPES.find((a) => a.key === x.type)!.overlay)
  const prices = f.formats.map((x) => x.price).filter((p) => p > 0)

  if (!linked.length) return <Empty title="Link a channel first" text="Ad slots are sold on the platforms you have linked." action={<a className="btn" href="#/studio/channels">Link channels</a>} />
  const save = async () => {
    setErr('')
    if (f.title.trim().length < 8) return setErr('Describe the planned video in the title (at least 8 characters).')
    if (!f.platforms.length) return setErr('Choose at least one platform.')
    if (f.platforms.some((p) => !linked.includes(p))) return setErr('You can only sell platforms you have linked.')
    if (!f.tags.length) return setErr('Add at least one content tag.')
    if (!f.formats.length) return setErr('Offer at least one ad format.')
    if (f.formats.some((x) => !(x.price > 0))) return setErr(`Set a ${SYMBOL} price for every format you offer.`)
    if (!f.positions.length) return setErr('Allow at least one ad position.')
    if (hasOverlay && !f.zones.length) return setErr('Allow at least one overlay zone.')
    if (!f.publishBy || f.publishBy < today()) return setErr('The publish date must be today or later.')
    if (f.spots < 1 || f.spots > 10) return setErr('Spots must be between 1 and 10.')
    await db.put('slots', { ...f, title: f.title.trim(), spots: f.exclusive ? 1 : f.spots, updatedAt: Date.now() })
    go('/studio/slots')
  }
  return (
    <div className="form-grid">
      <div className="glass pane">
        <h4>1 · The video you will make</h4>
        <Field label="Title / topic"><input maxLength={120} value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. I test 5 new DeFi apps so you don't have to" /></Field>
        <Field label="Description"><textarea rows={4} value={f.description} onChange={(e) => set({ description: e.target.value })} placeholder="What the video covers, audience, style, where the ad fits…" /></Field>
        <Field label="Video length"><div className="seg wrap">{LENGTHS.map((l) => <button key={l.key} className={f.length === l.key ? 'on' : ''} onClick={() => set({ length: l.key })}>{l.label}</button>)}</div></Field>
        <Field label="Platforms (from your linked channels)"><div className="pf-pick">{linked.map((p) => <button key={p} className={f.platforms.includes(p) ? 'on' : ''} onClick={() => { const pl = tg(f.platforms, p); set({ platforms: pl, orientation: pl.length && pl.every((x) => PLATFORMS[x].vertical) ? 'portrait' : f.orientation }) }}><PlatformBadge p={p} size={22} />{PLATFORMS[p].name}</button>)}</div></Field>
        <div className="row3">
          <Field label="Orientation"><select value={f.orientation} onChange={(e) => set({ orientation: e.target.value as Slot['orientation'] })}><option value="landscape">Landscape 16:9</option><option value="portrait">Vertical 9:16</option></select></Field>
          <Field label="Category"><select value={f.category} onChange={(e) => set({ category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Language"><select value={f.language} onChange={(e) => set({ language: e.target.value })}>{LANGUAGES.map((c) => <option key={c}>{c}</option>)}</select></Field>
        </div>
        <Field label={`Content tags (${f.tags.length}/10)`}>
          <div className="tag-input">{f.tags.map((t) => <span key={t}>#{t}<button onClick={() => set({ tags: f.tags.filter((x) => x !== t) })}>×</button></span>)}
            <input value={tag} onChange={(e) => setTag(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tag) } }} onBlur={() => tag && addTag(tag)} placeholder="type + Enter" /></div>
          <div className="tags mt">{TAG_SUGGESTIONS.filter((t) => !f.tags.includes(t)).slice(0, 12).map((t) => <button key={t} type="button" onClick={() => addTag(t)}>+{t}</button>)}</div>
        </Field>
        {videos.some((v) => v.blobId) && <Field label="Sample video for advertiser preview (optional)"><select value={f.sampleVideoId || ''} onChange={(e) => set({ sampleVideoId: e.target.value || undefined })}><option value="">None</option>{videos.filter((v) => v.blobId).map((v) => <option key={v.id} value={v.id}>{v.title}</option>)}</select></Field>}
      </div>

      <div className="glass pane">
        <h4>2 · Ad formats & your {SYMBOL} price</h4>
        <div className="fmt-list">{AD_TYPES.map((a) => { const cur = fmtOf(a.key); return (
          <div key={a.key} className={cur ? 'on' : ''}>
            <label className="toggle"><input type="checkbox" checked={!!cur} onChange={(e) => setFmt(a.key, e.target.checked)} /><span><b>{a.label}</b><small className="muted">{a.desc}</small></span></label>
            <input type="number" min="0" disabled={!cur} placeholder={SYMBOL} value={cur?.price || ''} onChange={(e) => setFmt(a.key, true, Number(e.target.value))} />
          </div>) })}</div>
        <Field label="Ad positions"><div className="chips">{POSITIONS.map((p) => <button key={p.key} className={f.positions.includes(p.key) ? 'on' : ''} onClick={() => set({ positions: tg(f.positions, p.key) })}>{p.label}</button>)}</div></Field>
        {hasOverlay && <Field label="Overlay zones you allow">
          <div className={`zone-pick ${f.orientation}`}>{ZONE_KEYS.map((k) => { const z = ZONES[k]; return <button key={k} className={f.zones.includes(k) ? 'on' : ''} style={{ left: `${z.x}%`, top: `${z.y}%`, width: `${z.w}%`, height: `${z.h}%` }} onClick={() => set({ zones: tg(f.zones, k) })}>{z.label}</button> })}</div>
        </Field>}
      </div>

      <div className="glass pane">
        <h4>3 · Deal terms</h4>
        <div className="row2">
          <Field label="Publish by"><input type="date" min={today()} value={f.publishBy} onChange={(e) => set({ publishBy: e.target.value })} /></Field>
          <Field label="Sponsor spots" hint="How many brands can book this video"><input type="number" min={1} max={10} disabled={f.exclusive} value={f.exclusive ? 1 : f.spots} onChange={(e) => set({ spots: Number(e.target.value) })} /></Field>
        </div>
        <label className="toggle"><input type="checkbox" checked={f.exclusive} onChange={(e) => set({ exclusive: e.target.checked })} />Exclusive: only one sponsor in this video</label>
        <Field label="Payment terms">{PAY_TERMS.map((t) => <label key={t.key} className="radio"><input type="radio" checked={f.payTerms === t.key} onChange={() => set({ payTerms: t.key })} /><span><b>{t.label}</b><small className="muted">{t.desc}</small></span></label>)}</Field>
      </div>

      <div className="glass pane">
        <h4>4 · Ads you don't accept</h4>
        <div className="chips">{AD_CATEGORIES.map((c) => <button key={c} className={f.blocked.includes(c) ? 'on bad' : ''} onClick={() => set({ blocked: tg(f.blocked, c) })}>{c}</button>)}</div>
        <Field label="Status"><select value={f.status} onChange={(e) => set({ status: e.target.value as Slot['status'] })}><option value="open">Open: visible and bookable</option><option value="paused">Paused: hidden from search</option><option value="closed">Closed</option></select></Field>
        <div className="slot-sum"><span>{lengthOf(f.length).label}</span><PlatformStack list={f.platforms} size={18} /><span>{f.formats.length} formats{prices.length ? ` · from ${tok(Math.min(...prices))}` : ''}</span></div>
      </div>

      {err && <p className="err span2">{err}</p>}
      <div className="save-bar"><a className="btn ghost" href="#/studio/slots">Cancel</a><button className="btn" onClick={save}>{slot ? 'Save ad slot' : 'Publish ad slot'}</button></div>
    </div>
  )
}

function Portfolio({ videos }: { videos: Video[] }) {
  const { user } = useAuth()
  const [mode, setMode] = useState<'' | 'link' | 'upload'>('')
  const [f, setF] = useState({ title: '', url: '', platform: (user!.channels[0]?.platform || 'youtube') as PlatformKey, views: '', category: user!.category || 'Other' })
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false), [err, setErr] = useState('')
  const save = async () => {
    setErr('')
    if (!f.title.trim()) return setErr('Add a title')
    setBusy(true)
    try {
      const base = { id: uid(), creatorId: user!.id, title: f.title.trim(), description: '', category: f.category, views: Number(f.views) || 0, likes: 0, createdAt: Date.now() }
      if (mode === 'link') {
        if (!/^https?:\/\//.test(f.url)) throw new Error('Paste the full video link')
        await db.put('videos', { ...base, platform: f.platform, url: f.url.trim(), duration: 0, width: 0, height: 0 })
      } else {
        if (!file) throw new Error('Choose a video file')
        if (file.size > cfg.maxVideoMB * 1048576) throw new Error(`Max ${cfg.maxVideoMB} MB`)
        const meta = await probeVideo(file)
        const [blobId, thumbId] = await Promise.all([db.putBlob(file), db.putBlob(meta.thumb)])
        await db.put('videos', { ...base, blobId, thumbId, duration: meta.duration, width: meta.width, height: meta.height })
      }
      setMode(''); setFile(null); setF({ ...f, title: '', url: '', views: '' })
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }
  return <>
    <div className="sec-head row"><p className="muted">Show advertisers your best work: link published videos, or upload a sample (samples can be used for ad previews on your slots).</p>
      <div className="cta-row"><button className="btn" onClick={() => setMode('link')}><Icon d={I.link} size={15} />Add link</button><button className="btn ghost" onClick={() => setMode('upload')}><Icon d={I.upload} size={15} />Upload sample</button></div></div>
    {videos.length ? <div className="grid c3">{videos.map((v) => <div key={v.id} className="pf-item"><PortfolioCard v={v} /><button className="btn ghost sm danger" onClick={() => confirm('Remove this video?') && db.del('videos', v.id)}>Remove</button></div>)}</div> : <Empty title="Portfolio is empty" />}
    <Modal open={!!mode} onClose={() => setMode('')} title={mode === 'link' ? 'Add a published video' : 'Upload a sample video'}>
      <Field label="Title"><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
      {mode === 'link' ? <>
        <div className="row2"><Field label="Platform"><select value={f.platform} onChange={(e) => setF({ ...f, platform: e.target.value as PlatformKey })}>{PLATFORM_KEYS.map((p) => <option key={p} value={p}>{PLATFORMS[p].name}</option>)}</select></Field><Field label="Views"><input type="number" value={f.views} onChange={(e) => setF({ ...f, views: e.target.value })} /></Field></div>
        <Field label="Link"><input value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="https://" /></Field>
      </> : <Field label={`Video file (max ${cfg.maxVideoMB} MB)`}><input type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] || null)} /></Field>}
      <Field label="Category"><select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
      {err && <p className="err">{err}</p>}
      <button className="btn block" disabled={busy} onClick={save}>{busy ? 'Processing…' : 'Save'}</button>
    </Modal>
  </>
}

function CollabRow({ r, adv }: { r: CollabRequest; adv?: User }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState(String(r.budget || ''))
  const [reply, setReply] = useState('')
  return (
    <div className="prow glass">
      <Avatar u={adv} size={40} />
      <div className="prow-main"><b>{adv?.company || adv?.name || 'Advertiser'}</b><span className="muted small clamp2">{r.brief}</span>{r.reply && <span className="small">↳ {r.reply}</span>}</div>
      <div className="prow-price"><b>{tok(r.quote ?? r.budget)}</b>{r.deadline && <span className="muted small">by {r.deadline}</span>}</div>
      <Badge s={r.status} />
      <div className="prow-act">{r.status === 'open' && <><button className="btn sm" onClick={() => setOpen(true)}>Quote</button><button className="btn ghost sm danger" onClick={() => db.patch('requests', r.id, { status: 'declined', updatedAt: Date.now() })}>Decline</button></>}
        {r.status === 'accepted' && <a className="btn sm" href="#/studio/slots/new">Create a slot for it</a>}</div>
      <Modal open={open} onClose={() => setOpen(false)} title="Quote this request">
        <p className="muted small pre">{r.brief}</p>
        <Field label={`Quote (${SYMBOL})`}><input type="number" value={q} onChange={(e) => setQ(e.target.value)} /></Field>
        <Field label="Reply"><textarea rows={3} value={reply} onChange={(e) => setReply(e.target.value)} /></Field>
        <button className="btn block" onClick={async () => { await db.patch('requests', r.id, { quote: Number(q), reply, status: 'quoted', updatedAt: Date.now() }); setOpen(false) }}>Send quote</button>
      </Modal>
    </div>
  )
}
