import { useEffect } from 'react'
import { useAuth } from './lib/auth'
import { go, useRoute } from './lib/hooks'
import Landing from './pages/Landing'
import { CreatorProfile, Creators, VideoDetail, Videos } from './pages/Market'
import Editor from './pages/Editor'
import Auth from './pages/Auth'
import Docs, { Audience, Terms } from './pages/Docs'
import Studio from './pages/dash/Studio'
import Brand from './pages/dash/Brand'

// Role-based access: #/studio = creators, #/brand = advertisers
function Guard({ role, children }: { role: 'creator' | 'advertiser'; children: JSX.Element }) {
  const { user, ready } = useAuth()
  useEffect(() => {
    if (!ready) return
    if (!user) go(`/auth?role=${role}&next=${encodeURIComponent(location.hash.slice(1))}`)
    else if (user.role !== role) go(user.role === 'creator' ? '/studio' : '/brand')
  }, [ready, user?.id, user?.role])
  return user?.role === role ? children : null
}

export default function App() {
  const [a, b] = useRoute()
  if (!a || a.startsWith('#')) return <Landing anchor={a?.slice(1)} />
  switch (a) {
    case 'creators': return <Creators />
    case 'creator': return <CreatorProfile id={b} />
    case 'videos': return <Videos />
    case 'video': return <VideoDetail id={b} />
    case 'editor': return <Editor videoId={b} />
    case 'auth': return <Auth />
    case 'docs': return <Docs section={b} />
    case 'for-creators': return <Audience who="creators" />
    case 'for-advertisers': return <Audience who="advertisers" />
    case 'terms': return <Terms />
    case 'studio': return <Guard role="creator"><Studio tab={b} /></Guard>
    case 'brand': return <Guard role="advertiser"><Brand tab={b} /></Guard>
    default: return <Landing />
  }
}
