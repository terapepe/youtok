import { ReactNode } from 'react'
import cfg from '../config/config.json'
import { activeNetworks, isSingle, primary } from '../config/chains'
import { AD_TYPES, SYMBOL, ZONES, ZONE_KEYS } from '../lib/constants'
import { Page } from '../components/Layout'
import { CaChips, ChainIcon, TokenSection } from '../components/Chain'
import { Icon, I } from '../components/ui'
import { STEPS } from './Landing'

const B = cfg.brand
const nets = activeNetworks.map((n) => n.name).join(', ')

const SECTIONS: { key: string; title: string; body: ReactNode }[] = [
  { key: 'intro', title: 'Introduction', body: <>
    <p><b>{B}</b> — {cfg.positioning}</p>
    <p>{B} is a two-sided marketplace for <b>in-video advertising</b>. Creators sell space inside their videos — a corner of the frame for a few seconds, a caption, a banner. Brands buy that space directly, choose exactly where and when the ad appears, preview it, and pay the creator in {SYMBOL}.</p>
    <h4>Why {B}?</h4>
    <ul>
      <li><b>Direct.</b> No agency in the middle. Creators set prices, brands see them up front.</li>
      <li><b>Precise.</b> Ads are placed at a chosen position and timestamp, not just "a mention somewhere".</li>
      <li><b>Visual.</b> Every request comes with a live preview inside the real video.</li>
      <li><b>Creator-controlled.</b> Creators decide which zones are for sale and approve every ad.</li>
      <li><b>Onchain settlement.</b> Payments go wallet to wallet in {SYMBOL} on {nets}.</li>
    </ul>
    <h4>Who is it for?</h4>
    <p>YouTubers, TikTokers, streamers, educators, crypto and gaming channels — anyone with an audience and video content. And any brand, project, app or local business that wants to appear in front of that audience.</p>
  </> },
  { key: 'quickstart', title: 'Quick start', body: <>
    <ol className="nums">
      <li><b>Create an account</b> — <a href="#/auth">sign up</a> with email, or connect a wallet and sign a message (no gas).</li>
      <li><b>Pick a role</b> — Creator or Advertiser. You can switch any time in <i>Profile</i>.</li>
      <li><b>Link a wallet</b> — in <i>Profile → Wallets</i>. Creators receive {SYMBOL} there; advertisers pay from it.</li>
      <li><b>Creators</b>: upload a video, set prices and zones. <b>Advertisers</b>: open a video and click <i>Request Ad</i>.</li>
    </ol>
    <p className="note">This version stores accounts, videos and requests in your browser (IndexedDB). Use the same browser to test both roles end-to-end.</p>
  </> },
  { key: 'creators', title: 'Creator guide', body: <>
    <h4>1. Set up your profile</h4><p>Avatar, bio, category, follower count and social links. Advertisers search and sort by these.</p>
    <h4>2. Set prices & zones</h4><p>In <i>Pricing & zones</i>, set a default price for each format. Choose which parts of the frame can be sold:</p>
    <ul>{ZONE_KEYS.map((k) => <li key={k}>{ZONES[k].label}</li>)}</ul>
    <p>Each video can override prices, formats and zones.</p>
    <h4>3. Upload videos</h4><p>MP4, WebM or MOV up to {cfg.maxVideoMB} MB. A thumbnail and duration are extracted automatically. Toggle <i>Open for ad placements</i> to list it in the marketplace.</p>
    <h4>4. Handle requests</h4><p>Every request shows the advertiser, the offer, and a full preview. You can <b>Approve</b>, send a <b>Quote</b> (counter-price), or <b>Reject</b>.</p>
    <h4>5. Publish</h4><p>After approval, click <b>Publish</b>. {B} renders your video with the ad burned in (in real time, in your browser) and makes the sponsored version available on the video page.</p>
    <h4>6. Get paid</h4><p>The advertiser pays the agreed {SYMBOL} amount directly to your linked wallet. Track it under <i>Payments</i> and <i>Analytics</i>.</p>
  </> },
  { key: 'advertisers', title: 'Advertiser guide', body: <>
    <h4>1. Discover</h4><p>Use <a href="#/creators">Explore Creators</a> (filter by category; sort by followers, average views or price) and the <a href="#/videos">Ad Marketplace</a> (filter by format; sort by views, engagement or price). Save creators to a shortlist.</p>
    <h4>2. Create a campaign</h4><p>Group placements by campaign with a name, objective and budget — or create one directly from the editor.</p>
    <h4>3. Place the ad</h4><p>Open the <a href="#/docs/placements">Ad Placement Editor</a>, upload a logo or write text, drag it into an allowed zone, set the start and end seconds, and preview.</p>
    <h4>4. Send & follow up</h4><p>Submit your offer. If the creator quotes a different price, accept or cancel it in <i>Active campaigns</i>.</p>
    <h4>5. Pay on delivery</h4><p>Once the creator publishes, the <b>Pay</b> button appears. Payment is an on-chain {SYMBOL} transfer to the creator's wallet.</p>
    <h4>6. Measure</h4><p>Impressions (plays of the sponsored video), ad views (plays that reached your ad window), clicks on your link, and cost per ad view.</p>
    <h4>Hire for a full campaign</h4><p>On any creator profile, <b>Hire creator</b> sends a brief with budget and deadline. The creator replies with a quote you can accept.</p>
  </> },
  { key: 'placements', title: 'Video Ad Placement', body: <>
    <p>The core of {B}. Three formats:</p>
    <div className="doc-table">{AD_TYPES.map((a) => <div key={a.key}><b>{a.label}</b><span>{a.desc}</span></div>)}</div>
    <h4>Workflow</h4>
    <ol className="nums">{STEPS.map(([t, d]) => <li key={t}><b>{t}.</b> {d}</li>)}</ol>
    <h4>Editor controls</h4>
    <ul>
      <li><b>Drag</b> the ad card to move it; drag the corner handle to resize.</li>
      <li><b>Zones</b> are highlighted — the ad must sit fully inside one allowed zone.</li>
      <li><b>Timing</b>: start/end sliders, or <i>Set start/end = playhead</i>. Minimum 1 second.</li>
      <li><b>Style</b>: text color, background, size, weight, corner radius, opacity.</li>
      <li><b>Preview mode</b> hides the guides and shows the ad only inside its time window.</li>
    </ul>
    <h4>Statuses</h4>
    <p><code>pending</code> → <code>quoted</code> → <code>approved</code> → <code>published</code> → <code>paid</code>, or <code>rejected</code> / <code>cancelled</code>.</p>
  </> },
  { key: 'token', title: `${SYMBOL} token`, body: <>
    <p>{SYMBOL} ({cfg.tokenName}) is the settlement currency of the marketplace. {isSingle ? <>It lives on <b>{primary.name}</b> <ChainIcon n={primary} size={16} />.</> : <>It is live on <b>{nets}</b>. Robinhood, Base and BNB Chain share one EVM contract address; Solana has its own.</>}</p>
    <TokenSection />
  </> },
  { key: 'faq', title: 'FAQ', body: <>
    {[
      ['Is it free to join?', 'Yes. Creating an account, uploading videos and sending requests is free. Payments are a direct token transfer, so you only pay network gas.'],
      ['Can a creator refuse an ad?', 'Always. Every ad needs explicit approval, and creators control which zones of the frame are for sale.'],
      ['When does the advertiser pay?', 'After the creator publishes the sponsored video — pay on delivery.'],
      ['Which wallets work?', `EVM wallets (MetaMask, Rabby, OKX, Coinbase Wallet…) for ${activeNetworks.filter((n) => n.vm === 'evm').map((n) => n.name).join(', ') || 'EVM chains'}${activeNetworks.some((n) => n.vm === 'svm') ? ', and Phantom, Solflare or Backpack for Solana' : ''}.`],
      ['Where is my data stored?', 'In this version, in your browser (IndexedDB). A hosted database schema is included for production deployment.'],
      ['Can I be both a creator and an advertiser?', 'Yes — switch role in Profile at any time.'],
      ['How do I verify the contract address?', `Only trust the address shown on this site and on X (@${cfg.x.split('/').pop()}).`],
    ].map(([q, a]) => <details key={q} className="faq"><summary>{q}</summary><p>{a}</p></details>)}
  </> },
]

