import { useEffect } from 'react'
import cfg from '../config/config.json'
import { activeNetworks, isSingle, primary } from '../config/chains'
import { useTable } from '../lib/hooks'
import { AD_TYPES, fmt, SYMBOL, tok } from '../lib/constants'
import { Page } from '../components/Layout'
import { ChainIcon, ChainStack, CopyCAButtons, TokenSection } from '../components/Chain'
import { CreatorCard, VideoCard } from '../components/Media'
import { Empty, Icon, I } from '../components/ui'

export const STEPS = [
  ['Pick a creator & video', 'Browse ad-ready videos by niche, audience and price.'],
  ['Choose position & timing', 'Drag your ad into an allowed zone and set start / end seconds.'],
  ['Upload image or write text', 'Logo, product shot, a caption — or both in one card.'],
  ['Preview before sending', 'Watch your ad play inside the real video, frame by frame.'],
  ['Creator approves or quotes', 'Accept, counter with a price, or decline with a note.'],
  ['Creator publishes', 'The ad is rendered into the video and goes live.'],
  ['Track & pay in ' + SYMBOL, 'Both sides see plays and ad views; payment goes wallet to wallet.'],
]

function HeroVisual() {
  // Illustration of the product (not data): a video frame with a draggable ad card and timeline
  return (
    <div className="hero-vis" aria-hidden>
      <div className="hv-frame glass">
        <div className="hv-video">
          <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="hvsky" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#2A2350" /><stop offset="1" stopColor="#15142A" /></linearGradient>
              <radialGradient id="hvsun" cx=".7" cy=".35" r=".35"><stop stopColor="#8B7CFF" stopOpacity=".9" /><stop offset="1" stopColor="#8B7CFF" stopOpacity="0" /></radialGradient>
            </defs>
            <rect width="320" height="180" fill="url(#hvsky)" /><rect width="320" height="180" fill="url(#hvsun)" />
            <path d="M0 140 L60 95 L110 128 L170 80 L230 120 L320 70 V180 H0Z" fill="#1E1B3A" />
            <path d="M0 160 L80 125 L150 150 L230 118 L320 140 V180 H0Z" fill="#121126" />
            <circle cx="70" cy="66" r="18" fill="#35D6C5" opacity=".18" />
          </svg>
          <div className="hv-ad"><img src="/logo.svg" alt="" /><span><b>Your brand here</b><small>Placed by advertiser</small></span></div>
          <div className="hv-zone" />
          <span className="hv-play"><Icon d={I.play} size={22} /></span>
        </div>
        <div className="hv-tl"><span>0:12</span><div><i /><b /></div><span>0:45</span></div>
      </div>
      <div className="hv-chip c1 glass"><Icon d={I.check} size={14} /> Creator approved</div>
      <div className="hv-chip c2 glass"><ChainStack size={16} /> Paid in {SYMBOL}</div>
    </div>
  )
}

