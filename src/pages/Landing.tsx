import { useEffect } from 'react'
import cfg from '../config/config.json'
import { activeNetworks, isSingle, primary } from '../config/chains'
import { useMarket, useTable } from '../lib/hooks'
import { AD_TYPES, followersOf, fmt, isLive, LENGTHS, PLATFORMS, PLATFORM_KEYS, SYMBOL, tok, dealsDone } from '../lib/constants'
import { Page } from '../components/Layout'
import { ChainIcon, ChainStack, CopyCAButtons, TokenSection } from '../components/Chain'
import { CreatorCard, PlatformBadge, PlatformStack, SlotCard } from '../components/Media'
import { Empty, Icon, I } from '../components/ui'

export const CREATOR_STEPS = [
  ['Link your channels', 'YouTube, TikTok, Facebook, X, Instagram, Twitch… followers and views build your profile.'],
  ['List an ad slot', 'Say what you will make: 30s, 1, 3, 5, 10 or 30 min, platforms and content tags.'],
  ['Set your $LIP price', 'Type your own price for each ad format you accept. Choose spots and payment terms.'],
  ['Accept bookings', 'Approve, counter-offer or decline. Every booking shows the brand, assets and script.'],
  ['Publish & submit links', 'Make the video with the ad, post it, paste the links as proof of delivery.'],
  ['Get paid & reviewed', 'The brand approves and pays in $LIP to your wallet. Ratings grow your profile.'],
]
export const ADV_STEPS = [
  ['Search creators & slots', 'Filter by platform, video length, tags, category, language, followers, price.'],
  ['Book a slot', 'Pick an ad format and position: intro, mid-roll or outro.'],
  ['Upload logo or write text', 'Drag and resize the overlay on a preview, or write the script for a verbal mention.'],
  ['Agree the price', 'Pay the creator\'s price, or make an offer and negotiate.'],
  ['Review the delivery', 'Check the published video links. Approve, ask for a revision, or open a dispute.'],
  ['Pay & rate', 'Pay in $LIP according to the slot\'s terms, then rate the creator.'],
]

function HeroVisual() {
  // Illustration of the product UI (example, not marketplace data)
  return (
    <div className="hero-vis" aria-hidden>
      <div className="hv-slot glass">
        <span className="eyebrow">Example ad slot</span>
        <div className="hv-row"><PlatformStack list={['youtube', 'tiktok', 'x']} size={24} /><span className="len-pill">3 min</span><span className="len-pill">16:9</span></div>
        <b>Next week: I test 5 new DeFi apps so you don't have to</b>
        <div className="tags"><span>#defi</span><span>#review</span><span>#tutorial</span></div>
        <div className="hv-frame2"><div className="hv-ad"><img src="/logo.svg" alt="" /><span><b>Your brand here</b><small>Logo + text overlay · mid-roll</small></span></div></div>
        <ul className="fmt-prices"><li><span>Logo overlay</span><b>Creator's price in {SYMBOL}</b></li><li><span>Verbal mention</span><b>Creator's price in {SYMBOL}</b></li></ul>
      </div>
      <div className="hv-chip c1 glass"><Icon d={I.check} size={14} /> Booking accepted</div>
      <div className="hv-chip c2 glass"><ChainStack size={16} /> Paid in {SYMBOL}</div>
    </div>
  )
}

