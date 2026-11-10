import { useState } from 'react'
import { db, uid, Placement, User } from '../../lib/db'
import { useAuth } from '../../lib/auth'
import { useTable, go } from '../../lib/hooks'
import { ago, fmt, SYMBOL, tok } from '../../lib/constants'
import { DashShell, NavItem } from '../../components/Layout'
import { Avatar, CreatorCard, VideoCard } from '../../components/Media'
import { Badge, Empty, Field, Icon, I, Modal, Stat } from '../../components/ui'
import { DailyBars, HBars, PayModal, PlacementRow, ProfileForm, setStatus, TxTable, price } from './shared'

export default function Brand({ tab = 'overview' }: { tab?: string }) {
  const { user } = useAuth()
  const users = useTable('users'), videos = useTable('videos'), pls = useTable('placements'), camps = useTable('campaigns'), txs = useTable('transactions'), reqs = useTable('requests')
  if (!user) return null
  const me = user.id
  const myCamps = camps.rows.filter((c) => c.advertiserId === me).sort((a, b) => b.createdAt - a.createdAt)
  const myPl = pls.rows.filter((p) => p.advertiserId === me).sort((a, b) => b.updatedAt - a.updatedAt)
  const myReq = reqs.rows.filter((r) => r.advertiserId === me).sort((a, b) => b.updatedAt - a.updatedAt)
  const myTx = txs.rows.filter((t) => myPl.some((p) => p.id === t.placementId))
  const spent = myTx.reduce((s, t) => s + t.amount, 0)
  const live = myPl.filter((p) => p.status === 'published' || p.status === 'paid')
  const imp = live.reduce((s, p) => s + p.impressions, 0), adv = live.reduce((s, p) => s + p.adViews, 0), clk = live.reduce((s, p) => s + p.clicks, 0)
  const vById = (id: string) => videos.rows.find((v) => v.id === id)
  const uById = (id: string) => users.rows.find((u) => u.id === id)
  const creators = users.rows.filter((u) => u.role === 'creator' && u.acceptsAds && u.id !== me)
  const saved = creators.filter((c) => user.saved.includes(c.id))
  const action = myPl.filter((p) => p.status === 'quoted' || p.status === 'published').length

  const items: NavItem[] = [
    { key: 'overview', label: 'Campaign overview', icon: I.grid }, { key: 'discover', label: 'Discover creators', icon: I.search },
    { key: 'saved', label: 'Saved creators', icon: I.bookmark, count: saved.length }, { key: 'campaigns', label: 'Active campaigns', icon: I.layers, count: action },
    { key: 'create', label: 'Create campaign', icon: I.plus }, { key: 'editor', label: 'Ad placement editor', icon: I.edit },
    { key: 'requests', label: 'Collaboration requests', icon: I.send, count: myReq.filter((r) => r.status === 'quoted').length },
    { key: 'analytics', label: 'Campaign analytics', icon: I.chart }, { key: 'payments', label: 'Payments', icon: I.wallet }, { key: 'profile', label: 'Profile', icon: I.user },
  ]
  const title = items.find((i) => i.key === tab)?.label || 'Overview'
  const feed = myPl.flatMap((p) => p.history.map((h) => ({ ...h, p }))).sort((a, b) => b.at - a.at).slice(0, 6)
  const aside = <>
    <div className="glass pane"><h4>Activity feed</h4>
      {feed.length ? <ul className="feed">{feed.map((f, i) => <li key={i}><Badge s={f.action} /><span className="clamp1">{vById(f.p.videoId)?.title}</span><em>{ago(f.at)}</em></li>)}</ul> : <p className="muted small">No activity yet.</p>}</div>
    <div className="glass pane"><h4>Needs your action</h4>
      {action ? <ul className="todo">{myPl.filter((p) => p.status === 'quoted').length > 0 && <li><a href="#/brand/campaigns"><Icon d={I.tag} size={14} />Review {myPl.filter((p) => p.status === 'quoted').length} quote(s)</a></li>}
        {myPl.filter((p) => p.status === 'published').length > 0 && <li><a href="#/brand/campaigns"><Icon d={I.wallet} size={14} />Pay {myPl.filter((p) => p.status === 'published').length} published ad(s)</a></li>}</ul>
        : <p className="muted small">Nothing pending.</p>}
      <a className="btn block sm mt" href="#/brand/editor"><Icon d={I.plus} size={14} />New placement</a></div>
  </>

  return (
    <DashShell base="#/brand" title={tab === 'overview' ? 'Advertiser Hub' : title} crumbs={['Advertiser', title]} items={items} tab={tab} aside={tab === 'overview' ? aside : undefined}
      stats={<span className="bal"><small>Spent</small><b>{tok(spent)}</b></span>}>
      {tab === 'overview' && <>
        <div className="stats-row">
          <Stat value={fmt(spent, 2)} label={`Total spent (${SYMBOL})`} icon={I.wallet} />
          <Stat value={fmt(imp)} label="Impressions" icon={I.eye} />
          <Stat value={fmt(adv)} label="Ad views" icon={I.bolt} />
          <Stat value={imp ? ((adv / imp) * 100).toFixed(1) + '%' : '—'} label="Ad view rate" icon={I.chart} />
        </div>
        <div className="sec-head row"><h3>Recent placements</h3><a className="btn ghost sm" href="#/brand/campaigns">All campaigns</a></div>
        {myPl.length ? myPl.slice(0, 5).map((p) => <PlacementRow key={p.id} p={p} v={vById(p.videoId)} other={uById(p.creatorId)}><BrandActions p={p} creator={uById(p.creatorId)} /></PlacementRow>)
          : <Empty title="No campaigns yet" text="Pick an ad-ready video and place your first ad." action={<a className="btn" href="#/videos">Browse videos</a>} />}
        <DailyBars label={`Spend (${SYMBOL})`} points={myTx.map((t) => ({ at: t.createdAt, v: t.amount }))} />
      </>}

      {tab === 'discover' && <>
        <div className="sec-head row"><h3>Top creators</h3><a className="btn ghost sm" href="#/creators">Full search & filters</a></div>
        {creators.length ? <div className="grid c3">{[...creators].sort((a, b) => b.followers - a.followers).slice(0, 9).map((c) => <CreatorCard key={c.id} c={c} videos={videos.rows} />)}</div> : <Empty title="No creators yet" />}
        <div className="sec-head row mt"><h3>Ad-ready videos</h3><a className="btn ghost sm" href="#/videos">Marketplace</a></div>
        <div className="grid c3">{videos.rows.filter((v) => v.adEnabled && v.creatorId !== me).sort((a, b) => b.views - a.views).slice(0, 6).map((v) => <VideoCard key={v.id} v={v} c={uById(v.creatorId)} />)}</div>
      </>}

      {tab === 'saved' && (saved.length ? <div className="grid c3">{saved.map((c) => <CreatorCard key={c.id} c={c} videos={videos.rows} />)}</div>
        : <Empty title="No saved creators" text="Save creators from their profile to build a shortlist." action={<a className="btn" href="#/creators">Explore creators</a>} />)}

      {tab === 'campaigns' && (myCamps.length ? myCamps.map((c) => {
        const ps = myPl.filter((p) => p.campaignId === c.id)
        return (
          <section key={c.id} className="camp">
            <div className="camp-h"><div><h3>{c.name}</h3><span className="muted small">{c.brand} · {c.objective || 'No objective set'} · budget {tok(c.budget)} · {ps.length} placement(s)</span></div>
              <Badge s={c.status} /><a className="btn ghost sm" href={`#/editor?campaign=${c.id}`} onClick={(e) => { e.preventDefault(); go(`/editor/${ps[0]?.videoId || ''}?campaign=${c.id}`) }}><Icon d={I.plus} size={14} />Add placement</a></div>
            {ps.length ? ps.map((p) => <PlacementRow key={p.id} p={p} v={vById(p.videoId)} other={uById(p.creatorId)}><BrandActions p={p} creator={uById(p.creatorId)} /></PlacementRow>) : <p className="muted small">No placements yet.</p>}
          </section>
        )
      }) : <Empty title="No campaigns" action={<a className="btn" href="#/brand/create">Create campaign</a>} />)}

      {tab === 'create' && <CreateCampaign me={user} />}

      {tab === 'editor' && <>
        <p className="muted">Choose a video to open the placement editor.</p>
        <div className="grid c3">{videos.rows.filter((v) => v.adEnabled && v.creatorId !== me).map((v) => <VideoCard key={v.id} v={v} c={uById(v.creatorId)} />)}</div>
        {!videos.rows.some((v) => v.adEnabled && v.creatorId !== me) && <Empty title="No ad-ready videos yet" />}
      </>}

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
      }) : <Empty title="No collaboration requests" text="Hire a creator from their profile page." action={<a className="btn" href="#/creators">Explore creators</a>} />)}

      {tab === 'analytics' && <>
        <div className="stats-row"><Stat value={fmt(imp)} label="Impressions" /><Stat value={fmt(adv)} label="Ad views" /><Stat value={fmt(clk)} label="Link clicks" /><Stat value={adv ? (spent / adv).toFixed(3) : '—'} label={`Cost per ad view (${SYMBOL})`} /></div>
        <div className="two-col">
          <HBars label="Ad views by campaign" rows={myCamps.map((c) => ({ name: c.name, v: myPl.filter((p) => p.campaignId === c.id).reduce((s, p) => s + p.adViews, 0) }))} />
          <HBars label="Ad views by creator" rows={[...new Set(live.map((p) => p.creatorId))].map((id) => ({ name: uById(id)?.name || '—', v: live.filter((p) => p.creatorId === id).reduce((s, p) => s + p.adViews, 0) }))} />
        </div>
      </>}

      {tab === 'payments' && <><div className="stats-row"><Stat value={fmt(spent, 2)} label={`Paid (${SYMBOL})`} /><Stat value={fmt(myPl.filter((p) => p.status === 'published').reduce((s, p) => s + price(p), 0), 2)} label="Due" /><Stat value={myTx.length} label="Transactions" /></div>
        <TxTable rows={myTx} me={[user.wallets.evm, user.wallets.sol].filter(Boolean) as string[]} /></>}

      {tab === 'profile' && <ProfileForm />}
    </DashShell>
  )
}