export default function Docs({ section = 'intro' }: { section?: string }) {
  const cur = SECTIONS.find((s) => s.key === section) || SECTIONS[0]
  const i = SECTIONS.indexOf(cur)
  return (
    <Page>
      <section className="docs">
        <aside className="docs-nav glass">
          <b>Documentation</b>
          {SECTIONS.map((s) => <a key={s.key} href={`#/docs/${s.key}`} className={s.key === cur.key ? 'on' : ''}>{s.title}</a>)}
          <div className="mt"><CaChips compact /></div>
        </aside>
        <article className="doc">
          <span className="eyebrow">Docs</span><h1>{cur.title}</h1>
          {cur.body}
          <div className="doc-nav">
            {i > 0 ? <a className="btn ghost" href={`#/docs/${SECTIONS[i - 1].key}`}>← {SECTIONS[i - 1].title}</a> : <span />}
            {i < SECTIONS.length - 1 && <a className="btn ghost" href={`#/docs/${SECTIONS[i + 1].key}`}>{SECTIONS[i + 1].title} →</a>}
          </div>
        </article>
      </section>
    </Page>
  )
}

const AUD = {
  creators: {
    eyebrow: 'For creators', title: 'Your videos are ad space. Sell it on your terms.', lead: `List your videos, set your prices, choose where ads may appear — and get paid in ${SYMBOL} for every placement you approve.`,
    cards: [[I.upload, 'Upload once', 'Every video can carry many placements over time.'], [I.tag, 'Your prices', 'Default price per format, overrides per video.'], [I.layers, 'Your zones', 'Sell only the parts of the frame you want.'], [I.check, 'Your approval', 'Approve, quote or reject every single ad.'], [I.wallet, 'Direct payouts', `${SYMBOL} straight to your wallet.`], [I.chart, 'Clear analytics', 'Views, ad views and revenue per video.']],
    cta: ['Become a Creator', '#/auth?role=creator'], doc: '#/docs/creators',
  },
  advertisers: {
    eyebrow: 'For advertisers', title: 'Put your brand inside the content people actually watch.', lead: 'Find creators by niche and audience, place your logo or message at the exact spot and second, preview it, and pay only when it is live.',
    cards: [[I.search, 'Smart discovery', 'Filter by category, followers, views and price.'], [I.edit, 'Visual editor', 'Drag, resize, time and style your ad.'], [I.eye, 'True preview', 'Watch the ad inside the real video first.'], [I.send, 'Direct deals', 'Offers and hire requests go straight to creators.'], [I.wallet, 'Pay on delivery', `Pay in ${SYMBOL} after publication.`], [I.chart, 'Campaign tracking', 'Impressions, ad views, clicks and cost.']],
    cta: ['Start advertising', '#/auth?role=advertiser'], doc: '#/docs/advertisers',
  },
}

