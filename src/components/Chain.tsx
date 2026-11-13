import { useState } from 'react'
import cfg from '../config/config.json'
import { activeNetworks, caGroups, CaGroup, chainCount, inkOn, isSingle, Network, primary } from '../config/chains'
import { Icon, I } from './ui'
import { useTokenMarkets } from '../hooks/useTokenMarkets'

export const ChainIcon = ({ n, size = 18 }: { n: Network; size?: number }) => (
  <img className="chain-ico" src={n.icon} alt={n.name} title={n.name} width={size} height={size} />
)
export const ChainStack = ({ nets = activeNetworks, size = 18 }: { nets?: Network[]; size?: number }) => (
  <span className="chain-stack">{nets.map((n) => <ChainIcon key={n.key} n={n} size={size} />)}</span>
)

function useCopy() {
  const [done, setDone] = useState('')
  return { done, copy: (id: string, v: string) => { navigator.clipboard.writeText(v); setDone(id); setTimeout(() => setDone(''), 1300) } }
}

// Compact CA chip(s): announcement bar, dashboard topbar, footer
export function CaChips({ compact }: { compact?: boolean }) {
  const { done, copy } = useCopy()
  return (
    <span className="ca-chips">
      {caGroups.map((g) => (
        <button key={g.id} className="ca-chip" disabled={!g.ca} title={g.ca ? `Copy ${g.tag} contract address` : 'Contract address coming soon'}
          onClick={() => g.ca && copy(g.id, g.ca)}>
          <ChainStack nets={g.nets} size={16} />
          {!compact && <b>{g.tag}</b>}
          <code>{g.ca ? (done === g.id ? 'Copied ✓' : g.ca) : 'CA soon'}</code>
          {g.ca && <Icon d={I.copy} size={13} />}
        </button>
      ))}
    </span>
  )
}

// Hero buttons: full CA + copy icon
export function CopyCAButtons() {
  const { done, copy } = useCopy()
  const live = caGroups.filter((g) => g.ca)
  if (!live.length) return <span className="btn ghost lg" aria-disabled><ChainStack />CA coming soon</span>
  return <>{live.map((g) => {
    const c = g.nets.length === 1 ? g.nets[0].color : undefined
    return (
      <button key={g.id} className="btn ghost lg ca-btn" style={c ? { borderColor: c } : undefined} onClick={() => copy(g.id, g.ca)} title={`Copy ${g.tag} contract address`}>
        <ChainStack nets={g.nets} /><code>{done === g.id ? 'Copied ✓' : g.ca}</code><Icon d={I.copy} size={16} />
      </button>
    )
  })}</>
}

function CaCard({ g }: { g: CaGroup }) {
  const { done, copy } = useCopy()
  const color = g.nets.length === 1 ? g.nets[0].color : 'var(--accent)'
  return (
    <article className="ca-card glass" style={{ ['--net' as string]: color }}>
      <div className="ca-top">
        <ChainStack nets={g.nets} size={28} />
        <div>
          <h3>{g.nets.length > 1 ? `One address · ${chainCount(g.nets.length)}` : g.nets[0].name}</h3>
          <p className="muted small">{g.nets.length > 1 ? g.nets.map((n) => n.name).join(' · ') : g.nets[0].tagline}</p>
        </div>
      </div>
      {g.ca ? (
        <button className="ca-full" onClick={() => copy(g.id, g.ca)} title="Copy contract address">
          <code>{g.ca}</code><span className="copy">{done === g.id ? 'Copied ✓' : <><Icon d={I.copy} size={14} /> Copy CA</>}</span>
        </button>
      ) : <div className="ca-full pending"><code>Contract address coming soon</code></div>}
      {g.ca && <div className="ca-links">
        {g.nets.map((n) => <a key={n.key} href={n.explorer + g.ca} target="_blank" rel="noreferrer"><ChainIcon n={n} size={14} />{n.short} explorer ↗</a>)}
      </div>}
    </article>
  )
}

const usd = (n?: number) => n == null || Number.isNaN(n) ? '—' : n < 1 ? `$${n.toPrecision(3)}` : `$${Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 2 }).format(n)}`

// Full token section: CA cards + live market data (DexScreener) once a CA is set
export function TokenSection() {
  const { data } = useTokenMarkets()
  const live = (data || []).filter((m) => m.priceUsd)
  return (
    <section className="section" id="sec-token">
      <div className="sec-head">
        <span className="eyebrow">${cfg.symbol} token</span>
        <h2>The currency of every ad slot</h2>
        <p className="muted">Advertisers pay creators in ${cfg.symbol}, wallet to wallet. {isSingle
          ? <>Live on <b style={{ color: primary.color }}>{primary.name}</b> — {primary.tagline.toLowerCase()}.</>
          : <>Live on {chainCount(activeNetworks.length)}: {activeNetworks.map((n) => n.name).join(', ')}.</>}</p>
      </div>
      <div className={`ca-grid${caGroups.length > 1 ? '' : ' one'}`}>{caGroups.map((g) => <CaCard key={g.id} g={g} />)}</div>
      {live.length > 0 && (
        <div className="market-row">
          {live.map((m) => (
            <a key={m.network.key} className="market glass" href={m.pairUrl} target="_blank" rel="noreferrer">
              <ChainIcon n={m.network} size={20} /><b>{m.network.name}</b>
              <span>Price <em>{usd(m.priceUsd)}</em></span>
              <span>24h <em className={(m.change24h ?? 0) >= 0 ? 'up' : 'down'}>{m.change24h?.toFixed(1)}%</em></span>
              <span>Liq <em>{usd(m.liquidityUsd)}</em></span>
              <span>Vol <em>{usd(m.volume24h)}</em></span>
            </a>
          ))}
        </div>
      )}
      <p className="footnote">Always verify the contract address here or on <a href={cfg.x} target="_blank" rel="noreferrer">@{cfg.x.split('/').pop()}</a>.</p>
    </section>
  )
}

export const netTheme = () => (isSingle ? { '--accent': primary.color, '--accent-ink': inkOn(primary.color), '--glow2': primary.glow } : {})
