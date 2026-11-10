import { useEffect, useMemo, useRef, useState } from 'react'
import { query, useBlobUrl, useTable } from '../lib/hooks'
import { db, uid, User } from '../lib/db'
import { useAuth } from '../lib/auth'
import { AD_TYPES, ago, CATEGORIES, dur, fmt, tok, typeLabel, ZONES } from '../lib/constants'
import { Page } from '../components/Layout'
import { Avatar, CreatorCard, minPrice, Socials, VideoCard } from '../components/Media'
import { Empty, Field, Icon, I, Modal, useToast } from '../components/ui'

const avgViews = (c: User, vids: { creatorId: string; views: number }[]) => {
  const m = vids.filter((v) => v.creatorId === c.id)
  return m.length ? m.reduce((s, v) => s + v.views, 0) / m.length : 0
}
const fromPrice = (c: User) => Math.min(...[c.pricing.image, c.pricing.text, c.pricing.combo].filter((x) => x > 0), Infinity)

export function Creators() {
  const users = useTable('users'), videos = useTable('videos')
  const [q, setQ] = useState(query().get('q') || '')
  const [cat, setCat] = useState('All')
  const [sort, setSort] = useState('popular')
  const list = useMemo(() => {
    const s = q.toLowerCase()
    const l = users.rows.filter((u) => u.role === 'creator' && u.acceptsAds && (cat === 'All' || u.category === cat)
      && (!s || `${u.name} ${u.handle} ${u.bio} ${u.category}`.toLowerCase().includes(s)))
    const key = { popular: (u: User) => -u.followers, views: (u: User) => -avgViews(u, videos.rows), price: (u: User) => fromPrice(u), new: (u: User) => -u.createdAt }[sort]!
    return l.sort((a, b) => key(a) - key(b))
  }, [users.rows, videos.rows, q, cat, sort])
  return (
    <Page>
      <section className="section">
        <div className="sec-head"><span className="eyebrow">Creator marketplace</span><h2>Find the right voice for your brand</h2></div>
        <Filters q={q} setQ={setQ} cat={cat} setCat={setCat} sort={sort} setSort={setSort} sorts={[['popular', 'Most followers'], ['views', 'Average views'], ['price', 'Lowest price'], ['new', 'Newest']]} />
        {list.length ? <div className="grid c4">{list.map((c) => <CreatorCard key={c.id} c={c} videos={videos.rows} />)}</div>
          : <Empty title={users.ready ? 'No creators match' : 'Loading…'} text="Try another category or search term." />}
      </section>
    </Page>
  )
}

export function Videos() {
  const users = useTable('users'), videos = useTable('videos')
  const [q, setQ] = useState(query().get('q') || '')
  const [cat, setCat] = useState('All')
  const [fmtSel, setFmt] = useState('all')
  const [sort, setSort] = useState('views')
  const byId = (id: string) => users.rows.find((u) => u.id === id)
  const list = useMemo(() => {
    const s = q.toLowerCase()
    const l = videos.rows.filter((v) => v.adEnabled && (cat === 'All' || v.category === cat) && (fmtSel === 'all' || v.formats.includes(fmtSel as never))
      && (!s || `${v.title} ${v.description} ${byId(v.creatorId)?.name}`.toLowerCase().includes(s)))
    const key = { views: (v: typeof l[0]) => -v.views, engagement: (v: typeof l[0]) => -(v.likes / (v.views || 1)), price: (v: typeof l[0]) => minPrice(v, byId(v.creatorId)) || Infinity, new: (v: typeof l[0]) => -v.createdAt }[sort]!
    return l.sort((a, b) => key(a) - key(b))
  }, [videos.rows, users.rows, q, cat, fmtSel, sort])
  return (
    <Page>
      <section className="section">
        <div className="sec-head"><span className="eyebrow">Video ad marketplace</span><h2>Ad-ready videos</h2><p className="muted">Every video below accepts in-video placements. Open one to preview and place your ad.</p></div>
        <Filters q={q} setQ={setQ} cat={cat} setCat={setCat} sort={sort} setSort={setSort} sorts={[['views', 'Most viewed'], ['engagement', 'Engagement'], ['price', 'Lowest price'], ['new', 'Newest']]}>
          <select value={fmtSel} onChange={(e) => setFmt(e.target.value)}><option value="all">All formats</option>{AD_TYPES.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}</select>
        </Filters>
        {list.length ? <div className="grid c3">{list.map((v) => <VideoCard key={v.id} v={v} c={byId(v.creatorId)} />)}</div>
          : <Empty title={videos.ready ? 'No videos match' : 'Loading…'} text="Creators' ad-ready videos will show up here." />}
      </section>
    </Page>
  )
}

