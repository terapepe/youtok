import { ReactNode, useState } from 'react'
import { useAccount } from 'wagmi'
import { useWallet } from '@solana/wallet-adapter-react'
import cfg from '../config/config.json'
import { isSingle, primary } from '../config/chains'
import { ConnectModal } from '../wallet/ConnectModal'
import { useAuth } from '../lib/auth'
import { short } from '../lib/constants'
import { CaChips, ChainIcon, ChainStack } from './Chain'
import { Avatar } from './Media'
import { Icon, I, Logo } from './ui'

export function WalletButton({ className = 'btn' }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const evm = useAccount(), sol = useWallet()
  const addr = evm.address || sol.publicKey?.toBase58()
  return <>
    <button className={className} onClick={() => setOpen(true)}><Icon d={I.wallet} size={16} />{addr ? short(addr) : 'Connect Wallet'}</button>
    <ConnectModal open={open} onClose={() => setOpen(false)} />
  </>
}

export function AnnounceBar() {
  return (
    <div className="announce">
      <span className="hide-sm">{isSingle ? <><ChainIcon n={primary} size={14} /> ${cfg.symbol} is live on {primary.name}</> : <><ChainStack size={14} /> ${cfg.symbol} · multichain</>}</span>
      <CaChips />
    </div>
  )
}

export function Nav() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const dash = user ? (user.role === 'creator' ? '#/studio' : '#/brand') : '#/auth'
  const links: [string, string][] = [['#/creators', 'Explore Creators'], ['#/videos', 'Ad Marketplace'], ['#/#sec-how', 'How It Works'], ['#/for-creators', 'For Creators'], ['#/for-advertisers', 'For Advertisers'], ['#/docs', 'Docs']]
  return (
    <header className="nav">
      <Logo />
      <nav className={open ? 'open' : ''} onClick={() => setOpen(false)}>
        {links.map(([h, l]) => <a key={h} href={h}>{l}</a>)}
      </nav>
      <div className="nav-r">
        <WalletButton className="btn ghost hide-sm" />
        {user ? <a className="me" href={dash}><Avatar u={user} size={30} /><span className="hide-sm">Dashboard</span></a> : <a className="btn" href="#/auth">Sign in</a>}
        <button className="burger" onClick={() => setOpen(!open)} aria-label="Menu"><Icon d={I.menu} /></button>
      </div>
    </header>
  )
}

export function Footer() {
  const x = cfg.x.split('/').pop()
  return (
    <footer className="footer">
      <div className="foot-top">
        <div className="foot-brand">
          <Logo />
          <p className="muted">{cfg.positioning}</p>
          <CaChips />
        </div>
        <div><h5>Marketplace</h5><a href="#/creators">Explore creators</a><a href="#/videos">Ad-ready videos</a><a href="#/for-creators">For creators</a><a href="#/for-advertisers">For advertisers</a></div>
        <div><h5>Docs</h5><a href="#/docs/intro">Introduction</a><a href="#/docs/creators">Creator guide</a><a href="#/docs/advertisers">Advertiser guide</a><a href="#/docs/token">${cfg.symbol} token</a><a href="#/docs/faq">FAQ</a></div>
        <div><h5>Community</h5><a href={cfg.x} target="_blank" rel="noreferrer">X · @{x}</a><a href="#/terms">Terms</a><a href="#/terms">Privacy</a></div>
      </div>
      <div className="foot-b"><span>© {new Date().getFullYear()} {cfg.brand}. {cfg.tagline}</span><span className="muted">Never share your seed phrase. {cfg.brand} will never DM you first.</span></div>
    </footer>
  )
}

export type NavItem = { key: string; label: string; icon: string; count?: number }

// Dashboard shell: icon rail + sidebar + topbar (layout inspired by the reference)
export function DashShell({ base, title, crumbs, items, tab, children, aside, stats }: {
  base: string; title: string; crumbs: string[]; items: NavItem[]; tab: string; children: ReactNode; aside?: ReactNode; stats?: ReactNode
}) {
  const { user, logout } = useAuth()
  const [q, setQ] = useState('')
  const [menu, setMenu] = useState(false)
  return (
    <div className="dash">
      <aside className="rail">
        <a href="#/" title="Home"><img src="/logo.svg" width={34} height={34} alt={cfg.brand} /></a>
        <a href="#/studio" className={base === '#/studio' ? 'on' : ''} title="Creator Studio"><Icon d={I.video} /></a>
        <a href="#/brand" className={base === '#/brand' ? 'on' : ''} title="Advertiser"><Icon d={I.bolt} /></a>
        <a href="#/docs" title="Docs"><Icon d={I.book} /></a>
        <span className="grow" />
        <button onClick={() => { logout(); location.hash = '#/' }} title="Sign out"><Icon d={I.logout} /></button>
      </aside>
      <aside className={`side${menu ? ' open' : ''}`} onClick={() => setMenu(false)}>
        <div className="side-me">
          <Avatar u={user} size={40} />
          <div><b>{user?.name}</b><span className="muted small">{user?.role === 'creator' ? 'Creator' : 'Advertiser'} · @{user?.handle}</span></div>
        </div>
        <label className="side-search" onClick={(e) => e.stopPropagation()}>
          <Icon d={I.search} size={15} />
          <input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (location.hash = `#/${user?.role === 'creator' ? 'videos' : 'creators'}?q=${encodeURIComponent(q)}`)} />
        </label>
        <nav>{items.map((it) => (
          <a key={it.key} href={`${base}/${it.key}`} className={tab === it.key ? 'on' : ''}>
            <Icon d={it.icon} size={17} />{it.label}{!!it.count && <em>{it.count}</em>}
          </a>
        ))}</nav>
        <div className="side-f muted small">© {cfg.brand} · <a href="#/terms">Terms</a> · <a href="#/docs">Docs</a></div>
      </aside>
      <main className="dash-main">
        <div className="topbar">
          <button className="burger show" onClick={() => setMenu(!menu)} aria-label="Menu"><Icon d={I.menu} /></button>
          <div>
            <h1>{title}</h1>
            <div className="crumbs">{crumbs.map((c, i) => <span key={i}>{c}</span>)}</div>
          </div>
          <span className="grow" />
          <span className="hide-md"><CaChips compact /></span>
          {stats}
          <WalletButton className="btn ghost sm" />
        </div>
        <div className={`dash-body${aside ? ' with-aside' : ''}`}>
          <div className="dash-content">{children}</div>
          {aside && <aside className="dash-aside">{aside}</aside>}
        </div>
      </main>
    </div>
  )
}

export function Page({ children }: { children: ReactNode }) {
  return <><AnnounceBar /><Nav /><main className="page">{children}</main><Footer /></>
}
