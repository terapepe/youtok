import cfg from './config/config.json'

/* hybot sync: CA, token name, symbol and X follow the newest token hybot launched for this site
   (https://hybot.xyz/api/site-token?site=<domain>; config.json = fallback). Runs before the app modules load,
   since they read the config at import time. Page links to the old X / Telegram are updated, or hidden when
   the launched token has none. */
const API = import.meta.env.VITE_TOKEN_API || 'https://hybot.xyz/api/site-token'
const DOMAIN = 'youlip.fun'
type Live = { found?: boolean; ca?: string; name?: string; symbol?: string; x?: string; telegram?: string; mode?: string; singleNetwork?: string; primaryNetwork?: string }
const handle = (u = '') => (u.match(/(?:x|twitter)\.com\/@?([A-Za-z0-9_]{1,15})|^@?([A-Za-z0-9_]{1,15})$/) || []).slice(1).find(Boolean) || ''
const tgName = (u = '') => (u.match(/t\.me\/([\w+/-]+)/)?.[1] || u.replace(/^@/, '')).replace(/\/+$/, '')

export async function syncToken() {
  const C = cfg as unknown as Record<string, any>
  const host = location.hostname.replace(/^www\./, '')
  const site = /\./.test(host) && !/(^|\.)(vercel\.app|localhost|127\.0\.0\.1)$/.test(host) ? host : DOMAIN
  let d: Live | null = null
  try {
    const r = await fetch(`${API}?site=${encodeURIComponent(site)}`, { signal: AbortSignal.timeout(2500) })
    d = await r.json()
  } catch { return }
  if (!d?.found || !/^0x[0-9a-fA-F]{40}$/.test(d.ca || '')) return
  const X0 = String(C.x || ''), TG0 = String(C.telegram || '')
  const oldX = handle(X0), oldTg = tgName(TG0)
  const X = d.x || '', TG = d.telegram || ''
  C.evmAddress = d.ca
  // network from hybot (Pons launches → single on robinhood)
  C.mode = d.mode || 'single'
  C.singleNetwork = d.singleNetwork || 'robinhood'
  C.primaryNetwork = d.primaryNetwork || C.singleNetwork
  const net = C.singleNetwork
  if (C.chains?.[net] && 'ca' in C.chains[net]) C.chains[net].ca = ''
  if (d.name) C.tokenName = d.name
  if (d.symbol) C.symbol = d.symbol
  if (X) C.x = X // empty → keep the old link, hidden by the fixer below
  if (TG) C.telegram = TG
  // links still pointing to the old X / Telegram
  const fix = (root: ParentNode) => root.querySelectorAll?.('a[href]').forEach((a) => {
    const h = a.getAttribute('href') || ''
    if (oldX && new RegExp(`(x|twitter)\\.com/@?${oldX}(?![A-Za-z0-9_])`, 'i').test(h) && !/intent|share/i.test(h)) {
      if (X) { if (h !== X) a.setAttribute('href', X) } else (a as HTMLElement).style.display = 'none'
    } else if (oldTg && /t\.me\//i.test(h) && tgName(h).toLowerCase() === oldTg.toLowerCase()) {
      if (TG) { if (h !== TG) a.setAttribute('href', TG) } else (a as HTMLElement).style.display = 'none'
    }
  })
  const start = () => {
    fix(document)
    new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => { if (n.nodeType === 1) fix((n as Element).parentNode || (n as Element)) }))).observe(document.documentElement, { childList: true, subtree: true })
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start()
}
