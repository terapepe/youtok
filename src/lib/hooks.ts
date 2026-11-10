import { useEffect, useState, useSyncExternalStore } from 'react'
import { blobUrl, db, subscribe, Table } from './db'
import { samples } from '../data/samples'

let version = 0
subscribe(() => { version++ })

// Live table: re-reads whenever any record changes
export function useTable<T extends Table>(t: T) {
  const v = useSyncExternalStore(subscribe, () => version)
  const [rows, setRows] = useState<Awaited<ReturnType<typeof db.all<T>>>>([])
  const [ready, setReady] = useState(false)
  useEffect(() => { let on = true; db.all(t).then((r) => { if (on) { setRows(r); setReady(true) } }); return () => { on = false } }, [t, v])
  return { rows, ready }
}

export function useBlobUrl(id?: string) {
  const [u, setU] = useState('')
  useEffect(() => { let on = true; blobUrl(id).then((x) => on && setU(x)); return () => { on = false } }, [id])
  return u
}

// Hash router: #/path/a/b → ['path','a','b']
export function useRoute() {
  const get = () => location.hash.replace(/^#\/?/, '').split('?')[0].split('/').filter(Boolean)
  const [r, setR] = useState(get)
  useEffect(() => {
    const f = () => { setR(get()); if (!location.hash.includes('#sec-')) window.scrollTo({ top: 0 }) }
    addEventListener('hashchange', f)
    return () => removeEventListener('hashchange', f)
  }, [])
  return r
}
export const go = (path: string) => { location.hash = path.startsWith('#') ? path : '#' + path }
export const query = () => new URLSearchParams(location.hash.split('?')[1] || '')

// All marketplace tables at once (live)
export function useMarket() {
  const users = useTable('users'), slots = useTable('slots'), bookings = useTable('bookings'), videos = useTable('videos')
  return { users: [...users.rows, ...samples.users], slots: [...slots.rows, ...samples.slots], bookings: bookings.rows, videos: videos.rows, ready: users.ready && slots.ready && bookings.ready }
}
export type Market = ReturnType<typeof useMarket>