function Filters({ q, setQ, cat, setCat, sort, setSort, sorts, children }: {
  q: string; setQ: (s: string) => void; cat: string; setCat: (s: string) => void; sort: string; setSort: (s: string) => void; sorts: [string, string][]; children?: React.ReactNode
}) {
  return (
    <div className="filters">
      <label className="search glass"><Icon d={I.search} size={16} /><input placeholder="Search name, niche, keyword…" value={q} onChange={(e) => setQ(e.target.value)} /></label>
      <div className="chips">{['All', ...CATEGORIES].map((c) => <button key={c} className={cat === c ? 'on' : ''} onClick={() => setCat(c)}>{c}</button>)}</div>
      <div className="filters-r">{children}<select value={sort} onChange={(e) => setSort(e.target.value)}>{sorts.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
    </div>
  )
}

export function HireModal({ creator, open, onClose }: { creator: User; open: boolean; onClose: () => void }) {
  const { user } = useAuth()
  const [brief, setBrief] = useState(''), [budget, setBudget] = useState(''), [deadline, setDeadline] = useState('')
  const [err, setErr] = useState('')
  const send = async () => {
    if (!user) return (location.hash = '#/auth?role=advertiser')
    if (user.role !== 'advertiser') return setErr('Switch to an advertiser account to hire creators.')
    if (brief.trim().length < 10) return setErr('Describe the collaboration (at least 10 characters).')
    await db.put('requests', { id: uid(), advertiserId: user.id, creatorId: creator.id, brief: brief.trim(), budget: Number(budget) || 0, deadline, status: 'open', createdAt: Date.now(), updatedAt: Date.now() })
    onClose(); location.hash = '#/brand/requests'
  }
  return (
    <Modal open={open} onClose={onClose} title={`Hire ${creator.name}`}>
      <p className="muted small">Send a campaign brief. {creator.name} can reply with a quote.</p>
      <Field label="Brief"><textarea rows={5} value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="Product, goals, number of videos, preferred formats…" /></Field>
      <div className="row2"><Field label="Budget (token)"><input type="number" min="0" value={budget} onChange={(e) => setBudget(e.target.value)} /></Field><Field label="Deadline"><input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></Field></div>
      {err && <p className="err">{err}</p>}
      <button className="btn block" onClick={send}><Icon d={I.send} size={16} />Send request</button>
    </Modal>
  )
}

export function CreatorProfile({ id }: { id: string }) {
  const users = useTable('users'), videos = useTable('videos')
  const { user, update } = useAuth()
  const [hire, setHire] = useState(false)
  const c = users.rows.find((u) => u.id === id)
  if (!c) return <Page><Empty title={users.ready ? 'Creator not found' : 'Loading…'} /></Page>
  const mine = videos.rows.filter((v) => v.creatorId === c.id).sort((a, b) => b.createdAt - a.createdAt)
  const saved = user?.saved.includes(c.id)
  const toggleSave = () => user ? update({ saved: saved ? user.saved.filter((x) => x !== c.id) : [...user.saved, c.id] }) : (location.hash = '#/auth?role=advertiser')
  return (
    <Page>
      <section className="profile-h glass">
        <Avatar u={c} size={96} />
        <div className="grow">
          <h1>{c.name}</h1><p className="muted">@{c.handle} · {c.category}</p>
          <p>{c.bio}</p><Socials s={c.socials} />
        </div>
        <div className="profile-s">
          <div><b>{fmt(c.followers)}</b><span>Followers</span></div>
          <div><b>{fmt(avgViews(c, videos.rows))}</b><span>Avg views</span></div>
          <div><b>{mine.length}</b><span>Videos</span></div>
        </div>
        <div className="profile-a">
          <button className="btn" onClick={() => setHire(true)}><Icon d={I.send} size={16} />Hire creator</button>
          <button className="btn ghost" onClick={toggleSave}><Icon d={I.bookmark} size={16} />{saved ? 'Saved' : 'Save'}</button>
        </div>
      </section>
      <section className="section">
        <div className="pricing-row">{AD_TYPES.map((a) => <div key={a.key} className="glass"><span className="muted small">{a.label}</span><b>{c.pricing[a.key] ? tok(c.pricing[a.key]) : 'Open to offers'}</b></div>)}
          <div className="glass"><span className="muted small">Allowed zones</span><b className="small">{c.zones.map((z) => ZONES[z].label).join(', ') || '—'}</b></div></div>
        <h3>Video portfolio</h3>
        {mine.length ? <div className="grid c3">{mine.map((v) => <VideoCard key={v.id} v={v} c={c} />)}</div> : <Empty title="No videos yet" />}
      </section>
      <HireModal creator={c} open={hire} onClose={() => setHire(false)} />
    </Page>
  )
}

export function VideoDetail({ id }: { id: string }) {
  const videos = useTable('videos'), users = useTable('users'), pls = useTable('placements')
  const v = videos.rows.find((x) => x.id === id)
  const c = users.rows.find((u) => u.id === v?.creatorId)
  const ads = pls.rows.filter((p) => p.videoId === id && (p.status === 'published' || p.status === 'paid'))
  const [which, setWhich] = useState('')
  const ad = ads.find((p) => p.id === which)
  const src = useBlobUrl(ad ? ad.publishedId : v?.blobId)
  const ref = useRef<HTMLVideoElement>(null)
  const counted = useRef({ play: false, ad: false })
  const [inAd, setInAd] = useState(false)
  const [liked, setLiked] = useState(() => localStorage.getItem('yt.like.' + id) === '1')
  const { toast, node } = useToast()

  useEffect(() => { counted.current = { play: false, ad: false } }, [which])
  if (!v) return <Page><Empty title={videos.ready ? 'Video not found' : 'Loading…'} /></Page>

  const onPlay = () => {
    if (counted.current.play) return
    counted.current.play = true
    db.patch('videos', v.id, { views: v.views + 1 })
    if (ad) db.patch('placements', ad.id, { impressions: ad.impressions + 1 })
  }
  const onTime = () => {
    const t = ref.current?.currentTime ?? 0
    const on = !!ad && t >= ad.start && t <= ad.end
    setInAd(on)
    if (on && ad && !counted.current.ad) { counted.current.ad = true; db.patch('placements', ad.id, { adViews: ad.adViews + 1 }) }
  }
  const like = () => {
    const n = !liked; setLiked(n); localStorage.setItem('yt.like.' + id, n ? '1' : '0')
    db.patch('videos', v.id, { likes: Math.max(0, v.likes + (n ? 1 : -1)) })
  }
  const price = { ...(c?.pricing || {}), ...(v.price || {}) } as Record<string, number>
  return (
    <Page>
      <section className="vd">
        <div className="vd-main">
          <div className="player glass">{src && <video ref={ref} src={src} controls playsInline onPlay={onPlay} onTimeUpdate={onTime} />}</div>
          {ads.length > 0 && <div className="chips">
            <button className={!which ? 'on' : ''} onClick={() => setWhich('')}>Original</button>
            {ads.map((p) => <button key={p.id} className={which === p.id ? 'on' : ''} onClick={() => setWhich(p.id)}>Sponsored · {typeLabel(p.type)}</button>)}
          </div>}
          {ad?.link && inAd && <a className="sponsor glass" href={ad.link} target="_blank" rel="noreferrer" onClick={() => db.patch('placements', ad.id, { clicks: ad.clicks + 1 })}>Sponsored — visit advertiser ↗</a>}
          <h1 className="vd-t">{v.title}</h1>
          <div className="vd-meta"><span><Icon d={I.eye} size={15} />{fmt(v.views)} views</span><button className={`chip-btn${liked ? ' on' : ''}`} onClick={like}><Icon d={I.heart} size={15} />{fmt(v.likes)}</button><span>{dur(v.duration)}</span><span>{v.category}</span><span>{ago(v.createdAt)}</span>
            <button className="chip-btn" onClick={() => { navigator.clipboard.writeText(location.href); toast('Link copied') }}><Icon d={I.copy} size={15} />Share</button></div>
          <p className="muted pre">{v.description}</p>
        </div>
        <aside className="vd-side">
          {c && <a className="glass vd-creator" href={`#/creator/${c.id}`}><Avatar u={c} size={44} /><div><b>{c.name}</b><span className="muted small">{fmt(c.followers)} followers · {c.category}</span></div></a>}
          <div className="glass vd-ad">
            <h3>Advertise in this video</h3>
            {v.adEnabled ? <>
              <ul className="kv">{AD_TYPES.filter((a) => v.formats.includes(a.key)).map((a) => <li key={a.key}><span>{a.label}</span><b>{price[a.key] ? tok(price[a.key]) : 'Open offer'}</b></li>)}
                <li><span>Engagement</span><b>{v.views ? ((v.likes / v.views) * 100).toFixed(1) + '%' : '—'}</b></li></ul>
              <a className="btn block" href={`#/editor/${v.id}`}><Icon d={I.edit} size={16} />Request Ad</a>
            </> : <p className="muted">The creator has not opened this video for ads.</p>}
          </div>
        </aside>
      </section>
      {node}
    </Page>
  )
}
