import { ReactNode, useEffect, useRef, useState } from 'react'
import { useAccount } from 'wagmi'
import { useWallet } from '@solana/wallet-adapter-react'
import { db, uid, Booking, BookingStatus, PlatformKey, Slot, Txn, User, Video } from '../../lib/db'
import { useAuth } from '../../lib/auth'
import { useBlobUrl } from '../../lib/hooks'
import { usePay } from '../../lib/pay'
import { renderWithAd } from '../../lib/media'
import { activeNetworks, networks } from '../../config/chains'
import {
  addDays, ago, spotsLeft, CATEGORIES, dateLabel, fmt, LANGUAGES, lengthOf, overdue, PLATFORMS, PLATFORM_KEYS, posLabel, priceOf, short, SYMBOL, termLabel, today, tok, typeLabel, typeOf,
} from '../../lib/constants'
import { AdOverlay, Avatar, MockFrame, PlatformBadge, PlatformStack, Stars, useObjectUrl } from '../../components/Media'
import { ChainIcon } from '../../components/Chain'
import { WalletButton } from '../../components/Layout'
import { Badge, Empty, Field, Icon, I, Modal, Progress } from '../../components/ui'

// ── state transitions ───────────────────────────────────────
export async function act(b: Booking, by: string, action: string, patch: Partial<Booking> = {}, note?: string) {
  await db.patch('bookings', b.id, { ...patch, updatedAt: Date.now(), history: [...b.history, { at: Date.now(), by, action, note }] })
  if (patch.status === 'accepted' && b.status !== 'accepted' && !b.history.some((h) => h.action === 'accepted')) {
    const amount = patch.counter ?? priceOf(b)
    await db.put('contracts', { id: uid(), bookingId: b.id, creatorId: b.creatorId, advertiserId: b.advertiserId, amount, createdAt: Date.now(),
      terms: `${typeLabel(b.type)} at ${posLabel(b.position)}. Creator publishes by ${b.due}. Price ${amount} ${SYMBOL}.` })
  }
}
const st = (s: BookingStatus) => ({ status: s })

// What the advertiser owes right now, given the slot's payment terms
export function paymentDue(b: Booking, slot: Slot | undefined, paid: number) {
  const price = priceOf(b), terms = slot?.payTerms || 'delivery'
  const started = ['accepted', 'delivered', 'revision', 'completed', 'disputed'].includes(b.status)
  if (!started || b.status === 'disputed') return { amount: 0, kind: 'full' as const }
  if (b.status === 'completed') return { amount: Math.max(0, price - paid), kind: (paid > 0 ? 'final' : 'full') as Txn['kind'] }
  if (terms === 'upfront') return { amount: Math.max(0, price - paid), kind: 'full' as const }
  if (terms === 'split') return { amount: Math.max(0, price / 2 - paid), kind: 'upfront' as const }
  return { amount: 0, kind: 'full' as const }
}

// ── rows ─────────────────────────────────────────────────────
export function SlotThumb({ s }: { s?: Slot }) {
  return <div className={`sthumb ${s?.orientation || 'landscape'}`}>{s ? <><span>{lengthOf(s.length).label}</span><PlatformStack list={s.platforms} size={16} /></> : '—'}</div>
}

export function BookingRow({ b, slot, other, txs, onOpen }: { b: Booking; slot?: Slot; other?: User; txs: Txn[]; onOpen: () => void }) {
  const paid = txs.filter((t) => t.bookingId === b.id).reduce((s, t) => s + t.amount, 0)
  const due = paymentDue(b, slot, paid)
  const views = b.deliveries.reduce((s, d) => s + (d.views || 0), 0)
  return (
    <div className="prow glass" onClick={onOpen} role="button">
      <SlotThumb s={slot} />
      <div className="prow-main">
        <b className="clamp1">{slot?.title || 'Removed slot'}</b>
        <span className="muted small">{other && <><Avatar u={other} size={16} /> {other.company || other.name} · </>}{typeLabel(b.type)} · {posLabel(b.position)} · due {dateLabel(b.due)}</span>
        {b.status === 'completed' && <span className="small">{b.deliveries.length} link(s) · {fmt(views)} views reported</span>}
      </div>
      <div className="prow-price"><b>{tok(priceOf(b))}</b>{b.counter != null && b.counter !== b.offer && <span className="muted small">offer {tok(b.offer)}</span>}{paid > 0 && <span className="small ok-t">paid {tok(paid)}</span>}</div>
      <div className="prow-badges"><Badge s={b.status} />{overdue(b) && <Badge s="overdue">Overdue</Badge>}{b.extension && <Badge s="revision">Extension asked</Badge>}{b.cancelBy && <Badge s="cancelled">Cancel asked</Badge>}{due.amount > 0 && <Badge s="requested">Payment due</Badge>}</div>
      <button className="btn ghost sm" onClick={(e) => { e.stopPropagation(); onOpen() }}>Open</button>
    </div>
  )
}

