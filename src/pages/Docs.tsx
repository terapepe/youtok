import { ReactNode } from 'react'
import cfg from '../config/config.json'
import { activeNetworks, isSingle, primary } from '../config/chains'
import { AD_TYPES, LENGTHS, PAY_TERMS, PLATFORMS, SYMBOL, ZONES, ZONE_KEYS } from '../lib/constants'
import { Page } from '../components/Layout'
import { CaChips, ChainIcon, TokenSection } from '../components/Chain'
import { Icon, I } from '../components/ui'
import { Duo, FormatArt, StepNum } from '../components/Art'
import { ADV_STEPS, CREATOR_STEPS } from './Landing'

const B = cfg.brand
const nets = activeNetworks.map((n) => n.name).join(', ')

const SECTIONS: { key: string; title: string; body: ReactNode }[] = [
  { key: 'intro', title: 'Introduction', body: <>
    <p><b>{B}</b>: {cfg.positioning}</p>
    <p>{B} lets creators <b>pre-sell sponsorship in videos they are about to make</b>. A creator links their channels (YouTube, TikTok, Facebook, X, Instagram, Twitch, Kick, Rumble…), then lists an <b>ad slot</b>: the video length (30 seconds to 30 minutes), platforms, content tags, the ad formats they accept and <b>their own price in {SYMBOL}</b> for each one.</p>
    <p>Advertisers search creators and slots, book the one that fits, send their logo, text or script, and pay in {SYMBOL} according to the slot's payment terms.</p>
    <h4>Why {B}?</h4>
    <ul>
      <li><b>Before you film.</b> Creators know a video is sponsored before production starts.</li>
      <li><b>Every platform, every length.</b> Shorts, reels, long-form, live replays.</li>
      <li><b>Creator-set prices.</b> No algorithmic rate card: the creator types the {SYMBOL} amount.</li>
      <li><b>Clear deal flow.</b> Offers, counter-offers, delivery links, revisions, extensions, disputes, reviews.</li>
      <li><b>Onchain settlement.</b> Wallet-to-wallet {SYMBOL} on {nets}.</li>
    </ul>
  </> },
  { key: 'quickstart', title: 'Quick start', body: <>
    <ol className="nums">
      <li><b>Create an account</b>: <a href="#/auth">sign up</a> with email, or connect a wallet and sign a message (no gas).</li>
      <li><b>Pick a role</b>: Creator or Advertiser. Switch any time in <i>Profile</i>.</li>
      <li><b>Creators</b>: link channels, then <i>Ad slots → New ad slot</i>.</li>
      <li><b>Advertisers</b>: open <a href="#/creators">Explore Creators</a> or <a href="#/slots">Ad Slots</a> and click <i>Book</i>.</li>
      <li><b>Link a wallet</b> in <i>Profile</i>: creators receive {SYMBOL} there, advertisers pay from it.</li>
    </ol>
    <p className="note">This version stores data in your browser (IndexedDB). To test both sides, sign in as a creator, then as an advertiser, in the same browser.</p>
  </> },
  { key: 'creators', title: 'Creator guide', body: <>
    <h4>1. Link your channels</h4><p>Add each channel with its handle, URL, followers and average views. These numbers power search filters and your tier (Nano, Micro, Mid-tier, Macro, Mega). They are shown as <i>self-reported</i>; put your verification code in the channel bio so verification can confirm the channel is yours.</p>
    <h4>2. List an ad slot</h4>
    <ul>
      <li><b>Title & description</b>: the video you will make.</li>
      <li><b>Length</b>: {LENGTHS.map((l) => l.label).join(', ')}.</li>
      <li><b>Platforms</b>: only platforms you have linked. Orientation (16:9 / 9:16).</li>
      <li><b>Tags</b>: up to 10 content tags (e.g. #review #defi #gameplay). Advertisers search by them.</li>
      <li><b>Formats & price</b>: tick the formats you accept and type your {SYMBOL} price for each.</li>
      <li><b>Positions & zones</b>: intro / mid-roll / outro, and where overlays may appear.</li>
      <li><b>Spots</b>: 1–10 sponsors per video, or <i>exclusive</i>.</li>
      <li><b>Publish by</b>: your deadline. Expired slots stop taking bookings.</li>
      <li><b>Payment terms</b>: {PAY_TERMS.map((t) => t.label).join(', ')}.</li>
      <li><b>Not accepted</b>: ad categories you refuse.</li>
    </ul>
    <h4>3. Handle bookings</h4><p><b>Accept</b> the offer, send a <b>counter-offer</b>, or <b>decline</b>. Accepting is blocked once all spots are filled.</p>
    <h4>4. Produce & deliver</h4><p>Make the video with the ad, publish it, then <b>Submit delivery links</b> (platform, URL, time of the ad). For overlay formats, the built-in <b>overlay render tool</b> can burn the booked overlay into your final file.</p>
    <h4>5. Get approved, paid and rated</h4><p>The advertiser approves (or asks for a revision). Payment follows the slot's terms. Report views on each link to build your track record.</p>
  </> },
  { key: 'advertisers', title: 'Advertiser guide', body: <>
    <h4>1. Discover</h4><p><a href="#/creators">Explore Creators</a>: filter by platform, category, size tier, language, rating, price and open slots. <a href="#/slots">Ad Slots</a>: filter by platform, length, tag, format, language, payment terms, orientation and price. Bookmark creators and slots to shortlist them.</p>
    <h4>2. Book</h4><p>Choose a format and position, pick your ad category (blocked categories can't be booked), upload your logo or write your text or script, and place overlays inside the allowed zones on the preview frame.</p>
    <h4>3. Agree the price</h4><p>Send the listed price or your own offer. If the creator counters, accept or decline it.</p>
    <h4>4. Pay by terms</h4><p><b>Upfront</b>: pay 100% after acceptance. <b>50/50</b>: 50% after acceptance, 50% after approval. <b>On delivery</b>: 100% after approval.</p>
    <h4>5. Review delivery</h4><p>Open the links. <b>Approve</b>, <b>Request revision</b> with a note, or <b>Open dispute</b>.</p>
    <h4>6. Rate</h4><p>Both sides leave a 1–5 star review after completion.</p>
  </> },
  { key: 'formats', title: 'Ad formats', body: <>
    <div className="fmt-gallery">{AD_TYPES.map((a) => <div key={a.key} className="glass"><FormatArt type={a.key} /><b>{a.label}</b><span className="muted small">{a.desc}.{a.overlay ? ' Placed and previewed in the editor.' : ''}</span></div>)}</div>
    <h4>Positions</h4><p>Intro (start), mid-roll, outro (end). Overlays also have a duration on screen (2–60 seconds).</p>
    <h4>Overlay zones</h4><ul>{ZONE_KEYS.map((k) => <li key={k}>{ZONES[k].label}</li>)}</ul>
  </> },
  { key: 'scenarios', title: 'Deal scenarios', body: <>
    <p>Every situation in a deal has a defined path:</p>
    <div className="doc-table">{[
      ['Advertiser offers less than the listed price', 'Creator accepts, counters, or declines.'],
      ['Creator counters', 'Advertiser accepts (deal starts) or declines (cancelled).'],
      ['Advertiser changes their mind before acceptance', 'Withdraw the booking at no cost.'],
      ['Slot is fully booked', 'It shows Sold out and stops taking bookings. Creators cannot accept beyond the spots.'],
      ['Exclusive slot', 'Only one sponsor can be accepted.'],
      ['Ad category refused by the creator', 'It cannot be selected or booked.'],
      ['Advertiser books the same slot twice', 'Blocked while an active booking exists.'],
      ['Creator needs more time', 'Ask for more time with a new date. The advertiser accepts (new due date) or declines.'],
      ['Deadline missed', 'The booking is flagged Overdue. The advertiser can cancel it.'],
      ['Delivery is not as agreed', 'The advertiser requests a revision with notes. The creator updates and resubmits.'],
      ['Serious disagreement', 'Either side opens a dispute. The opener can withdraw it, or both agree to cancel.'],
      ['Both want out of an active deal', 'One asks to cancel, the other confirms. Upfront payments already sent are settled between the parties.'],
      ['Payment terms upfront / 50-50', 'A Pay button appears after acceptance for the upfront part.'],
      ['Completed but unpaid', 'Shown as Payment due on both dashboards until paid.'],
      ['Publish date passes with no bookings', 'The slot expires. Duplicate it with a new date.'],
      ['Slot with bookings is removed', 'It can only be closed, not deleted, so booking history stays intact.'],
    ].map(([a, b]) => <div key={a}><b>{a}</b><span>{b}</span></div>)}</div>
  </> },
  { key: 'token', title: `${SYMBOL} token`, body: <>
    <p>{SYMBOL} ({cfg.tokenName}) is the settlement currency of the marketplace. {isSingle ? <>It lives on <b>{primary.name}</b> <ChainIcon n={primary} size={16} />.</> : <>It is live on <b>{nets}</b>. Robinhood, Base and BNB Chain share one EVM contract address; Solana has its own.</>}</p>
    <TokenSection />
  </> },
  { key: 'faq', title: 'FAQ', body: <>
    {[
      ['Is it free to join?', 'Yes. Listing slots and booking is free. Payments are direct token transfers: you only pay network gas.'],
      ['Who sets the price?', `The creator, per ad format, in ${SYMBOL}. Advertisers can make a different offer.`],
      ['Which video lengths are supported?', LENGTHS.map((l) => l.label).join(', ') + '.'],
      ['Which platforms?', Object.values(PLATFORMS).map((p) => p.name).join(', ') + '.'],
      ['Are follower numbers verified?', 'They are self-reported until verified. Each linked channel has a verification code to place in its bio.'],
      ['When does the advertiser pay?', 'It depends on the slot: on delivery, 50/50, or upfront. The terms are shown before booking.'],
      ['Which wallets work?', `EVM wallets (MetaMask, Rabby, OKX, Coinbase Wallet…)${activeNetworks.some((n) => n.vm === 'svm') ? ', and Phantom, Solflare or Backpack for Solana' : ''}.`],
      ['Can I be both a creator and an advertiser?', 'Yes. Switch role in Profile.'],
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
    eyebrow: 'For creators', title: 'Get sponsored before you hit record.', lead: `Link your channels, list the videos you plan to make, type your own ${SYMBOL} price, and get paid for every ad you accept.`, steps: CREATOR_STEPS,
    cards: [[I.link, 'All your channels', 'YouTube, TikTok, Facebook, X, Instagram, Twitch and more.'], [I.clock, 'Any length', '30 seconds to 30 minutes, short or long form.'], [I.tag, 'Your price', `Type your own ${SYMBOL} price per ad format.`], [I.check, 'Your rules', 'Spots, exclusivity, zones, refused categories.'], [I.wallet, 'Your terms', 'On delivery, 50/50 or upfront payment.'], [I.star, 'Your reputation', 'Reviews and completed deals on your profile.']],
    cta: ['Become a Creator', '#/auth?role=creator'], doc: '#/docs/creators',
  },
  advertisers: {
    eyebrow: 'For advertisers', title: 'Book your spot in the next video, not the last one.', lead: 'Search creators and upcoming videos by platform, length, tags and audience. Book, send your creative, approve the delivery, pay in $LIP.', steps: ADV_STEPS,
    cards: [[I.search, 'Smart discovery', 'Platform, length, tags, language, size, rating, price.'], [I.edit, 'Overlay editor', 'Drag and resize your logo or text in allowed zones.'], [I.chat, 'Mentions & segments', 'Send a script for the creator to say on camera.'], [I.tag, 'Offers', 'Pay the listed price or negotiate.'], [I.check, 'Approve first', 'Review delivery links, request revisions.'], [I.chart, 'Campaigns', 'Budgets, spend, reported views and CPM.']],
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
      <section className="section"><div className="grid c3">{a.cards.map(([ic, t, d], i) => <div key={t} className="feat glass"><Duo tone={(['brand', 'accent', 'warn', 'ok'] as const)[i % 4]}><Icon d={ic} size={20} /></Duo><h3>{t}</h3><p className="muted">{d}</p></div>)}</div></section>
      <section className="section"><div className="sec-head"><span className="eyebrow">Workflow</span><h2>How it works</h2></div>
        <ol className="steps">{a.steps.map(([t, d], i) => <li key={t} className="glass"><StepNum n={i + 1} /><b>{t}</b><p>{d}</p></li>)}</ol></section>
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
        <h4>Deals</h4><p>An accepted booking is an agreement between the creator and the advertiser for the shown format, position, deadline, price and payment terms. {B} provides the tools; it is not a party to the agreement.</p>
        <h4>Payments</h4><p>{SYMBOL} transfers are on-chain and irreversible. Always double-check the recipient and network. {B} never holds your funds or keys.</p>
        <h4>Channels</h4><p>Creators must own the channels they link and report follower and view numbers honestly. Misreporting can lead to removal.</p>
        <h4>Data</h4><p>This version stores accounts and media in your own browser. Clearing site data deletes them. Wallet sign-in uses a free message signature — never share your seed phrase.</p>
        <h4>Disclosure</h4><p>Creators are responsible for labelling sponsored content as required by the platforms they publish on and local law.</p>
      </article>
    </Page>
  )
}