export default function Landing({ anchor }: { anchor?: string }) {
  const m = useMarket()
  const tx = useTable('transactions')
  useEffect(() => { if (anchor) setTimeout(() => document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' }), 50) }, [anchor])

  const creators = m.users.filter((u) => u.role === 'creator' && u.listed)
  const live = m.slots.filter((s) => isLive(s, m.bookings))
  const featured = [...creators].sort((a, b) => dealsDone(b.id, m.bookings) - dealsDone(a.id, m.bookings) || followersOf(b) - followersOf(a)).slice(0, 4)
  const fresh = [...live].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6)
  const uById = (id: string) => m.users.find((u) => u.id === id)
  const tags = Object.entries(live.flatMap((s) => s.tags).reduce<Record<string, number>>((a, t) => ({ ...a, [t]: (a[t] || 0) + 1 }), {})).sort((a, b) => b[1] - a[1]).slice(0, 18)

  return (
    <Page>
      <section className="hero">
        <div className="hero-l">
          <span className="eyebrow pill">{isSingle ? <><ChainIcon n={primary} size={16} /> Built on {primary.name}</> : <><ChainStack size={16} /> Live on {activeNetworks.map((n) => n.short).join(' · ')}</>}</span>
          <h1>Sell the ad <span className="grad">before you film.</span></h1>
          <p className="lead">Creators link their <b>YouTube, TikTok, Facebook, X</b> and other channels, then list the videos they're about to make: <b>30 seconds to 30 minutes</b>, with content tags and their own <b>{SYMBOL}</b> price. Brands search, book the slot, send their logo or script, and pay in {SYMBOL}.</p>
          <div className="cta-row">
            <a className="btn lg" href="#/creators">Explore Creators <Icon d={I.search} size={16} /></a>
            <a className="btn ghost lg" href="#/auth?role=creator">List my first ad slot</a>
          </div>
          <div className="cta-row"><CopyCAButtons /></div>
          <p className="tagline">{cfg.tagline}</p>
        </div>
        <HeroVisual />
      </section>

      <section className="stats-band glass">
        <div><b>{fmt(creators.length)}</b><span>Creators</span></div>
        <div><b>{fmt(creators.reduce((s, c) => s + c.channels.length, 0))}</b><span>Channels linked</span></div>
        <div><b>{fmt(live.length)}</b><span>Open ad slots</span></div>
        <div><b>{fmt(m.bookings.filter((b) => b.status === 'completed').length)}</b><span>Deals completed</span></div>
        <div><b>{tok(tx.rows.reduce((s, t) => s + t.amount, 0))}</b><span>Paid to creators</span></div>
      </section>

      <section className="section">
        <div className="sec-head"><span className="eyebrow">Every platform</span><h2>Find creators where your audience watches</h2></div>
        <div className="pf-grid">{PLATFORM_KEYS.filter((k) => k !== 'other').map((k) => {
          const n = creators.filter((c) => c.channels.some((ch) => ch.platform === k)).length
          return <a key={k} href={`#/creators?platform=${k}`} className="pf-tile glass" style={{ ['--pf' as string]: PLATFORMS[k].color }}><PlatformBadge p={k} size={36} /><b>{PLATFORMS[k].name}</b><span className="muted small">{n} creator{n === 1 ? '' : 's'}</span></a>
        })}</div>
      </section>

      <section className="section">
        <div className="sec-head row"><div><span className="eyebrow">Featured creators</span><h2>Creators open for brand deals</h2></div><a className="btn ghost" href="#/creators">Explore all creators</a></div>
        {featured.length ? <div className="grid c4">{featured.map((c) => <CreatorCard key={c.id} c={c} m={m} />)}</div>
          : <Empty title="No creators yet" text="Be the first creator on the marketplace: link your channels and list an ad slot." action={<a className="btn" href="#/auth?role=creator">Become a Creator</a>} />}
      </section>

      <section className="section">
        <div className="sec-head row"><div><span className="eyebrow">Fresh ad slots</span><h2>Upcoming videos open for sponsors</h2></div><a className="btn ghost" href="#/slots">All ad slots</a></div>
        <div className="len-strip">{LENGTHS.map((l) => <a key={l.key} href={`#/slots?length=${l.key}`} className="glass"><b>{l.label}</b><span>{live.filter((s) => s.length === l.key).length} open</span></a>)}</div>
        {fresh.length ? <div className="grid c3">{fresh.map((s) => <SlotCard key={s.id} s={s} c={uById(s.creatorId)} bookings={m.bookings} />)}</div>
          : <Empty title="No open ad slots yet" text="Ad slots appear here as soon as creators list the videos they plan to make." action={<a className="btn" href="#/studio/slots">List an ad slot</a>} />}
        {tags.length > 0 && <div className="tag-cloud">{tags.map(([t, n]) => <a key={t} href={`#/slots?tag=${t}`}>#{t}<em>{n}</em></a>)}</div>}
      </section>

      <section className="section" id="sec-how">
        <div className="sec-head"><span className="eyebrow">How {cfg.brand} works</span><h2>Two sides, one simple deal</h2></div>
        <div className="tracks">
          <div><h3><Icon d={I.video} /> For creators</h3><ol className="steps">{CREATOR_STEPS.map(([t, d], i) => <li key={t} className="glass"><span>{String(i + 1).padStart(2, '0')}</span><b>{t}</b><p>{d}</p></li>)}</ol></div>
          <div><h3><Icon d={I.bolt} /> For advertisers</h3><ol className="steps">{ADV_STEPS.map(([t, d], i) => <li key={t} className="glass"><span>{String(i + 1).padStart(2, '0')}</span><b>{t}</b><p>{d}</p></li>)}</ol></div>
        </div>
      </section>

      <section className="section">
        <div className="sec-head"><span className="eyebrow">Ad formats</span><h2>Six ways to appear in a video</h2><p className="muted">Creators choose which formats they sell, and set a {SYMBOL} price for each one.</p></div>
        <div className="bento">
          {AD_TYPES.map((a, i) => (
            <div key={a.key} className={`bento-i glass f${i}`}>
              {a.overlay ? <div className={`fmt-demo t-${a.key}`}>{a.key !== 'text' && <img src="/logo.svg" alt="" />}{a.key !== 'image' && <span>Summer sale · 30% off</span>}</div>
                : <Icon d={a.key === 'mention' ? I.chat : a.key === 'segment' ? I.video : I.link} size={28} />}
              <h3>{a.label}</h3><p className="muted">{a.desc}.</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="sec-head"><span className="eyebrow">Built for real deals</span><h2>Every scenario has a clear path</h2></div>
        <div className="grid c3">
          {[
            [I.wallet, 'Flexible payment terms', 'Pay on delivery, 50/50, or upfront. The creator chooses per slot, and the advertiser sees it before booking.'],
            [I.tag, 'Offers & counter-offers', 'Book at the listed price or make an offer. Creators can accept, counter or decline.'],
            [I.layers, 'Spots & exclusivity', 'Sell one exclusive sponsor or several spots per video. Sold-out slots close automatically.'],
            [I.x, 'Category blocking', 'Creators refuse categories like gambling or politics. Those brands cannot book.'],
            [I.edit, 'Revisions', 'Not as agreed? The advertiser asks for a revision with a note, and the creator updates the links.'],
            [I.clock, 'Deadlines & extensions', 'Overdue bookings are flagged. Creators request a new date; advertisers accept or cancel.'],
            [I.flag, 'Disputes', 'Either side can open a dispute with a reason. The deal is frozen until both agree.'],
            [I.chat, 'Deal chat', 'Every booking has its own message thread and full history.'],
            [I.star, 'Two-way reviews', 'After completion both sides rate each other. Ratings show on every profile.'],
          ].map(([ic, t, d]) => <div key={t} className="feat glass"><Icon d={ic} size={22} /><h3>{t}</h3><p className="muted">{d}</p></div>)}
        </div>
      </section>

      <section className="section two">
        <div className="benefit glass">
          <span className="eyebrow">For creators</span><h3>Get sponsored before you hit record</h3>
          <ul>{['Monetize every video length, from 30s shorts to 30-minute deep dives', 'Your own price in ' + SYMBOL + ' for every format', 'Choose platforms, tags, spots and payment terms', 'Refuse categories you don\'t want', 'Get paid straight to your wallet', 'Build a public rating and deal history'].map((t) => <li key={t}><Icon d={I.check} size={16} />{t}</li>)}</ul>
          <a className="btn" href="#/for-creators">Creator guide</a>
        </div>
        <div className="benefit glass">
          <span className="eyebrow">For advertisers</span><h3>Book exactly the audience you want</h3>
          <ul>{['Search by platform, length, tags, language, followers and price', 'See the creator\'s channels, ratings and past deals', 'Logo, text, verbal mention, segment or link', 'Preview your overlay before booking', 'Approve the delivery before final payment', 'Track every booking and payment in one place'].map((t) => <li key={t}><Icon d={I.check} size={16} />{t}</li>)}</ul>
          <a className="btn" href="#/for-advertisers">Advertiser guide</a>
        </div>
      </section>

      <TokenSection />

      <section className="section cta-final glass">
        <h2>{cfg.positioning}</h2>
        <p className="muted">Join as a creator or advertiser in under a minute, with email or a wallet.</p>
        <div className="cta-row center"><a className="btn lg" href="#/auth?role=creator">I'm a Creator</a><a className="btn ghost lg" href="#/auth?role=advertiser">I'm an Advertiser</a></div>
      </section>
    </Page>
  )
}
