import { defineChain } from 'viem'
import { base, bsc } from 'viem/chains'
import cfg from './config.json'

export const robinhood = defineChain({
  id: 4663,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [import.meta.env.VITE_ROBINHOOD_RPC || 'https://rpc.nodeflare.app/robinhood/public'] } },
})

export const evmChains = [base, bsc, robinhood] as const

type Overrides = { name?: string; short?: string; color?: string; tagline?: string; ca?: string }
const OV = (cfg as { chains?: Record<string, Overrides> }).chains || {}

// Static per-network data. name/short/color/tagline/ca can be overridden in config.json → chains
// glow = secondary tint used by the single-network theme
const BASE_NETWORKS = [
  { key: 'solana', icon: '/chains/solana.svg', name: 'Solana', short: 'SOL', color: '#9945FF', glow: '#14F195', vm: 'svm', chainId: 0, dex: 'solana', explorer: 'https://solscan.io/token/', txExplorer: 'https://solscan.io/tx/' },
  { key: 'robinhood', icon: '/chains/robinhood.svg', name: 'Robinhood', short: 'RH', color: '#CCFF00', glow: '#8B7CFF', vm: 'evm', chainId: robinhood.id, dex: 'robinhood', explorer: (import.meta.env.VITE_ROBINHOOD_EXPLORER || 'https://robinhoodchain.blockscout.com') + '/token/', txExplorer: (import.meta.env.VITE_ROBINHOOD_EXPLORER || 'https://robinhoodchain.blockscout.com') + '/tx/' },
  { key: 'base', icon: '/chains/base.svg', name: 'Base', short: 'BASE', color: '#2F6BFF', glow: '#35D6C5', vm: 'evm', chainId: base.id, dex: 'base', explorer: 'https://basescan.org/token/', txExplorer: 'https://basescan.org/tx/' },
  { key: 'bsc', icon: '/chains/bnb.svg', name: 'BNB Chain', short: 'BSC', color: '#F0B90B', glow: '#FF8A3D', vm: 'evm', chainId: bsc.id, dex: 'bsc', explorer: 'https://bscscan.com/token/', txExplorer: 'https://bscscan.com/tx/' },
] as const

export type Network = Omit<(typeof BASE_NETWORKS)[number], 'name' | 'short' | 'color'> & { name: string; short: string; color: string; tagline: string; ca: string }

const clean = (o: Overrides = {}) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v != null))
export const networks: Network[] = BASE_NETWORKS.map((n) => ({ tagline: '', ca: '', ...n, ...clean(OV[n.key]) }))

// config.json → mode: "single" = only singleNetwork; "multi" = always all 4 networks (multiOrder)
export const isSingle = cfg.mode !== 'multi'
const byKey = (k: string) => networks.find((n) => n.key === k)
export const activeNetworks: Network[] = isSingle
  ? [byKey(cfg.singleNetwork) || networks[0]]
  : [...new Set([...(cfg.multiOrder || []), ...networks.map((n) => n.key)])].map(byKey).filter((n): n is Network => !!n)
export const primary = activeNetworks[0]
export const activeEvm = activeNetworks.filter((n) => n.vm === 'evm')
export const hasSolana = activeNetworks.some((n) => n.vm === 'svm')
export const activeEvmChains = evmChains.filter((c) => activeEvm.some((n) => n.chainId === c.id))
export const netByChainId = (id?: number) => activeEvm.find((n) => n.chainId === id)

export const names = (list: Network[], sep = 'or') => list.map((n) => n.name).join(', ').replace(/, ([^,]*)$/, ` ${sep} $1`)
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five']
export const chainCount = (n: number) => `${WORDS[n] ?? n} chain${n === 1 ? '' : 's'}`

// CA: chains.<key>.ca → else evmAddress (shared by every EVM network) / solanaAddress
export const caOf = (n: Network) => (n.ca || (n.vm === 'svm' ? cfg.solanaAddress : cfg.evmAddress) || '').trim()

// Networks with the same CA are grouped → one Copy button (multi: SOL + RH/BASE/BSC)
export type CaGroup = { id: string; ca: string; nets: Network[]; tag: string }
export const caGroups: CaGroup[] = activeNetworks.reduce<CaGroup[]>((acc, n) => {
  const ca = caOf(n), id = ca ? ca.toLowerCase() : n.vm === 'evm' ? 'evm' : n.key, g = acc.find((x) => x.id === id)
  if (g) { g.nets.push(n); g.tag = g.nets.map((x) => x.short).join('/') } else acc.push({ id, ca, nets: [n], tag: n.short })
  return acc
}, [])

export const inkOn = (hex: string) => {
  const v = parseInt(hex.slice(1), 16)
  return (0.299 * (v >> 16) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255)) / 255 > 0.6 ? '#0B0C14' : '#ffffff'
}
