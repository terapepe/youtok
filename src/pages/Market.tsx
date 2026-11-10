import { ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { query, useBlobUrl, useMarket } from '../lib/hooks'
import { db, uid, PlatformKey, User } from '../lib/db'
import { useAuth } from '../lib/auth'
import {
  AD_TYPES, avgViewsOf, CATEGORIES, dateLabel, dealsDone, dur, fmt, followersOf, isLive, LANGUAGES, LENGTHS, lengthOf, minPrice,
  PAY_TERMS, PLATFORMS, PLATFORM_KEYS, posLabel, ratingOf, spotsLeft, SYMBOL, termLabel, tierOf, TIERS, tok, typeLabel, ZONES,
} from '../lib/constants'
import { Page } from '../components/Layout'
import { Avatar, Banner, CreatorCard, MockFrame, PlatformBadge, PlatformStack, PortfolioCard, SlotCard, Stars, TierBadge } from '../components/Media'
import { Empty, Field, Icon, I, Modal, useToast } from '../components/ui'

const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])

function PlatformChips({ value, set }: { value: PlatformKey[]; set: (v: PlatformKey[]) => void }) {
  return <div className="chips">{PLATFORM_KEYS.map((k) => <button key={k} className={value.includes(k) ? 'on' : ''} onClick={() => set(toggle(value, k))}><PlatformBadge p={k} size={18} />{PLATFORMS[k].name}</button>)}</div>
}

function Toolbar({ q, setQ, count, noun, children, onClear }: { q: string; setQ: (s: string) => void; count: number; noun: string; children: ReactNode; onClear: () => void }) {
  return (
    <div className="toolbar">
      <label className="search glass"><Icon d={I.search} size={16} /><input placeholder="Search name, handle, topic, tag…" value={q} onChange={(e) => setQ(e.target.value)} /></label>
      <div className="tb-row">{children}</div>
      <div className="tb-meta"><span className="muted small">{count} {noun}{count === 1 ? '' : 's'}</span><button className="link-btn" onClick={onClear}>Clear filters</button></div>
    </div>
  )
}

