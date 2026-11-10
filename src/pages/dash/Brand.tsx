import { useState } from 'react'
import { db, uid, User } from '../../lib/db'
import { useAuth } from '../../lib/auth'
import { useTable, useMarket, go } from '../../lib/hooks'
import { ago, fmt, followersOf, isLive, overdue, priceOf, SYMBOL, tok, typeLabel, PLATFORMS } from '../../lib/constants'
import { DashShell, NavItem } from '../../components/Layout'
import { Avatar, CreatorCard, SlotCard } from '../../components/Media'
import { Badge, Empty, Field, Icon, I, Modal, Stat } from '../../components/ui'
import { BookingModal, BookingRow, DailyBars, HBars, paymentDue, ProfileForm, ReviewList, TxTable } from './shared'

export default function Brand({ tab = 'overview' }: { tab?: string }) {
  const { user } = useAuth()
  const m = useMarket()
  const camps = useTable('campaigns'), txs = useTable('transactions'), reqs = useTable('requests')
  const [openId, setOpenId] = useState('')
  if (!user) return null
  const me = user.id
  const myCamps = camps.rows.filter((c) => c.advertiserId === me).sort((a, b) => b.createdAt - a.createdAt)
  const myBk = m.bookings.filter((b) => b.advertiserId === me).sort((a, b) => b.updatedAt - a.updatedAt)
  const myReq = reqs.rows.filter((r) => r.advertiserId === me).sort((a, b) => b.updatedAt - a.updatedAt)
  const myTx = txs.rows.filter((t) => myBk.some((b) => b.id === t.bookingId))
  const spent = myTx.reduce((s, t) => s + t.amount, 0)
  const slotOf = (id: string) => m.slots.find((s) => s.id === id)
  const uById = (id: string) => m.users.find((u) => u.id === id)
  const paidFor = (id: string) => myTx.filter((t) => t.bookingId === id).reduce((s, t) => s + t.amount, 0)
  const needs = myBk.filter((b) => b.status === 'countered' || b.status === 'delivered' || (b.extension && b.extension.by !== me) || (b.cancelBy && b.cancelBy !== me) || overdue(b) || paymentDue(b, slotOf(b.slotId), paidFor(b.id)).amount > 0)
  const views = myBk.flatMap((b) => b.deliveries).reduce((s, d) => s + (d.views || 0), 0)
  const creators = m.users.filter((u) => u.role === 'creator' && u.listed && u.id !== me)
  const savedC = creators.filter((c) => user.saved.includes(c.id))
  const savedS = m.slots.filter((s) => user.savedSlots.includes(s.id))
  const open = myBk.find((b) => b.id === openId)

  const items: NavItem[] = [
    { key: 'overview', label: 'Overview', icon: I.grid }, { key: 'discover', label: 'Discover', icon: I.search },
    { key: 'saved', label: 'Saved', icon: I.bookmark, count: savedC.length + savedS.length }, { key: 'bookings', label: 'Bookings', icon: I.inbox, count: needs.length },
    { key: 'campaigns', label: 'Campaigns', icon: I.layers }, { key: 'create', label: 'Create campaign', icon: I.plus },
    { key: 'requests', label: 'Custom requests', icon: I.send, count: myReq.filter((r) => r.status === 'quoted').length },
    { key: 'analytics', label: 'Analytics', icon: I.chart }, { key: 'payments', label: 'Payments', icon: I.wallet }, { key: 'reviews', label: 'Reviews', icon: I.star }, { key: 'profile', label: 'Profile', icon: I.user },
  ]
  const title = items.find((i) => i.key === tab)?.label || 'Overview'
  const list = (rows: typeof myBk, empty: string) => rows.length ? rows.map((b) => <BookingRow key={b.id} b={b} slot={slotOf(b.slotId)} other={uById(b.creatorId)} txs={txs.rows} onOpen={() => setOpenId(b.id)} />) : <Empty title={empty} />
  const feed = myBk.flatMap((b) => b.history.map((h) => ({ ...h, b }))).sort((a, b) => b.at - a.at).slice(0, 7)
  const aside = <>
    <div className="glass pane"><h4>Activity</h4>{feed.length ? <ul className="feed">{feed.map((f, i) => <li key={i}><Badge s={f.action}>{f.action.replace(/_/g, ' ')}</Badge><span className="clamp1">{slotOf(f.b.slotId)?.title}</span><em>{ago(f.at)}</em></li>)}</ul> : <p className="muted small">No activity yet.</p>}</div>
    <div className="glass pane"><h4>Quick start</h4><ul className="todo">
      <li><a href="#/creators"><Icon d={I.search} size={14} />Explore creators</a></li><li><a href="#/slots"><Icon d={I.slot} size={14} />Browse ad slots</a></li>
      {!user.wallets.evm && !user.wallets.sol && <li><a href="#/brand/profile"><Icon d={I.wallet} size={14} />Link a wallet to pay</a></li>}
      {!user.company && <li><a href="#/brand/profile"><Icon d={I.user} size={14} />Add your brand name</a></li>}</ul></div>
  </>

  return (
    <DashShell base="#/brand" title={tab === 'overview' ? 'Advertiser Hub' : title} crumbs={['Advertiser', title]} items={items} tab={tab} aside={tab === 'overview' ? aside : undefined}
      stats={<span className="bal"><small>Spent</small><b>{tok(spent)}</b></span>}>
      {tab === 'overview' && <>
        <div className="stats-row">
          <Stat value={fmt(spent, 2)} label={`Spent (${SYMBOL})`} icon={I.wallet} />
          <Stat value={myBk.filter((b) => ['accepted', 'delivered', 'revision'].includes(b.status)).length} label="Bookings in production" icon={I.video} />
          <Stat value={myBk.filter((b) => b.status === 'completed').length} label="Completed" icon={I.check} />
          <Stat value={fmt(views)} label="Sponsored views (reported)" icon={I.eye} />
        </div>
        <div className="sec-head row"><h3>Needs your action</h3><a className="btn ghost sm" href="#/brand/bookings">All bookings</a></div>
        {list(needs.slice(0, 5), 'Nothing waiting on you')}
        <div className="sec-head row mt"><h3>Fresh ad slots</h3><a className="btn ghost sm" href="#/slots">Browse all</a></div>
        <div className="grid c3">{m.slots.filter((s) => isLive(s, m.bookings) && s.creatorId !== me).sort((a, b) => b.createdAt - a.createdAt).slice(0, 3).map((s) => <SlotCard key={s.id} s={s} c={uById(s.creatorId)} bookings={m.bookings} />)}</div>
      </>}

      {tab === 'discover' && <>
        <div className="sec-head row"><h3>Top creators</h3><a className="btn ghost sm" href="#/creators">Full search & filters</a></div>
        {creators.length ? <div className="grid c3">{[...creators].sort((a, b) => followersOf(b) - followersOf(a)).slice(0, 6).map((c) => <CreatorCard key={c.id} c={c} m={m} />)}</div> : <Empty title="No creators yet" />}
        <div className="sec-head row mt"><h3>Open ad slots</h3><a className="btn ghost sm" href="#/slots">All slots</a></div>
        {m.slots.some((s) => isLive(s, m.bookings)) ? <div className="grid c3">{m.slots.filter((s) => isLive(s, m.bookings) && s.creatorId !== me).slice(0, 6).map((s) => <SlotCard key={s.id} s={s} c={uById(s.creatorId)} bookings={m.bookings} />)}</div> : <Empty title="No open slots" />}
      </>}

      {tab === 'saved' && <>
        <h3>Saved ad slots</h3>{savedS.length ? <div className="grid c3">{savedS.map((s) => <SlotCard key={s.id} s={s} c={uById(s.creatorId)} bookings={m.bookings} />)}</div> : <Empty title="No saved slots" text="Tap the bookmark on any slot to shortlist it." />}
        <h3 className="mt">Saved creators</h3>{savedC.length ? <div className="grid c3">{savedC.map((c) => <CreatorCard key={c.id} c={c} m={m} />)}</div> : <Empty title="No saved creators" action={<a className="btn" href="#/creators">Explore creators</a>} />}
      </>}

      {tab === 'bookings' && <>
        <h3>Waiting for you</h3>{list(needs, 'Nothing waiting on you')}
        <h3 className="mt">Waiting for creators</h3>{list(myBk.filter((b) => ['requested', 'accepted', 'revision', 'disputed'].includes(b.status) && !needs.includes(b)), 'Nothing pending')}
        <h3 className="mt">Finished</h3>{list(myBk.filter((b) => ['completed', 'declined', 'cancelled'].includes(b.status) && !needs.includes(b)), 'No finished bookings yet')}
      </>}

      {tab === 'campaigns' && (myCamps.length ? myCamps.map((c) => {
        const bs = myBk.filter((b) => b.campaignId === c.id)
        const cost = bs.filter((b) => !['declined', 'cancelled'].includes(b.status)).reduce((s, b) => s + priceOf(b), 0)
        return (
          <section key={c.id} className="camp">
            <div className="camp-h"><div><h3>{c.name}</h3><span className="muted small">{c.brand} · {c.objective || 'No objective'} · budget {tok(c.budget)} · committed {tok(cost)} · {bs.length} booking(s)</span></div>
              {c.budget > 0 && cost > c.budget && <Badge s="overdue">Over budget</Badge>}
              <Badge s={c.status} />
              <button className="btn ghost sm" onClick={() => db.patch('campaigns', c.id, { status: c.status === 'active' ? 'completed' : 'active' })}>{c.status === 'active' ? 'Mark completed' : 'Reactivate'}</button>
              <a className="btn ghost sm" href="#/slots"><Icon d={I.plus} size={14} />Add booking</a></div>
            {bs.length ? bs.map((b) => <BookingRow key={b.id} b={b} slot={slotOf(b.slotId)} other={uById(b.creatorId)} txs={txs.rows} onOpen={() => setOpenId(b.id)} />) : <p className="muted small">No bookings yet.</p>}
          </section>
        )
      }) : <Empty title="No campaigns" text="Campaigns group your bookings. Create one, or make one while booking a slot." action={<a className="btn" href="#/brand/create">Create campaign</a>} />)}

      {tab === 'create' && <CreateCampaign me={user} />}

      {tab === 'requests' && (myReq.length ? myReq.map((r) => {
        const c = uById(r.creatorId)
        return (
          <div key={r.id} className="prow glass">
            <Avatar u={c} size={40} />
            <div className="prow-main"><b>{c?.name}</b><span className="muted small clamp2">{r.brief}</span>{r.reply && <span className="small">↳ {r.reply}</span>}</div>
            <div className="prow-price"><b>{tok(r.quote ?? r.budget)}</b><span className="muted small">{r.quote != null ? 'quote' : 'budget'}</span></div>
            <Badge s={r.status} />
            <div className="prow-act">{r.status === 'quoted' && <><button className="btn sm" onClick={() => db.patch('requests', r.id, { status: 'accepted', updatedAt: Date.now() })}>Accept</button><button className="btn ghost sm danger" onClick={() => db.patch('requests', r.id, { status: 'declined', updatedAt: Date.now() })}>Decline</button></>}
              {c && <a className="btn ghost sm" href={`#/creator/${c.id}`}>Profile</a>}</div>
          </div>
        )
      }) : <Empty title="No custom requests" text="Send a custom brief from any creator profile." action={<a className="btn" href="#/creators">Explore creators</a>} />)}

      {tab === 'analytics' && <>
        <div className="stats-row">
          <Stat value={fmt(views)} label="Sponsored views (reported)" /><Stat value={views ? (spent / views * 1000).toFixed(2) : '—'} label={`CPM (${SYMBOL} per 1K views)`} />
          <Stat value={myBk.length ? Math.round((myBk.filter((b) => ['accepted', 'delivered', 'revision', 'completed'].includes(b.status)).length / myBk.length) * 100) + '%' : '—'} label="Booking acceptance" />
          <Stat value={myBk.filter((b) => b.status === 'completed').length} label="Completed deals" />
        </div>
        <div className="two-col">
          <HBars label={`Spend by campaign (${SYMBOL})`} rows={myCamps.map((c) => ({ name: c.name, v: myTx.filter((t) => myBk.find((b) => b.id === t.bookingId)?.campaignId === c.id).reduce((s, t) => s + t.amount, 0) })).filter((x) => x.v)} />
          <HBars label="Views by platform" rows={Object.entries(myBk.flatMap((b) => b.deliveries).reduce<Record<string, number>>((a, d) => ({ ...a, [d.platform]: (a[d.platform] || 0) + (d.views || 0) }), {})).map(([k, v]) => ({ name: PLATFORMS[k as keyof typeof PLATFORMS].name, v }))} />
          <HBars label="Views by creator" rows={[...new Set(myBk.map((b) => b.creatorId))].map((id) => ({ name: uById(id)?.name || '—', v: myBk.filter((b) => b.creatorId === id).flatMap((b) => b.deliveries).reduce((s, d) => s + (d.views || 0), 0) })).filter((x) => x.v)} />
          <DailyBars label={`Spend (${SYMBOL})`} points={myTx.map((t) => ({ at: t.createdAt, v: t.amount }))} />
        </div>
      </>}

      {tab === 'payments' && <><div className="stats-row"><Stat value={fmt(spent, 2)} label={`Paid (${SYMBOL})`} /><Stat value={fmt(myBk.reduce((s, b) => s + paymentDue(b, slotOf(b.slotId), paidFor(b.id)).amount, 0), 2)} label="Due now" /><Stat value={myTx.length} label="Transactions" /></div>
        <TxTable rows={myTx} me={[user.wallets.evm, user.wallets.sol].filter(Boolean) as string[]} /></>}

      {tab === 'reviews' && <ReviewList items={myBk.filter((b) => b.reviews.creator).map((b) => ({ who: uById(b.creatorId), r: b.reviews.creator!, label: typeLabel(b.type) }))} />}

      {tab === 'profile' && <ProfileForm />}

      {open && <BookingModal b={open} slot={slotOf(open.slotId)} creator={uById(open.creatorId)} advertiser={user} txs={txs.rows} sample={m.videos.find((v) => v.id === slotOf(open.slotId)?.sampleVideoId)} onClose={() => setOpenId('')} />}
    </DashShell>
  )
}

