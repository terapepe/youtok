import { useState } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { useWallet } from '@solana/wallet-adapter-react'
import { verifyMessage } from 'viem'
import cfg from '../config/config.json'
import { useAuth } from '../lib/auth'
import type { Role } from '../lib/db'
import { go, query } from '../lib/hooks'
import { short } from '../lib/constants'
import { Page, WalletButton } from '../components/Layout'
import { ChainStack } from '../components/Chain'
import { Field, Icon, I } from '../components/ui'

const dest = (r: Role) => query().get('next') || (r === 'creator' ? '/studio' : '/brand')

function RolePick({ role, setRole }: { role: Role; setRole: (r: Role) => void }) {
  return (
    <div className="role-pick">
      {(['creator', 'advertiser'] as Role[]).map((r) => (
        <button key={r} type="button" className={role === r ? 'on' : ''} onClick={() => setRole(r)}>
          <Icon d={r === 'creator' ? I.video : I.bolt} size={22} />
          <b>{r === 'creator' ? 'Creator' : 'Advertiser'}</b>
          <span>{r === 'creator' ? 'Sell ad space in my videos' : 'Place ads in creator videos'}</span>
        </button>
      ))}
    </div>
  )
}

export default function Auth() {
  const auth = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>(query().get('role') ? 'register' : 'login')
  const [role, setRole] = useState<Role>((query().get('role') as Role) || 'creator')
  const [email, setEmail] = useState(''), [pw, setPw] = useState(''), [name, setName] = useState('')
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false)
  const [needRole, setNeedRole] = useState<{ address: string; vm: 'evm' | 'svm' } | null>(null)
  const evm = useAccount(), { signMessageAsync } = useSignMessage(), sol = useWallet()

  if (auth.user) {
    return <Page><section className="auth glass"><h2>Signed in as {auth.user.name}</h2>
      <div className="cta-row"><button className="btn" onClick={() => go(dest(auth.user!.role))}>Open dashboard</button><button className="btn ghost" onClick={auth.logout}>Sign out</button></div></section></Page>
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      const u = mode === 'login' ? await auth.login(email, pw) : await auth.register({ email, password: pw, role, name })
      go(dest(u.role))
    } catch (x) { setErr((x as Error).message) } finally { setBusy(false) }
  }

  // Sign a message to prove wallet ownership, then sign in / create the account
  const walletIn = async (vm: 'evm' | 'svm') => {
    setErr(''); setBusy(true)
    try {
      const msg = `Sign in to ${cfg.brand}\nNonce: ${crypto.randomUUID()}\nIssued: ${new Date().toISOString()}`
      let address = ''
      if (vm === 'evm') {
        if (!evm.address) throw new Error('Connect an EVM wallet first')
        const sig = await signMessageAsync({ message: msg })
        if (!(await verifyMessage({ address: evm.address, message: msg, signature: sig }))) throw new Error('Signature check failed')
        address = evm.address
      } else {
        if (!sol.publicKey || !sol.signMessage) throw new Error('Connect a Solana wallet that supports message signing')
        await sol.signMessage(new TextEncoder().encode(msg))
        address = sol.publicKey.toBase58()
      }
      const u = await auth.walletLogin({ address, vm })
      if (u) go(dest(u.role)); else setNeedRole({ address, vm })
    } catch (x) { setErr((x as Error).message.split('\n')[0]) } finally { setBusy(false) }
  }

  const finishWallet = async () => {
    if (!needRole) return
    const u = await auth.walletLogin({ ...needRole, role, name })
    if (u) go(dest(u.role))
  }

  return (
    <Page>
      <section className="auth-wrap">
        <div className="auth glass">
          <div className="seg">{(['login', 'register'] as const).map((m) => <button key={m} className={mode === m ? 'on' : ''} onClick={() => { setMode(m); setErr('') }}>{m === 'login' ? 'Sign in' : 'Create account'}</button>)}</div>
          {needRole ? <>
            <h3>Welcome! Finish your account</h3>
            <p className="muted small">Wallet {short(needRole.address)} is new to {cfg.brand}.</p>
            <RolePick role={role} setRole={setRole} />
            <Field label="Display name"><input value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <button className="btn block" onClick={finishWallet}>Continue</button>
          </> : <>
            <form onSubmit={submit}>
              {mode === 'register' && <><RolePick role={role} setRole={setRole} /><Field label="Display name"><input required value={name} onChange={(e) => setName(e.target.value)} /></Field></>}
              <Field label="Email"><input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
              <Field label="Password" hint={mode === 'register' ? 'At least 8 characters' : undefined}><input type="password" required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
              <button className="btn block" disabled={busy}>{mode === 'login' ? 'Sign in with email' : 'Create account'}</button>
            </form>
            <div className="or"><span>or use a wallet</span></div>
            <div className="wallet-in">
              <WalletButton className="btn ghost block" />
              {evm.address && <button className="btn block" disabled={busy} onClick={() => walletIn('evm')}><ChainStack nets={undefined} size={16} />Sign in with {short(evm.address)}</button>}
              {sol.publicKey && <button className="btn block" disabled={busy} onClick={() => walletIn('svm')}>Sign in with {short(sol.publicKey.toBase58())}</button>}
            </div>
          </>}
          {err && <p className="err">{err}</p>}
        </div>
        <div className="auth-side">
          <h2>{cfg.tagline}</h2>
          <ul>
            <li><Icon d={I.check} size={16} />Creators: upload videos, set prices, approve ads, get paid.</li>
            <li><Icon d={I.check} size={16} />Advertisers: find creators, place ads, preview, track results.</li>
            <li><Icon d={I.check} size={16} />One account, switch roles any time from your profile.</li>
          </ul>
        </div>
      </section>
    </Page>
  )
}