function BrandActions({ p, creator }: { p: Placement; creator?: User }) {
  const { user } = useAuth()
  const [pay, setPay] = useState(false)
  const me = user!.id
  if (p.status === 'quoted') return <>
    <button className="btn sm" onClick={() => setStatus(p, me, 'approved', { quote: p.quote }, `Accepted quote ${p.quote} ${SYMBOL}`)}>Accept {tok(p.quote)}</button>
    <button className="btn ghost sm danger" onClick={() => setStatus(p, me, 'cancelled')}>Cancel</button>
  </>
  if (p.status === 'pending') return <button className="btn ghost sm danger" onClick={() => setStatus(p, me, 'cancelled')}>Withdraw</button>
  if (p.status === 'published') return <><button className="btn sm" onClick={() => setPay(true)}><Icon d={I.wallet} size={14} />Pay</button><PayModal p={p} creator={creator} open={pay} onClose={() => setPay(false)} /></>
  return null
}

function CreateCampaign({ me }: { me: User }) {
  const [f, setF] = useState({ name: '', brand: me.company || me.name, objective: '', budget: '' })
  const [err, setErr] = useState('')
  const [done, setDone] = useState('')
  const save = async () => {
    if (!f.name.trim()) return setErr('Name the campaign.')
    const id = uid()
    await db.put('campaigns', { id, advertiserId: me.id, name: f.name.trim(), brand: f.brand.trim(), objective: f.objective.trim(), budget: Number(f.budget) || 0, status: 'active', createdAt: Date.now() })
    setDone(id)
  }
  return (
    <div className="form-grid">
      <div className="glass pane">
        <h4>New campaign</h4>
        <Field label="Campaign name"><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Spring product launch" /></Field>
        <Field label="Brand"><input value={f.brand} onChange={(e) => setF({ ...f, brand: e.target.value })} /></Field>
        <Field label="Objective"><select value={f.objective} onChange={(e) => setF({ ...f, objective: e.target.value })}><option value="">Choose…</option>{['Brand awareness', 'Product launch', 'Website traffic', 'Token / community growth', 'App installs', 'Event promotion'].map((o) => <option key={o}>{o}</option>)}</select></Field>
        <Field label={`Budget (${SYMBOL})`}><input type="number" min="0" value={f.budget} onChange={(e) => setF({ ...f, budget: e.target.value })} /></Field>
        {err && <p className="err">{err}</p>}
        <button className="btn block" onClick={save}>Create campaign</button>
      </div>
      <div className="glass pane">
        <h4>Next steps</h4>
        <ol className="nums"><li>Create the campaign.</li><li>Pick ad-ready videos in the marketplace.</li><li>Place your ad in the editor and submit.</li><li>Creators approve or quote; you pay in {SYMBOL} once the ad is live.</li></ol>
        <Modal open={!!done} onClose={() => setDone('')} title="Campaign created">
          <p>Now add placements to it.</p>
          <div className="cta-row"><button className="btn" onClick={() => go(`/videos`)}>Browse videos</button><button className="btn ghost" onClick={() => go('/brand/campaigns')}>View campaigns</button></div>
        </Modal>
      </div>
    </div>
  )
}
