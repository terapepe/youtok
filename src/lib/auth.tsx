import { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import { db, sha256, subscribe, uid, User, Role } from './db'
import { DEFAULT_PRICING, ZONE_KEYS } from './constants'

const KEY = 'youtok.session'

type Auth = {
  user: User | null; ready: boolean
  register: (o: { email: string; password: string; role: Role; name: string }) => Promise<User>
  login: (email: string, password: string) => Promise<User>
  walletLogin: (o: { address: string; vm: 'evm' | 'svm'; role?: Role; name?: string }) => Promise<User | null>
  logout: () => void
  update: (p: Partial<User>) => Promise<void>
}
const Ctx = createContext<Auth>(null as unknown as Auth)
export const useAuth = () => useContext(Ctx)

const handleOf = (s: string) => s.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20) || 'user' + uid().slice(0, 5)

export function newUser(role: Role, name: string, extra: Partial<User> = {}): User {
  return {
    id: uid(), role, name, handle: handleOf(name), bio: '', category: role === 'creator' ? 'Other' : '',
    socials: {}, followers: 0, wallets: {}, pricing: { ...DEFAULT_PRICING }, zones: [...ZONE_KEYS],
    acceptsAds: role === 'creator', saved: [], createdAt: Date.now(), ...extra,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  const load = async () => {
    const id = localStorage.getItem(KEY)
    setUser(id ? (await db.get('users', id)) ?? null : null)
    setReady(true)
  }
  useEffect(() => { load(); return subscribe(load) }, [])

  const start = (u: User) => { localStorage.setItem(KEY, u.id); setUser(u); return u }

  const api: Auth = {
    user, ready,
    async register({ email, password, role, name }) {
      email = email.trim().toLowerCase()
      if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Enter a valid email address')
      if (password.length < 8) throw new Error('Password must be at least 8 characters')
      if ((await db.all('users')).some((u) => u.email === email)) throw new Error('An account with this email already exists')
      const salt = uid()
      const u = newUser(role, name.trim() || email.split('@')[0], { email, salt, passHash: await sha256(salt + password) })
      await db.put('users', u)
      return start(u)
    },
    async login(email, password) {
      email = email.trim().toLowerCase()
      const u = (await db.all('users')).find((x) => x.email === email)
      if (!u || !u.salt || u.passHash !== (await sha256(u.salt + password))) throw new Error('Wrong email or password')
      return start(u)
    },
    // Returns null when the wallet has no account yet and no role was given (caller asks for a role)
    async walletLogin({ address, vm, role, name }) {
      const key = vm === 'evm' ? 'evm' : 'sol'
      const norm = vm === 'evm' ? address.toLowerCase() : address
      const found = (await db.all('users')).find((u) => (u.wallets[key] || '') === norm)
      if (found) return start(found)
      if (!role) return null
      const u = newUser(role, name?.trim() || `${address.slice(0, 6)}`, { wallets: { [key]: norm } })
      await db.put('users', u)
      return start(u)
    },
    logout() { localStorage.removeItem(KEY); setUser(null) },
    async update(p) { if (user) await db.patch('users', user.id, p) },
  }
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}