export function Audience({ who }: { who: 'creators' | 'advertisers' }) {
  const a = AUD[who]
  return (
    <Page>
      <section className="hero small">
        <div className="hero-l">
          <span className="eyebrow pill">{a.eyebrow}</span><h1>{a.title}</h1><p className="lead">{a.lead}</p>
          <div className="cta-row"><a className="btn lg" href={a.cta[1]}>{a.cta[0]}</a><a className="btn ghost lg" href={a.doc}>Read the guide</a></div>
        </div>
      </section>
      <section className="section"><div className="grid c3">{a.cards.map(([ic, t, d]) => <div key={t} className="feat glass"><Icon d={ic} size={24} /><h3>{t}</h3><p className="muted">{d}</p></div>)}</div></section>
      <section className="section"><div className="sec-head"><span className="eyebrow">Workflow</span><h2>How a placement happens</h2></div>
        <ol className="steps">{STEPS.map(([t, d], i) => <li key={t} className="glass"><span>{String(i + 1).padStart(2, '0')}</span><b>{t}</b><p>{d}</p></li>)}</ol></section>
    </Page>
  )
}

export function Terms() {
  return (
    <Page>
      <article className="doc narrow">
        <h1>Terms & Privacy</h1>
        <p className="muted">Plain-language summary. Not legal advice.</p>
        <h4>Content</h4><p>Creators must own or have rights to every video they upload. Advertisers must own or have rights to every image, logo and claim in their ads. No illegal, deceptive, hateful or adult content.</p>
        <h4>Deals</h4><p>An approved placement forms an agreement between the creator and the advertiser for the shown format, position, timing and price. {B} provides the tools; it is not a party to the agreement.</p>
        <h4>Payments</h4><p>{SYMBOL} transfers are on-chain and irreversible. Always double-check the recipient and network. {B} never holds your funds or keys.</p>
        <h4>Data</h4><p>This version stores accounts and media in your own browser. Clearing site data deletes them. Wallet sign-in uses a free message signature — never share your seed phrase.</p>
        <h4>Disclosure</h4><p>Creators are responsible for labelling sponsored content as required by the platforms they publish on and local law.</p>
      </article>
    </Page>
  )
}