// ── booking detail ───────────────────────────────────────────
export function BookingModal({ b, slot, creator, advertiser, txs, sample, onClose }: {
  b: Booking; slot?: Slot; creator?: User; advertiser?: User; txs: Txn[]; sample?: Video; onClose: () => void
}) {
  const { user } = useAuth()
  const me = user!.id, isCreator = me === b.creatorId
  const [tab, setTab] = useState<'deal' | 'delivery' | 'chat' | 'payments' | 'history'>('deal')
  const paid = txs.filter((t) => t.bookingId === b.id).reduce((s, t) => s + t.amount, 0)
  const due = paymentDue(b, slot, paid)
  const other = isCreator ? advertiser : creator
  return (
    <Modal open onClose={onClose} title={slot?.title || 'Booking'} wide>
      <div className="bk-head">
        <Avatar u={other} size={36} /><div className="grow"><b>{isCreator ? advertiser?.company || advertiser?.name : creator?.name}</b><span className="muted small">{isCreator ? 'Advertiser' : 'Creator'} · booked {ago(b.createdAt)}</span></div>
        <div className="prow-badges"><Badge s={b.status} />{overdue(b) && <Badge s="overdue">Overdue</Badge>}</div>
        <b>{tok(priceOf(b))}</b>
      </div>
      <Actions b={b} slot={slot} creator={creator} isCreator={isCreator} due={due} paid={paid} />
      <div className="seg tabs">{([['deal', 'Deal'], ['delivery', `Delivery (${b.deliveries.length})`], ['chat', `Chat (${b.messages.length})`], ['payments', `Payments`], ['history', 'History']] as const).map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
      {tab === 'deal' && <DealView b={b} slot={slot} sample={sample} />}
      {tab === 'delivery' && <DeliveryView b={b} slot={slot} isCreator={isCreator} sample={sample} />}
      {tab === 'chat' && <Chat b={b} creator={creator} advertiser={advertiser} />}
      {tab === 'payments' && <><ul className="kv"><li><span>Price</span><b>{tok(priceOf(b))}</b></li><li><span>Terms</span><b>{termLabel(slot?.payTerms || 'delivery')}</b></li><li><span>Paid</span><b>{tok(paid)}</b></li><li><span>Due now</span><b>{tok(due.amount)}</b></li></ul>
        <TxTable rows={txs.filter((t) => t.bookingId === b.id)} me={[user!.wallets.evm, user!.wallets.sol].filter(Boolean) as string[]} /></>}
      {tab === 'history' && <ul className="feed">{[...b.history].reverse().map((h, i) => <li key={i}><Badge s={h.action}>{h.action.replace(/_/g, ' ')}</Badge><span>{h.note}</span><em>{ago(h.at)}</em></li>)}</ul>}
    </Modal>
  )
}

function DealView({ b, slot, sample }: { b: Booking; slot?: Slot; sample?: Video }) {
  const img = useBlobUrl(b.imageId), src = useBlobUrl(sample?.blobId)
  const meta = typeOf(b.type)
  return (
    <div className="deal">
      {meta.overlay ? <div className={`ed-stage ${slot?.orientation || 'landscape'}`}>{src ? <video src={src} muted playsInline /> : <MockFrame portrait={slot?.orientation === 'portrait'} />}<AdOverlay p={b} imageUrl={img} /></div>
        : <div className="glass pane script-view"><Icon d={b.type === 'link' ? I.link : I.chat} size={26} /><h4>{meta.label}</h4>{b.script && <blockquote>{b.script}</blockquote>}{img && <img src={img} alt="" className="asset" />}</div>}
      <ul className="kv">
        <li><span>Format</span><b>{meta.label}</b></li><li><span>Position</span><b>{posLabel(b.position)}</b></li>
        {meta.overlay && <li><span>On screen</span><b>{b.showFor}s</b></li>}
        <li><span>Ad category</span><b>{b.adCategory}</b></li>
        {b.text && <li><span>Text</span><b>{b.text}</b></li>}
        {b.link && <li><span>Link</span><b><a href={b.link} target="_blank" rel="noreferrer">{b.link}</a></b></li>}
        <li><span>Due</span><b>{dateLabel(b.due)}</b></li>
        <li><span>Offer</span><b>{tok(b.offer)}</b></li>{b.counter != null && <li><span>Counter-offer</span><b>{tok(b.counter)}</b></li>}
        {b.extension && <li><span>Extension asked</span><b>{dateLabel(b.extension.date)} — {b.extension.note}</b></li>}
        {b.dispute && <li><span>Dispute</span><b>{b.dispute.reason}</b></li>}
      </ul>
      {img && meta.overlay && <a className="btn ghost sm" href={img} download="ad-asset">Download asset</a>}
    </div>
  )
}

function DeliveryView({ b, slot, isCreator, sample }: { b: Booking; slot?: Slot; isCreator: boolean; sample?: Video }) {
  const { user } = useAuth()
  const [views, setViews] = useState<Record<number, string>>({})
  return (
    <div>
      {b.deliveries.length ? <div className="deliv">{b.deliveries.map((d, i) => (
        <div key={i} className="glass pane row-g">
          <PlatformBadge p={d.platform} size={30} />
          <div className="grow"><a href={d.url} target="_blank" rel="noreferrer" className="clamp1">{d.url} ↗</a><span className="muted small">Ad at {d.adAt || '—'} · {ago(d.at)}{d.note ? ` · ${d.note}` : ''}</span></div>
          {isCreator ? <span className="row-g"><input className="w100" type="number" placeholder="Views" value={views[i] ?? d.views ?? ''} onChange={(e) => setViews({ ...views, [i]: e.target.value })} />
            <button className="btn ghost sm" onClick={() => { const ds = [...b.deliveries]; ds[i] = { ...d, views: Number(views[i]) || 0 }; act(b, user!.id, 'views_updated', { deliveries: ds }, `${PLATFORMS[d.platform].name}: ${views[i]} views`) }}>Save</button></span>
            : <b>{d.views != null ? `${fmt(d.views)} views` : 'Views not reported'}</b>}
        </div>))}</div> : <Empty title="No delivery yet" text={isCreator ? 'After publishing the video, submit the links from the actions above.' : 'The creator will submit the published video links here.'} />}
      {isCreator && typeOf(b.type).overlay && <RenderTool b={b} slot={slot} sample={sample} />}
    </div>
  )
}

// Optional tool: burn the overlay into the creator's final video file
function RenderTool({ b }: { b: Booking; slot?: Slot; sample?: Video }) {
  const [file, setFile] = useState<File | null>(null)
  const src = useObjectUrl(file), img = useBlobUrl(b.imageId)
  const [prog, setProg] = useState(-1), [out, setOut] = useState(''), [err, setErr] = useState('')
  const run = async () => {
    setErr(''); setProg(0)
    try { const blob = await renderWithAd(src, b, img, setProg); setOut(URL.createObjectURL(blob)) } catch (e) { setErr((e as Error).message) } finally { setProg(-1) }
  }
  return (
    <div className="glass pane mt">
      <h4><Icon d={I.layers} size={16} /> Overlay render tool</h4>
      <p className="muted small">Upload your finished video and {'YOULIP'} burns the booked overlay in at the agreed position ({posLabel(b.position)}, {b.showFor}s). This runs in your browser in real time, then you download the result and post it.</p>
      <div className="row-g"><input type="file" accept="video/*" onChange={(e) => { setFile(e.target.files?.[0] || null); setOut('') }} />
        {file && prog < 0 && <button className="btn sm" onClick={run}>Render</button>}</div>
      {prog >= 0 && <span className="render"><Progress value={prog * 100} /><small>Rendering {Math.round(prog * 100)}%</small></span>}
      {out && <div className="mt"><video src={out} controls style={{ width: '100%', borderRadius: 12 }} /><a className="btn sm mt" href={out} download={`youlip-${b.id}.webm`}>Download video</a></div>}
      {err && <p className="err">{err}</p>}
    </div>
  )
}

function Chat({ b, creator, advertiser }: { b: Booking; creator?: User; advertiser?: User }) {
  const { user } = useAuth()
  const [t, setT] = useState('')
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => { end.current?.scrollIntoView() }, [b.messages.length])
  const send = async () => { if (!t.trim()) return; await db.patch('bookings', b.id, { messages: [...b.messages, { by: user!.id, text: t.trim(), at: Date.now() }], updatedAt: Date.now() }); setT('') }
  return (
    <div className="chat">
      <div className="chat-log">{b.messages.length ? b.messages.map((msg, i) => { const u = msg.by === b.creatorId ? creator : advertiser; return (
        <div key={i} className={`msg${msg.by === user!.id ? ' me' : ''}`}><Avatar u={u} size={26} /><div><p>{msg.text}</p><span>{u?.name} · {ago(msg.at)}</span></div></div>) }) : <p className="muted small">No messages yet. Agree details here: scripts, brand guidelines, timing.</p>}<div ref={end} /></div>
      <div className="chat-in"><input value={t} onChange={(e) => setT(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Write a message…" /><button className="btn" onClick={send}><Icon d={I.send} size={16} /></button></div>
    </div>
  )
}

// Context-aware actions for each role and status
function Actions({ b, slot, creator, isCreator, due, paid }: { b: Booking; slot?: Slot; creator?: User; isCreator: boolean; due: ReturnType<typeof paymentDue>; paid: number }) {
  const { user } = useAuth()
  const me = user!.id
  const [form, setForm] = useState<'' | 'counter' | 'decline' | 'deliver' | 'extend' | 'revision' | 'dispute' | 'review' | 'pay'>('')
  const [v, setV] = useState({ amount: String(b.offer), text: '', date: addDays(7), platform: (slot?.platforms[0] || 'youtube') as PlatformKey, url: '', adAt: '' })
  const [err, setErr] = useState('')
  const set = (p: Partial<typeof v>) => setV({ ...v, ...p })
  const close = () => { setForm(''); setErr('') }
  const myReview = isCreator ? b.reviews.creator : b.reviews.adv
  const active = ['accepted', 'delivered', 'revision', 'disputed'].includes(b.status)
  const btns: ReactNode[] = []
  const B = (k: string, label: string, fn: () => void, cls = 'btn sm') => btns.push(<button key={k} className={cls} onClick={fn}>{label}</button>)

  if (isCreator) {
    if (b.status === 'requested') { B('acc', `Accept ${tok(b.offer)}`, async () => {
      if (slot && spotsLeft(slot, await db.all('bookings')) < 1) return setErr('All spots on this slot are already filled. Decline or close the slot.')
      act(b, me, 'accepted', st('accepted'))
    }); B('ctr', 'Counter-offer', () => setForm('counter'), 'btn ghost sm'); B('dec', 'Decline', () => setForm('decline'), 'btn ghost sm danger') }
    if (b.status === 'accepted' || b.status === 'revision') { B('del', 'Submit delivery links', () => setForm('deliver')); if (!b.extension) B('ext', 'Ask for more time', () => setForm('extend'), 'btn ghost sm') }
    if (b.status === 'delivered') B('del2', 'Add another link', () => setForm('deliver'), 'btn ghost sm')
  } else {
    if (b.status === 'requested') B('wd', 'Withdraw booking', () => act(b, me, 'cancelled', st('cancelled'), 'Withdrawn by advertiser'), 'btn ghost sm danger')
    if (b.status === 'countered') { B('acc', `Accept ${tok(b.counter)}`, () => act(b, me, 'accepted', st('accepted'), `Accepted counter-offer ${b.counter} ${SYMBOL}`)); B('rej', 'Decline counter', () => act(b, me, 'cancelled', st('cancelled'), 'Counter-offer declined'), 'btn ghost sm danger') }
    if (b.extension && b.extension.by !== me) { B('xa', `Accept new date ${dateLabel(b.extension.date)}`, () => act(b, me, 'extension_accepted', { due: b.extension!.date, extension: undefined })); B('xd', 'Decline extension', () => act(b, me, 'extension_declined', { extension: undefined }), 'btn ghost sm') }
    if (b.status === 'delivered') { B('ok', 'Approve delivery', () => act(b, me, 'completed', st('completed'))); B('rev', 'Request revision', () => setForm('revision'), 'btn ghost sm'); B('dis', 'Open dispute', () => setForm('dispute'), 'btn ghost sm danger') }
    if (overdue(b)) B('od', 'Cancel (overdue)', () => act(b, me, 'cancelled', st('cancelled'), 'Cancelled: creator missed the deadline'), 'btn ghost sm danger')
    if (due.amount > 0) B('pay', `Pay ${tok(due.amount)}`, () => setForm('pay'))
  }
  if (b.status === 'disputed' && b.dispute?.by === me) B('wdis', 'Withdraw dispute', () => act(b, me, 'dispute_withdrawn', { status: b.deliveries.length ? 'delivered' : 'accepted', dispute: undefined }), 'btn ghost sm')
  if (active) {
    if (!b.cancelBy) B('mc', 'Ask to cancel', () => act(b, me, 'cancel_requested', { cancelBy: me }), 'btn ghost sm danger')
    else if (b.cancelBy !== me) B('mc2', 'Agree to cancel', () => act(b, me, 'cancelled', { status: 'cancelled', cancelBy: undefined }, 'Cancelled by mutual agreement'), 'btn ghost sm danger')
    else B('mc3', 'Keep the deal', () => act(b, me, 'cancel_withdrawn', { cancelBy: undefined }), 'btn ghost sm')
  }
  if (b.status === 'completed' && !myReview) B('rv', `Rate the ${isCreator ? 'advertiser' : 'creator'}`, () => { set({ amount: '5' }); setForm('review') }, 'btn ghost sm')

  const submit = async () => {
    setErr('')
    if (form === 'counter') { const n = Number(v.amount); if (!(n > 0)) return setErr('Enter an amount'); await act(b, me, 'countered', { status: 'countered', counter: n }, v.text || `Counter-offer ${n} ${SYMBOL}`) }
    if (form === 'decline') await act(b, me, 'declined', st('declined'), v.text || undefined)
    if (form === 'deliver') {
      if (!/^https?:\/\//.test(v.url)) return setErr('Paste the full link to the published video')
      await act(b, me, 'delivered', { status: 'delivered', deliveries: [...b.deliveries, { platform: v.platform, url: v.url.trim(), adAt: v.adAt, note: v.text || undefined, at: Date.now() }] }, `${PLATFORMS[v.platform].name} link submitted`)
    }
    if (form === 'extend') { if (v.date <= b.due) return setErr('Pick a date after the current deadline'); await act(b, me, 'extension_requested', { extension: { date: v.date, note: v.text, by: me } }, `New date ${v.date}`) }
    if (form === 'revision') { if (!v.text.trim()) return setErr('Explain what needs to change'); await act(b, me, 'revision', st('revision'), v.text) }
    if (form === 'dispute') { if (!v.text.trim()) return setErr('Describe the problem'); await act(b, me, 'disputed', { status: 'disputed', dispute: { by: me, reason: v.text, at: Date.now() } }, v.text) }
    if (form === 'review') { const r = Number(v.amount); if (!(r >= 1 && r <= 5)) return setErr('Choose 1–5 stars'); await act(b, me, 'reviewed', { reviews: { ...b.reviews, [isCreator ? 'creator' : 'adv']: { rating: r, text: v.text, at: Date.now() } } }) }
    close()
  }

  return (
    <div className="bk-actions">
      {b.status === 'disputed' && <p className="note">Disputed: {b.dispute?.reason}. Talk it through in chat. The opener can withdraw the dispute, or both sides can agree to cancel.</p>}
      {b.cancelBy && <p className="note">{b.cancelBy === me ? 'You asked to cancel. Waiting for the other side.' : 'The other side asked to cancel this deal.'} Any upfront {SYMBOL} already paid is settled between the parties.</p>}
      {b.status === 'completed' && due.amount === 0 && paid > 0 && <p className="note ok">Deal completed and fully paid.</p>}
      {btns.length > 0 && <div className="cta-row">{btns}</div>}
      {!form && err && <p className="err">{err}</p>}
      {form && form !== 'pay' && <div className="glass pane mt">
        {form === 'counter' && <Field label={`Your price (${SYMBOL})`}><input type="number" value={v.amount} onChange={(e) => set({ amount: e.target.value })} /></Field>}
        {form === 'deliver' && <><div className="row2"><Field label="Platform"><select value={v.platform} onChange={(e) => set({ platform: e.target.value as PlatformKey })}>{(slot?.platforms || PLATFORM_KEYS).map((p) => <option key={p} value={p}>{PLATFORMS[p].name}</option>)}</select></Field>
          <Field label="Ad appears at (e.g. 1:24)"><input value={v.adAt} onChange={(e) => set({ adAt: e.target.value })} /></Field></div>
          <Field label="Published video link"><input value={v.url} onChange={(e) => set({ url: e.target.value })} placeholder="https://" /></Field></>}
        {form === 'extend' && <Field label="New publish date"><input type="date" min={today()} value={v.date} onChange={(e) => set({ date: e.target.value })} /></Field>}
        {form === 'review' && <Field label="Rating"><div className="star-pick">{[1, 2, 3, 4, 5].map((n) => <button key={n} className={Number(v.amount) >= n ? 'on' : ''} onClick={() => set({ amount: String(n) })}><Icon d={I.star} size={22} /></button>)}</div></Field>}
        <Field label={{ counter: 'Note (optional)', decline: 'Reason (optional)', deliver: 'Note (optional)', extend: 'Reason', revision: 'What needs to change?', dispute: 'What went wrong?', review: 'Comment' }[form]}><textarea rows={3} value={v.text} onChange={(e) => set({ text: e.target.value })} /></Field>
        {err && <p className="err">{err}</p>}
        <div className="cta-row"><button className="btn sm" onClick={submit}>Confirm</button><button className="btn ghost sm" onClick={close}>Cancel</button></div>
      </div>}
      {form === 'pay' && <PayModal b={b} amount={due.amount} kind={due.kind} creator={creator} open onClose={close} />}
    </div>
  )
}

// Advertiser → creator $LIP transfer, recorded with its tx hash
export function PayModal({ b, amount, kind, creator, open, onClose }: { b: Booking; amount: number; kind: Txn['kind']; creator?: User; open: boolean; onClose: () => void }) {
  const { user } = useAuth()
  const { pay, options } = usePay()
  const [net, setNet] = useState(options[0]?.key || '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const n = networks.find((x) => x.key === net)
  const to = n?.vm === 'svm' ? creator?.wallets.sol : creator?.wallets.evm
  const go = async () => {
    if (!n || !user) return
    setErr(''); setBusy(true)
    try {
      const r = await pay(n, to || '', amount)
      await db.put('transactions', { id: uid(), bookingId: b.id, kind, from: r.from, to: to!, amount, network: n.key, txHash: r.hash, status: 'submitted', createdAt: Date.now() })
      await act(b, user.id, 'paid', {}, `Paid ${amount} ${SYMBOL} (${kind}) on ${n.name}`)
      onClose()
    } catch (e) { setErr((e as Error).message.split('\n')[0]) } finally { setBusy(false) }
  }
  return (
    <Modal open={open} onClose={onClose} title={`Pay ${creator?.name || 'creator'}`}>
      <ul className="kv"><li><span>Amount</span><b>{tok(amount)}</b></li><li><span>Type</span><b>{kind}</b></li><li><span>Recipient</span><b>{to ? short(to) : 'No wallet linked for this network'}</b></li></ul>
      {options.length ? <>
        <Field label="Network"><div className="seg">{options.map((o) => <button key={o.key} className={net === o.key ? 'on' : ''} onClick={() => setNet(o.key)}><ChainIcon n={o} size={16} />{o.short}</button>)}</div></Field>
        <div className="cta-row"><WalletButton className="btn ghost" /><button className="btn" disabled={busy || !to} onClick={go}>{busy ? 'Confirm in wallet…' : `Send ${tok(amount)}`}</button></div>
      </> : <p className="muted">{SYMBOL} contract addresses are not published yet. Payments open as soon as the CA is added in config.</p>}
      {err && <p className="err">{err}</p>}
    </Modal>
  )
}

export function TxTable({ rows, me }: { rows: Txn[]; me: string[] }) {
  if (!rows.length) return <Empty title="No payments yet" text={`${SYMBOL} payments appear here after on-chain transfers.`} />
  return (
    <div className="table glass">
      <div className="tr th"><span>Date</span><span>Network</span><span>Direction</span><span>Amount</span><span>Tx</span></div>
      {[...rows].sort((a, b) => b.createdAt - a.createdAt).map((t) => {
        const n = networks.find((x) => x.key === t.network)
        const inbound = me.some((a) => a.toLowerCase() === t.to.toLowerCase())
        return (
          <div key={t.id} className="tr">
            <span>{new Date(t.createdAt).toLocaleString('en')}</span>
            <span>{n && <ChainIcon n={n} size={16} />} {n?.name}</span>
            <span><Badge s={inbound ? 'paid' : 'submitted'}>{inbound ? 'Received' : 'Sent'} · {t.kind}</Badge></span>
            <span><b>{tok(t.amount)}</b></span>
            <span>{n ? <a href={n.txExplorer + t.txHash} target="_blank" rel="noreferrer">{short(t.txHash)} ↗</a> : short(t.txHash)}</span>
          </div>
        )
      })}
    </div>
  )
}

export function DailyBars({ points, label, days = 14 }: { points: { at: number; v: number }[]; label: string; days?: number }) {
  const day = 86400000, start = new Date(); start.setHours(0, 0, 0, 0)
  const buckets = Array.from({ length: days }, (_, i) => { const d = start.getTime() - (days - 1 - i) * day; return { d, v: points.filter((p) => p.at >= d && p.at < d + day).reduce((s, p) => s + p.v, 0) } })
  const max = Math.max(1, ...buckets.map((b) => b.v))
  return (
    <div className="chart glass">
      <div className="chart-h"><b>{label}</b><span className="muted small">last {days} days</span></div>
      <div className="bars">{buckets.map((b) => <div key={b.d} title={`${new Date(b.d).toLocaleDateString('en', { month: 'short', day: 'numeric' })}: ${fmt(b.v, 2)}`}><i style={{ height: `${(b.v / max) * 100}%` }} /></div>)}</div>
      <div className="bars-x"><span>{new Date(buckets[0].d).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span><span>Today</span></div>
    </div>
  )
}

export function HBars({ rows, label }: { rows: { name: string; v: number; sub?: string }[]; label: string }) {
  const max = Math.max(1, ...rows.map((r) => r.v))
  return (
    <div className="chart glass">
      <div className="chart-h"><b>{label}</b></div>
      {rows.length ? <div className="hbars">{rows.map((r, i) => <div key={i}><span className="clamp1">{r.name}</span><Progress value={(r.v / max) * 100} /><b>{r.sub ?? fmt(r.v)}</b></div>)}</div> : <p className="muted small">No data yet.</p>}
    </div>
  )
}

// ── profile & channels ──────────────────────────────────────
export function ChannelsForm() {
  const { user, update } = useAuth()
  const [list, setList] = useState(user!.channels)
  const [nw, setNw] = useState({ platform: 'youtube' as PlatformKey, handle: '', url: '', followers: '', avgViews: '' })
  const [saved, setSaved] = useState(false), [err, setErr] = useState('')
  const add = () => {
    setErr('')
    const handle = nw.handle.trim().replace(/^@/, '')
    if (!handle) return setErr('Enter your channel handle or name')
    if (list.some((c) => c.platform === nw.platform && c.handle.toLowerCase() === handle.toLowerCase())) return setErr('This channel is already linked')
    const base = PLATFORMS[nw.platform].base
    const url = nw.url.trim() || (base ? base + handle : '')
    if (!/^https?:\/\//.test(url)) return setErr('Enter the channel URL')
    setList([...list, { platform: nw.platform, handle, url, followers: Number(nw.followers) || 0, avgViews: Number(nw.avgViews) || 0, code: 'YOULIP-' + uid().slice(0, 6).toUpperCase(), verified: false }])
    setNw({ ...nw, handle: '', url: '', followers: '', avgViews: '' }); setSaved(false)
  }
  const edit = (i: number, p: Partial<typeof list[0]>) => { const l = [...list]; l[i] = { ...l[i], ...p }; setList(l); setSaved(false) }
  return (
    <div className="form-grid">
      <div className="glass pane span2">
        <h4>Linked channels</h4>
        <p className="muted small">Advertisers search by platform, followers and views. Keep your numbers accurate: they are shown as <b>self-reported</b> until verified. Put the verification code in your channel bio so verification can confirm the channel is yours.</p>
        {list.length ? <div className="chan-list">{list.map((c, i) => (
          <div key={i} className="chan-edit">
            <PlatformBadge p={c.platform} size={32} />
            <div className="grow"><b>{PLATFORMS[c.platform].name} · @{c.handle}</b><a className="muted small" href={c.url} target="_blank" rel="noreferrer">{c.url}</a></div>
            <Field label="Followers"><input type="number" min="0" value={c.followers} onChange={(e) => edit(i, { followers: Number(e.target.value) })} /></Field>
            <Field label="Avg views"><input type="number" min="0" value={c.avgViews} onChange={(e) => edit(i, { avgViews: Number(e.target.value) })} /></Field>
            <code className="code" title="Verification code" onClick={() => navigator.clipboard.writeText(c.code)}>{c.code}</code>
            <span className={`badge ${c.verified ? 'ok' : 'muted'}`}>{c.verified ? 'Verified' : 'Self-reported'}</span>
            <button className="btn ghost sm danger" onClick={() => { setList(list.filter((_, j) => j !== i)); setSaved(false) }}>Remove</button>
          </div>))}</div> : <Empty title="No channels linked yet" text="Add at least one channel before listing ad slots." />}
      </div>
      <div className="glass pane span2">
        <h4>Add a channel</h4>
        <div className="pf-pick">{PLATFORM_KEYS.map((k) => <button key={k} className={nw.platform === k ? 'on' : ''} onClick={() => setNw({ ...nw, platform: k })}><PlatformBadge p={k} size={22} />{PLATFORMS[k].name}</button>)}</div>
        <div className="row4">
          <Field label="Handle"><input value={nw.handle} onChange={(e) => setNw({ ...nw, handle: e.target.value })} placeholder="@yourchannel" /></Field>
          <Field label="Channel URL" hint={PLATFORMS[nw.platform].base ? 'Auto-filled from handle if empty' : undefined}><input value={nw.url} onChange={(e) => setNw({ ...nw, url: e.target.value })} placeholder={PLATFORMS[nw.platform].base + (nw.handle.replace('@', '') || 'handle')} /></Field>
          <Field label="Followers / subscribers"><input type="number" min="0" value={nw.followers} onChange={(e) => setNw({ ...nw, followers: e.target.value })} /></Field>
          <Field label="Avg views per video"><input type="number" min="0" value={nw.avgViews} onChange={(e) => setNw({ ...nw, avgViews: e.target.value })} /></Field>
        </div>
        {err && <p className="err">{err}</p>}
        <button className="btn ghost" onClick={add}><Icon d={I.plus} size={16} />Add channel</button>
      </div>
      <div className="save-bar"><button className="btn" onClick={async () => { await update({ channels: list }); setSaved(true) }}>{saved ? 'Saved ✓' : 'Save channels'}</button></div>
    </div>
  )
}

export function ProfileForm() {
  const { user, update } = useAuth()
  const evm = useAccount(), sol = useWallet()
  const [f, setF] = useState(user!)
  const [saved, setSaved] = useState(false)
  useEffect(() => setF(user!), [user?.id])
  if (!user) return null
  const set = (p: Partial<User>) => { setF({ ...f, ...p }); setSaved(false) }
  const img = async (key: 'avatarId' | 'bannerId', file?: File) => { if (file) set({ [key]: await db.putBlob(file) }) }
  const solAddr = sol.publicKey?.toBase58()
  return (
    <div className="form-grid">
      <div className="glass pane">
        <h4>Profile</h4>
        <div className="row-ava"><Avatar u={f} size={64} /><label className="btn ghost sm">Avatar<input hidden type="file" accept="image/*" onChange={(e) => img('avatarId', e.target.files?.[0])} /></label>
          {f.role === 'creator' && <label className="btn ghost sm">Banner<input hidden type="file" accept="image/*" onChange={(e) => img('bannerId', e.target.files?.[0])} /></label>}</div>
        <div className="row2"><Field label="Display name"><input value={f.name} onChange={(e) => set({ name: e.target.value })} /></Field><Field label="Handle"><input value={f.handle} onChange={(e) => set({ handle: e.target.value })} /></Field></div>
        {f.role === 'creator'
          ? <div className="row2"><Field label="Main category"><select value={f.category} onChange={(e) => set({ category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Content language"><select value={f.language} onChange={(e) => set({ language: e.target.value })}>{LANGUAGES.map((c) => <option key={c}>{c}</option>)}</select></Field></div>
          : <Field label="Company / brand"><input value={f.company || ''} onChange={(e) => set({ company: e.target.value })} /></Field>}
        <div className="row2"><Field label="Country"><input value={f.country} onChange={(e) => set({ country: e.target.value })} /></Field><Field label="Website"><input value={f.website || ''} onChange={(e) => set({ website: e.target.value })} placeholder="https://" /></Field></div>
        <Field label="Bio"><textarea rows={3} value={f.bio} onChange={(e) => set({ bio: e.target.value })} /></Field>
        {f.role === 'creator' && <label className="toggle"><input type="checkbox" checked={f.listed} onChange={(e) => set({ listed: e.target.checked })} />Show me in Explore Creators</label>}
      </div>
      <div className="glass pane">
        <h4>Wallets</h4>
        <p className="muted small">{f.role === 'creator' ? `${SYMBOL} payments are sent to these addresses.` : 'Used to pay creators.'} One EVM address covers {activeNetworks.filter((n) => n.vm === 'evm').map((n) => n.short).join(' / ') || 'EVM'}.</p>
        <ul className="kv"><li><span>EVM</span><b>{f.wallets.evm ? short(f.wallets.evm) : '—'}</b></li><li><span>Solana</span><b>{f.wallets.sol ? short(f.wallets.sol) : '—'}</b></li></ul>
        <div className="cta-row">
          <WalletButton className="btn ghost sm" />
          {evm.address && <button className="btn sm" onClick={() => set({ wallets: { ...f.wallets, evm: evm.address!.toLowerCase() } })}>Link EVM {short(evm.address)}</button>}
          {solAddr && <button className="btn sm" onClick={() => set({ wallets: { ...f.wallets, sol: solAddr } })}>Link SOL {short(solAddr)}</button>}
        </div>
        <h4 className="mt">Account</h4>
        <ul className="kv"><li><span>Email</span><b>{user.email || 'Wallet account'}</b></li><li><span>Role</span><b>{f.role}</b></li></ul>
        <button className="btn ghost sm" onClick={async () => { const role = f.role === 'creator' ? 'advertiser' : 'creator'; await update({ role }); location.hash = role === 'creator' ? '#/studio' : '#/brand' }}>Switch to {f.role === 'creator' ? 'Advertiser' : 'Creator'}</button>
      </div>
      <div className="save-bar"><button className="btn" onClick={async () => { await update({ ...f, handle: f.handle.toLowerCase().replace(/[^a-z0-9_]/g, '') }); setSaved(true) }}>{saved ? 'Saved ✓' : 'Save changes'}</button></div>
    </div>
  )
}

export function ReviewList({ items }: { items: { who?: User; r: { rating: number; text: string; at: number }; label: string }[] }) {
  if (!items.length) return <Empty title="No reviews yet" text="Reviews appear after completed deals." />
  return <div className="reviews">{items.map((x, i) => <div key={i} className="review glass"><Avatar u={x.who} size={36} /><div><b>{x.who?.company || x.who?.name}</b><Stars value={x.r.rating} count={1} small /><p>{x.r.text}</p><span className="muted small">{x.label} · {new Date(x.r.at).toLocaleDateString('en')}</span></div></div>)}</div>
}