// ── Explore Creators ─────────────────────────────────────────
export function Creators() {
  const m = useMarket()
  const init = () => ({ q: query().get('q') || '', pf: (query().get('platform') ? [query().get('platform')] : []) as PlatformKey[], cat: '', tier: '', lang: '', rating: 0, maxPrice: '', openOnly: false, sort: 'followers' })
  const [f, setF] = useState(init)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const set = (p: Partial<typeof f>) => setF({ ...f, ...p })

  const creators = m.users.filter((u) => u.role === 'creator' && u.listed)
  const list = useMemo(() => {
    const s = f.q.toLowerCase()
    const rows = creators.map((c) => {
      const open = m.slots.filter((x) => x.creatorId === c.id && isLive(x, m.bookings))
      return { c, open, from: Math.min(...open.map(minPrice)), r: ratingOf(c.id, m.bookings), deals: dealsDone(c.id, m.bookings), fol: followersOf(c), views: avgViewsOf(c) }
    }).filter(({ c, open, from, r }) =>
      (!s || `${c.name} ${c.handle} ${c.bio} ${c.category} ${open.flatMap((o) => o.tags).join(' ')}`.toLowerCase().includes(s))
      && (!f.pf.length || c.channels.some((ch) => f.pf.includes(ch.platform)))
      && (!f.cat || c.category === f.cat) && (!f.lang || c.language === f.lang) && (!f.tier || tierOf(c).key === f.tier)
      && (!f.openOnly || open.length > 0) && (!f.rating || r.avg >= f.rating)
      && (!f.maxPrice || from <= Number(f.maxPrice)))
    const key: Record<string, (x: typeof rows[0]) => number> = { followers: (x) => -x.fol, views: (x) => -x.views, rating: (x) => -(x.r.avg * 100 + x.r.count), deals: (x) => -x.deals, price: (x) => x.from, slots: (x) => -x.open.length, new: (x) => -x.c.createdAt }
    return rows.sort((a, b) => Number(!!a.c.sample) - Number(!!b.c.sample) || key[f.sort](a) - key[f.sort](b))
  }, [m, f])

  const sampleN = creators.filter((c) => c.sample).length
  const topRated = creators.map((c) => ({ c, r: ratingOf(c.id, m.bookings) })).filter((x) => x.r.count).sort((a, b) => b.r.avg - a.r.avg).slice(0, 3)
  return (
    <Page>
      <section className="explore-h">
        <div><span className="eyebrow">Explore creators</span><h1>Find the right voice for your brand</h1>
          <p className="muted lead">Browse creators by platform, niche, language and audience size. See their linked channels, open ad slots, prices in {SYMBOL}, ratings and completed deals.</p></div>
        <div className="explore-stats glass">
          <div><b>{creators.filter((c) => !c.sample).length}</b><span>Creators</span></div>
          <div><b>{fmt(creators.filter((c) => !c.sample).reduce((s, c) => s + followersOf(c), 0))}</b><span>Combined reach</span></div>
          <div><b>{m.slots.filter((s) => !s.sample && isLive(s, m.bookings)).length}</b><span>Open slots</span></div>
        </div>
      </section>

      {sampleN > 0 && <p className="note">Profiles marked <span className="sample">Sample</span> are fictional examples showing how creators appear on {'YOULIP.FUN'}. They are not bookable.</p>}
      {topRated.length > 0 && <section className="spotlight">
        <h3><Icon d={I.star} /> Top rated</h3>
        <div className="spot-row">{topRated.map(({ c, r }) => <a key={c.id} className="spot glass" href={`#/creator/${c.id}`}><Avatar u={c} size={44} /><div><b>{c.name}</b><Stars value={r.avg} count={r.count} small /></div><TierBadge u={c} /></a>)}</div>
      </section>}

      <Toolbar q={f.q} setQ={(q) => set({ q })} count={list.length} noun="creator" onClear={() => setF({ ...init(), q: '', pf: [] })}>
        <PlatformChips value={f.pf} set={(pf) => set({ pf })} />
        <div className="selects">
          <select value={f.cat} onChange={(e) => set({ cat: e.target.value })}><option value="">All categories</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
          <select value={f.tier} onChange={(e) => set({ tier: e.target.value })}><option value="">Any size</option>{TIERS.map((t) => <option key={t.key} value={t.key}>{t.label} ({fmt(t.min)}+)</option>)}</select>
          <select value={f.lang} onChange={(e) => set({ lang: e.target.value })}><option value="">Any language</option>{LANGUAGES.map((l) => <option key={l}>{l}</option>)}</select>
          <select value={f.rating} onChange={(e) => set({ rating: Number(e.target.value) })}><option value={0}>Any rating</option><option value={3}>3★+</option><option value={4}>4★+</option><option value={4.5}>4.5★+</option></select>
          <input type="number" min="0" placeholder={`Max price (${SYMBOL})`} value={f.maxPrice} onChange={(e) => set({ maxPrice: e.target.value })} />
          <label className="toggle"><input type="checkbox" checked={f.openOnly} onChange={(e) => set({ openOnly: e.target.checked })} />Has open slots</label>
          <span className="grow" />
          <select value={f.sort} onChange={(e) => set({ sort: e.target.value })}>
            {[['followers', 'Most followers'], ['views', 'Highest avg views'], ['rating', 'Top rated'], ['deals', 'Most deals'], ['slots', 'Most open slots'], ['price', 'Lowest price'], ['new', 'Newest']].map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <div className="seg mini"><button className={view === 'grid' ? 'on' : ''} onClick={() => setView('grid')} title="Grid"><Icon d={I.grid} size={15} /></button><button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')} title="List"><Icon d={I.menu} size={15} /></button></div>
        </div>
      </Toolbar>

      {list.length ? <div className={view === 'grid' ? 'grid c4' : 'clist'}>{list.map(({ c }) => <CreatorCard key={c.id} c={c} m={m} list={view === 'list'} />)}</div>
        : <Empty title={m.ready ? (creators.length ? 'No creators match these filters' : 'No creators yet') : 'Loading…'} text={creators.length ? 'Try removing a filter.' : 'Creators appear here after they sign up and link their channels.'} action={!creators.length && <a className="btn" href="#/auth?role=creator">Become a Creator</a>} />}

      <section className="section">
        <div className="sec-head"><span className="eyebrow">Browse by category</span><h2>Every niche, one marketplace</h2></div>
        <div className="cat-grid">{CATEGORIES.map((c) => <button key={c} className="glass" onClick={() => { set({ cat: c }); scrollTo({ top: 0, behavior: 'smooth' }) }}><b>{c}</b><span>{creators.filter((x) => x.category === c).length}</span></button>)}</div>
      </section>
    </Page>
  )
}

// ── Ad Slots marketplace ─────────────────────────────────────
export function Slots() {
  const m = useMarket()
  const init = () => ({ q: query().get('q') || '', pf: [] as PlatformKey[], len: (query().get('length') ? [query().get('length')!] : []) as string[], tag: query().get('tag') || '', cat: '', fmtT: '', lang: '', maxPrice: '', terms: '', orient: '', available: true, sort: 'soon' })
  const [f, setF] = useState(init)
  const set = (p: Partial<typeof f>) => setF({ ...f, ...p })
  const uById = (id: string) => m.users.find((u) => u.id === id)
  const list = useMemo(() => {
    const s = f.q.toLowerCase()
    const rows = m.slots.filter((x) => {
      const c = uById(x.creatorId)
      return (!f.available || isLive(x, m.bookings)) && x.status !== 'closed'
        && (!s || `${x.title} ${x.description} ${x.tags.join(' ')} ${c?.name} ${c?.handle}`.toLowerCase().includes(s))
        && (!f.pf.length || x.platforms.some((p) => f.pf.includes(p))) && (!f.len.length || f.len.includes(x.length))
        && (!f.tag || x.tags.includes(f.tag)) && (!f.cat || x.category === f.cat) && (!f.lang || x.language === f.lang)
        && (!f.fmtT || x.formats.some((y) => y.type === f.fmtT)) && (!f.terms || x.payTerms === f.terms) && (!f.orient || x.orientation === f.orient)
        && (!f.maxPrice || minPrice(x) <= Number(f.maxPrice))
    })
    const key: Record<string, (x: typeof rows[0]) => number> = {
      soon: (x) => (x.publishBy ? Date.parse(x.publishBy) : 9e15), new: (x) => -x.createdAt, low: (x) => minPrice(x), high: (x) => -minPrice(x),
      reach: (x) => -followersOf(uById(x.creatorId) || { channels: [] }), spots: (x) => -spotsLeft(x, m.bookings),
    }
    return rows.sort((a, b) => Number(!!a.sample) - Number(!!b.sample) || key[f.sort](a) - key[f.sort](b))
  }, [m, f])
  return (
    <Page>
      <section className="explore-h">
        <div><span className="eyebrow">Ad slots</span><h1>Upcoming videos, open for sponsors</h1>
          <p className="muted lead">Each slot is a video a creator is about to make, with its length, platforms, topic tags and the creator's own {SYMBOL} price per ad format.</p></div>
      </section>
      <Toolbar q={f.q} setQ={(q) => set({ q })} count={list.length} noun="slot" onClear={() => setF({ ...init(), q: '', len: [], tag: '' })}>
        <PlatformChips value={f.pf} set={(pf) => set({ pf })} />
        <div className="chips">{LENGTHS.map((l) => <button key={l.key} className={f.len.includes(l.key) ? 'on' : ''} onClick={() => set({ len: toggle(f.len, l.key) })}><Icon d={I.clock} size={13} />{l.label}</button>)}</div>
        <div className="selects">
          <select value={f.cat} onChange={(e) => set({ cat: e.target.value })}><option value="">All categories</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
          <select value={f.fmtT} onChange={(e) => set({ fmtT: e.target.value })}><option value="">Any ad format</option>{AD_TYPES.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}</select>
          <select value={f.lang} onChange={(e) => set({ lang: e.target.value })}><option value="">Any language</option>{LANGUAGES.map((l) => <option key={l}>{l}</option>)}</select>
          <select value={f.terms} onChange={(e) => set({ terms: e.target.value })}><option value="">Any payment terms</option>{PAY_TERMS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</select>
          <select value={f.orient} onChange={(e) => set({ orient: e.target.value })}><option value="">Any orientation</option><option value="landscape">Landscape 16:9</option><option value="portrait">Vertical 9:16</option></select>
          <input placeholder="#tag" value={f.tag} onChange={(e) => set({ tag: e.target.value.replace('#', '').toLowerCase() })} />
          <input type="number" min="0" placeholder={`Max price (${SYMBOL})`} value={f.maxPrice} onChange={(e) => set({ maxPrice: e.target.value })} />
          <label className="toggle"><input type="checkbox" checked={f.available} onChange={(e) => set({ available: e.target.checked })} />Available only</label>
          <span className="grow" />
          <select value={f.sort} onChange={(e) => set({ sort: e.target.value })}>{[['soon', 'Publishing soonest'], ['new', 'Newest'], ['low', 'Price: low → high'], ['high', 'Price: high → low'], ['reach', 'Biggest reach'], ['spots', 'Most spots left']].map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        </div>
      </Toolbar>
      {list.length ? <div className="grid c3">{list.map((s) => <SlotCard key={s.id} s={s} c={uById(s.creatorId)} bookings={m.bookings} />)}</div>
        : <Empty title={m.ready ? 'No ad slots match' : 'Loading…'} text="Try other filters, or check back soon: creators list new videos every day." />}
    </Page>
  )
}

export function Tags() {
  const m = useMarket()
  const live = m.slots.filter((s) => isLive(s, m.bookings))
  const all = Object.entries(m.slots.flatMap((s) => s.tags).reduce<Record<string, number>>((a, t) => ({ ...a, [t]: (a[t] || 0) + 1 }), {})).sort((a, b) => b[1] - a[1])
  return (
    <Page>
      <section className="explore-h"><div><span className="eyebrow">Tags</span><h1>Browse ad slots by topic</h1><p className="muted lead">Tags come from what creators say their next videos are about.</p></div></section>
      {all.length ? <div className="tag-cloud big">{all.map(([t, n]) => <a key={t} href={`#/slots?tag=${t}`}>#{t}<em>{live.filter((s) => s.tags.includes(t)).length}/{n}</em></a>)}</div> : <Empty title="No tags yet" />}
    </Page>
  )
}

// ── Slot detail ──────────────────────────────────────────────
export function SlotDetail({ id }: { id: string }) {
  const m = useMarket()
  const { user } = useAuth()
  const { toast, node } = useToast()
  const counted = useRef(false)
  const s = m.slots.find((x) => x.id === id)
  const sample = m.videos.find((v) => v.id === s?.sampleVideoId)
  const sampleUrl = useBlobUrl(sample?.blobId)
  useEffect(() => {
    if (s && !counted.current && user?.id !== s.creatorId) { counted.current = true; db.patch('slots', s.id, { views: s.views + 1 }) }
  }, [s?.id])
  if (!s) return <Page><Empty title={m.ready ? 'Ad slot not found' : 'Loading…'} /></Page>
  const c = m.users.find((u) => u.id === s.creatorId)
  const left = spotsLeft(s, m.bookings), live = isLive(s, m.bookings)
  const more = m.slots.filter((x) => x.creatorId === s.creatorId && x.id !== s.id && isLive(x, m.bookings)).slice(0, 3)
  return (
    <Page>
      <section className="vd">
        <div className="vd-main">
          <div className="player glass">{sampleUrl ? <video src={sampleUrl} controls playsInline /> : <MockFrame portrait={s.orientation === 'portrait'} label="Video not filmed yet — this is an ad slot for an upcoming video" />}</div>
          <div className="row-g mt"><PlatformStack list={s.platforms} size={26} /><span className="len-pill">{lengthOf(s.length).label}</span><span className="len-pill">{s.orientation === 'portrait' ? 'Vertical 9:16' : 'Landscape 16:9'}</span><span className="len-pill">{s.language}</span><span className="len-pill">{s.category}</span></div>
          <h1 className="vd-t">{s.title}</h1>
          <div className="tags">{s.tags.map((t) => <a key={t} href={`#/slots?tag=${t}`}>#{t}</a>)}</div>
          <p className="muted pre mt">{s.description}</p>
          <div className="info-grid">
            <div className="glass"><span>Publish by</span><b>{dateLabel(s.publishBy)}</b></div>
            <div className="glass"><span>Spots</span><b>{s.exclusive ? 'Exclusive (1 brand)' : `${left} of ${s.spots} left`}</b></div>
            <div className="glass"><span>Payment</span><b>{termLabel(s.payTerms)}</b></div>
            <div className="glass"><span>Ad positions</span><b>{s.positions.map(posLabel).join(', ')}</b></div>
            <div className="glass"><span>Overlay zones</span><b className="small">{s.zones.map((z) => ZONES[z].label).join(', ')}</b></div>
            <div className="glass"><span>Not accepted</span><b className="small">{s.blocked.join(', ') || 'No restrictions'}</b></div>
          </div>
        </div>
        <aside className="vd-side">
          {c && <a className="glass vd-creator" href={`#/creator/${c.id}`}><Avatar u={c} size={48} /><div><b>{c.name}</b><span className="muted small">{fmt(followersOf(c))} followers · {c.channels.length} channels</span><Stars {...(() => { const r = ratingOf(c.id, m.bookings); return { value: r.avg, count: r.count } })()} small /></div></a>}
          <div className="glass vd-ad">
            <h3>Ad formats & prices</h3>
            <ul className="kv">{s.formats.map((x) => <li key={x.type}><span>{typeLabel(x.type)}</span><b>{tok(x.price)}</b></li>)}</ul>
            {s.sample ? <p className="note">This is a <b>sample</b> slot from a fictional profile. It cannot be booked.</p> : live ? (user?.id === s.creatorId ? <a className="btn block" href="#/studio/slots">Manage this slot</a> : <a className="btn block" href={`#/book/${s.id}`}><Icon d={I.edit} size={16} />Book this slot</a>)
              : <p className="muted">{s.status !== 'open' ? `This slot is ${s.status}.` : left ? 'The publish date has passed.' : 'All spots are booked.'}</p>}
            <button className="btn ghost block mt" onClick={() => { navigator.clipboard.writeText(location.href); toast('Link copied') }}><Icon d={I.copy} size={15} />Share slot</button>
            <p className="muted small mt">{fmt(s.views)} views · listed {new Date(s.createdAt).toLocaleDateString('en')}</p>
          </div>
        </aside>
      </section>
      {more.length > 0 && <section className="section"><h3>More from {c?.name}</h3><div className="grid c3">{more.map((x) => <SlotCard key={x.id} s={x} c={c} bookings={m.bookings} />)}</div></section>}
      {node}
    </Page>
  )
}

// ── Creator profile ──────────────────────────────────────────
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
    <Modal open={open} onClose={onClose} title={`Custom request to ${creator.name}`}>
      <p className="muted small">Need something not listed as a slot, like a series or a dedicated video? Send a brief and {creator.name} replies with a quote.</p>
      <Field label="Brief"><textarea rows={5} value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="Product, goals, platforms, number of videos, preferred formats…" /></Field>
      <div className="row2"><Field label={`Budget (${SYMBOL})`}><input type="number" min="0" value={budget} onChange={(e) => setBudget(e.target.value)} /></Field><Field label="Deadline"><input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></Field></div>
      {err && <p className="err">{err}</p>}
      <button className="btn block" onClick={send}><Icon d={I.send} size={16} />Send request</button>
    </Modal>
  )
}

export function CreatorProfile({ id }: { id: string }) {
  const m = useMarket()
  const { user, update } = useAuth()
  const [hire, setHire] = useState(false)
  const [tab, setTab] = useState<'slots' | 'channels' | 'portfolio' | 'reviews'>('slots')
  const c = m.users.find((u) => u.id === id)
  if (!c) return <Page><Empty title={m.ready ? 'Creator not found' : 'Loading…'} /></Page>
  const slots = m.slots.filter((s) => s.creatorId === c.id && s.status !== 'closed').sort((a, b) => Number(isLive(b, m.bookings)) - Number(isLive(a, m.bookings)) || b.createdAt - a.createdAt)
  const videos = m.videos.filter((v) => v.creatorId === c.id).sort((a, b) => b.createdAt - a.createdAt)
  const reviews = m.bookings.filter((b) => b.creatorId === c.id && b.reviews.adv).sort((a, b) => b.reviews.adv!.at - a.reviews.adv!.at)
  const r = ratingOf(c.id, m.bookings)
  const saved = user?.saved.includes(c.id)
  const toggleSave = () => user ? update({ saved: saved ? user.saved.filter((x) => x !== c.id) : [...user.saved, c.id] }) : (location.hash = '#/auth?role=advertiser')
  return (
    <Page>
      <section className="profile glass">
        <Banner u={c} />
        <div className="profile-h">
          <Avatar u={c} size={104} />
          <div className="grow">
            <h1>{c.name} <TierBadge u={c} />{c.sample && <span className="sample">Sample</span>}</h1>
            {c.sample && <p className="note">Fictional sample profile: an example of how creators appear here. Not bookable.</p>}
            <p className="muted">@{c.handle} · {c.category} · {c.language}{c.country && ` · ${c.country}`}</p>
            <p>{c.bio}</p>
            <div className="row-g"><Stars value={r.avg} count={r.count} /><span className="muted small">{dealsDone(c.id, m.bookings)} completed deals · member since {new Date(c.createdAt).toLocaleDateString('en', { month: 'short', year: 'numeric' })}</span></div>
          </div>
          <div className="profile-a">
            <button className="btn" onClick={() => setTab('slots')}><Icon d={I.slot} size={16} />See ad slots</button>
            {!c.sample && <button className="btn ghost" onClick={() => setHire(true)}><Icon d={I.send} size={16} />Custom request</button>}
            <button className="btn ghost" onClick={toggleSave}><Icon d={I.bookmark} size={16} />{saved ? 'Saved' : 'Save'}</button>
          </div>
        </div>
        <div className="profile-s">
          <div><b>{fmt(followersOf(c))}</b><span>Total followers</span></div>
          <div><b>{fmt(avgViewsOf(c))}</b><span>Avg views</span></div>
          <div><b>{c.channels.length}</b><span>Channels</span></div>
          <div><b>{slots.filter((s) => isLive(s, m.bookings)).length}</b><span>Open slots</span></div>
          <div><b>{(() => { const p = Math.min(...slots.filter((s) => isLive(s, m.bookings)).map(minPrice)); return Number.isFinite(p) ? tok(p) : '—' })()}</b><span>From</span></div>
        </div>
      </section>
      <div className="seg tabs">{([['slots', `Ad slots (${slots.length})`], ['channels', `Channels (${c.channels.length})`], ['portfolio', `Portfolio (${videos.length})`], ['reviews', `Reviews (${reviews.length})`]] as const).map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
      {tab === 'slots' && (slots.length ? <div className="grid c3">{slots.map((s) => <SlotCard key={s.id} s={s} c={c} bookings={m.bookings} />)}</div> : <Empty title="No ad slots right now" text="Send a custom request instead." />)}
      {tab === 'channels' && (c.channels.length ? <div className="grid c3">{c.channels.map((ch, i) => (
        <a key={i} className="chan glass" href={ch.url || undefined} target="_blank" rel="noreferrer" style={{ ['--pf' as string]: PLATFORMS[ch.platform].color }}>
          <PlatformBadge p={ch.platform} size={40} /><div className="grow"><b>{PLATFORMS[ch.platform].name}</b><span className="muted small">@{ch.handle} ↗</span></div>
          <div className="chan-s"><b>{fmt(ch.followers)}</b><span>followers</span><b>{fmt(ch.avgViews)}</b><span>avg views</span></div>
          <span className={`badge ${ch.verified ? 'ok' : 'muted'}`}>{ch.verified ? 'Verified' : 'Self-reported'}</span>
        </a>))}</div> : <Empty title="No channels linked" />)}
      {tab === 'portfolio' && (videos.length ? <div className="grid c3">{videos.map((v) => <PortfolioCard key={v.id} v={v} />)}</div> : <Empty title="No portfolio videos" />)}
      {tab === 'reviews' && (reviews.length ? <div className="reviews">{reviews.map((b) => { const a = m.users.find((u) => u.id === b.advertiserId); return (
        <div key={b.id} className="review glass"><Avatar u={a} size={36} /><div><b>{a?.company || a?.name}</b><Stars value={b.reviews.adv!.rating} count={1} small /><p>{b.reviews.adv!.text}</p><span className="muted small">{typeLabel(b.type)} · {new Date(b.reviews.adv!.at).toLocaleDateString('en')}</span></div></div>
      ) })}</div> : <Empty title="No reviews yet" />)}
      <HireModal creator={c} open={hire} onClose={() => setHire(false)} />
    </Page>
  )
}

// Portfolio video player (uploaded samples)
export function VideoDetail({ id }: { id: string }) {
  const m = useMarket()
  const v = m.videos.find((x) => x.id === id)
  const src = useBlobUrl(v?.blobId)
  if (!v) return <Page><Empty title={m.ready ? 'Video not found' : 'Loading…'} /></Page>
  const c = m.users.find((u) => u.id === v.creatorId)
  return (
    <Page>
      <section className="vd">
        <div className="vd-main"><div className="player glass">{src && <video src={src} controls playsInline />}</div><h1 className="vd-t">{v.title}</h1><p className="muted small">{v.category} · {dur(v.duration)}</p><p className="muted pre">{v.description}</p></div>
        <aside className="vd-side">{c && <a className="glass vd-creator" href={`#/creator/${c.id}`}><Avatar u={c} size={44} /><div><b>{c.name}</b><span className="muted small">See open ad slots →</span></div></a>}</aside>
      </section>
    </Page>
  )
}