export default function Landing({ anchor }: { anchor?: string }) {
  const users = useTable('users'), videos = useTable('videos'), pl = useTable('placements'), tx = useTable('transactions')
  useEffect(() => { if (anchor) setTimeout(() => document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' }), 50) }, [anchor])

  const creators = users.rows.filter((u) => u.role === 'creator')
  const featured = [...creators].sort((a, b) => b.followers - a.followers).slice(0, 4)
  const trending = videos.rows.filter((v) => v.adEnabled).sort((a, b) => b.views - a.views).slice(0, 6)
  const live = pl.rows.filter((p) => p.status === 'published' || p.status === 'paid').length
  const paid = tx.rows.reduce((s, t) => s + t.amount, 0)

  return (
    <Page>
      <section className="hero">
        <div className="hero-l">
          <span className="eyebrow pill">{isSingle ? <><ChainIcon n={primary} size={16} /> Built on {primary.name}</> : <><ChainStack size={16} /> Live on {activeNetworks.map((n) => n.short).join(' · ')}</>}</span>
          <h1>Turn Every Video Into an <span className="grad">Opportunity.</span></h1>
          <p className="lead">{cfg.brand} is a direct marketplace between video creators and brands. Creators sell ad space <i>inside</i> their videos — logos, product shots, captions. Advertisers pick the exact video, spot and second, preview it, and pay in {SYMBOL}. No agencies, no middlemen.</p>
          <div className="cta-row">
            <a className="btn lg" href="#/creators">Explore Creators <Icon d={I.search} size={16} /></a>
            <a className="btn ghost lg" href="#/auth?role=creator">Become a Creator</a>
          </div>
          <div className="cta-row"><CopyCAButtons /></div>
          <p className="tagline">{cfg.tagline}</p>
        </div>
        <HeroVisual />
      </section>

      <section className="stats-band glass" id="sec-stats">
        <div><b>{fmt(creators.length)}</b><span>Creators</span></div>
        <div><b>{fmt(videos.rows.length)}</b><span>Videos uploaded</span></div>
        <div><b>{fmt(videos.rows.filter((v) => v.adEnabled).length)}</b><span>Ad-ready videos</span></div>
        <div><b>{fmt(live)}</b><span>Ads published</span></div>
        <div><b>{tok(paid)}</b><span>Paid to creators</span></div>
      </section>

      <section className="section">
        <div className="sec-head row"><div><span className="eyebrow">Featured creators</span><h2>Creators open for brand deals</h2></div><a className="btn ghost" href="#/creators">View all</a></div>
        {featured.length ? <div className="grid c4">{featured.map((c) => <CreatorCard key={c.id} c={c} videos={videos.rows} />)}</div>
          : <Empty title="No creators yet" text="Be the first creator on the marketplace — set your prices and start receiving ad requests." action={<a className="btn" href="#/auth?role=creator">Become a Creator</a>} />}
      </section>

      <section className="section">
        <div className="sec-head row"><div><span className="eyebrow">Trending</span><h2>Videos available for advertising</h2></div><a className="btn ghost" href="#/videos">Open marketplace</a></div>
        {trending.length ? <div className="grid c3">{trending.map((v) => <VideoCard key={v.id} v={v} c={users.rows.find((u) => u.id === v.creatorId)} />)}</div>
          : <Empty title="No ad-ready videos yet" text="Videos appear here as soon as creators upload them and enable ad placement." action={<a className="btn" href="#/studio/upload">Upload a video</a>} />}
      </section>

      <section className="section" id="sec-how">
        <div className="sec-head"><span className="eyebrow">How {cfg.brand} works</span><h2>From idea to on-screen in seven steps</h2></div>
        <ol className="steps">{STEPS.map(([t, d], i) => <li key={t} className="glass"><span>{String(i + 1).padStart(2, '0')}</span><b>{t}</b><p>{d}</p></li>)}</ol>
      </section>

      <section className="section">
        <div className="sec-head"><span className="eyebrow">Video Ad Placement</span><h2>Three formats. Placed exactly where you want.</h2></div>
        <div className="bento">
          {AD_TYPES.map((a, i) => (
            <div key={a.key} className={`bento-i glass b${i}`}>
              <div className={`fmt-demo t-${a.key}`}>{a.key !== 'text' && <img src="/logo.svg" alt="" />}{a.key !== 'image' && <span>Summer sale · 30% off</span>}</div>
              <h3>{a.label}</h3><p className="muted">{a.desc}.</p>
            </div>
          ))}
          <div className="bento-i glass b3"><Icon d={I.layers} size={26} /><h3>Zones & timing</h3><p className="muted">Creators decide which parts of the frame can be sold. Advertisers choose the exact seconds the ad is on screen.</p></div>
          <div className="bento-i glass b4"><Icon d={I.eye} size={26} /><h3>Live preview</h3><p className="muted">See the ad play inside the real video before anything is sent.</p></div>
        </div>
      </section>

      <section className="section two" id="sec-benefits">
        <div className="benefit glass">
          <span className="eyebrow">For creators</span><h3>Sell ad space, keep control</h3>
          <ul>{['Upload once, sell placements on every video', 'Set your own prices per format and per video', 'Choose which zones of the frame are for sale', 'Approve, counter-quote or decline every request', 'Get paid in ' + SYMBOL + ' straight to your wallet', 'Track plays, ad views and earnings in one place'].map((t) => <li key={t}><Icon d={I.check} size={16} />{t}</li>)}</ul>
          <a className="btn" href="#/for-creators">Creator guide</a>
        </div>
        <div className="benefit glass">
          <span className="eyebrow">For advertisers</span><h3>Buy attention, not guesses</h3>
          <ul>{['Search creators by niche, followers, views and price', 'Pick the exact video, position and seconds', 'Upload a logo or write a message — or both', 'Preview the ad inside the video before paying', 'Send hire requests for full campaigns', 'Track every placement and pay on delivery'].map((t) => <li key={t}><Icon d={I.check} size={16} />{t}</li>)}</ul>
          <a className="btn" href="#/for-advertisers">Advertiser guide</a>
        </div>
      </section>

      <TokenSection />

      <section className="section cta-final glass">
        <h2>{cfg.positioning}</h2>
        <p className="muted">Join as a creator or advertiser in under a minute — email or wallet.</p>
        <div className="cta-row center"><a className="btn lg" href="#/auth?role=creator">I'm a Creator</a><a className="btn ghost lg" href="#/auth?role=advertiser">I'm an Advertiser</a></div>
      </section>
    </Page>
  )
}