function CreateCampaign({ me }: { me: User }) {
  const [f, setF] = useState({ name: '', brand: me.company || me.name, objective: '', budget: '' })
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)
  const save = async () => {
    if (!f.name.trim()) return setErr('Name the campaign.')
    await db.put('campaigns', { id: uid(), advertiserId: me.id, name: f.name.trim(), brand: f.brand.trim(), objective: f.objective, budget: Number(f.budget) || 0, status: 'active', createdAt: Date.now() })
    setDone(true)
  }
  return (
    <div className="form-grid">
      <div className="glass pane">
        <h4>New campaign</h4>
        <Field label="Campaign name"><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Token launch Q1" /></Field>
        <Field label="Brand"><input value={f.brand} onChange={(e) => setF({ ...f, brand: e.target.value })} /></Field>
        <Field label="Objective"><select value={f.objective} onChange={(e) => setF({ ...f, objective: e.target.value })}><option value="">Choose…</option>{['Brand awareness', 'Product launch', 'Website traffic', 'Token / community growth', 'App installs', 'Event promotion'].map((o) => <option key={o}>{o}</option>)}</select></Field>
        <Field label={`Budget (${SYMBOL})`} hint="You get a warning when bookings go over budget"><input type="number" min="0" value={f.budget} onChange={(e) => setF({ ...f, budget: e.target.value })} /></Field>
        {err && <p className="err">{err}</p>}
        <button className="btn block" onClick={save}>Create campaign</button>
      </div>
      <div className="glass pane">
        <h4>Next steps</h4>
        <ol className="nums"><li>Create the campaign.</li><li>Find creators and open ad slots.</li><li>Book slots into this campaign.</li><li>Approve the deliveries and pay in {SYMBOL}.</li></ol>
      </div>
      <Modal open={done} onClose={() => setDone(false)} title="Campaign created">
        <p>Now book ad slots into it.</p>
        <div className="cta-row"><button className="btn" onClick={() => go('/slots')}>Browse ad slots</button><button className="btn ghost" onClick={() => go('/brand/campaigns')}>View campaigns</button></div>
      </Modal>
    </div>
  )
}
