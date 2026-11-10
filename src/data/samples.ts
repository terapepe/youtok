// Sample creator profiles shown in Explore Creators while the marketplace grows.
// Fictional people, labelled "Sample" in the UI and not bookable.
// Turn off with config.json → "sampleCreators": false
import cfg from '../config/config.json'
import type { AdType, LengthKey, PlatformKey, Slot, User } from '../lib/db'
import { addDays } from '../lib/constants'

type Ch = [PlatformKey, number, number] // platform, followers, avg views
type Spec = [name: string, handle: string, category: string, language: string, country: string, bio: string, channels: Ch[], tags: string[], slotTitle: string, length: LengthKey]

const SPECS: Spec[] = [
  ['Linh Nguyen Tech', 'linhtech', 'Tech', 'Vietnamese', 'Vietnam', 'Đánh giá điện thoại, laptop và gadget mới mỗi tuần.', [['youtube', 412000, 95000], ['tiktok', 820000, 210000]], ['review', 'unboxing', 'smartphone'], 'Unboxing and full review of this month\'s flagship phone', '10m'],
  ['ChainPilot', 'chainpilot', 'Crypto', 'English', 'Singapore', 'Daily on-chain analysis, new tokens and DeFi strategies.', [['youtube', 268000, 61000], ['x', 154000, 38000]], ['defi', 'trading', 'memecoin'], 'Weekly on-chain recap: top movers and new launches', '10m'],
  ['Mai Cooks', 'maicooks', 'Food', 'Vietnamese', 'Vietnam', 'Món Việt dễ nấu trong 15 phút.', [['tiktok', 1250000, 380000], ['facebook', 640000, 120000]], ['recipe', 'how-to', 'shorts'], '15-minute street food recipe at home', '1m'],
  ['PixelRush', 'pixelrush', 'Gaming', 'English', 'United States', 'Speedruns, indie gems and late-night co-op streams.', [['twitch', 186000, 9800], ['youtube', 342000, 72000], ['kick', 41000, 3200]], ['gameplay', 'live', 'review'], 'Indie game marathon highlights', '30m'],
  ['Ana Fit', 'anafit', 'Fitness', 'Portuguese', 'Brazil', 'Treinos curtos em casa, sem equipamento.', [['instagram', 930000, 140000], ['tiktok', 1100000, 260000]], ['workout', 'challenge', 'shorts'], '30-day home workout challenge, day 1', '1m'],
  ['Rizky Travels', 'rizkytravels', 'Travel', 'Indonesian', 'Indonesia', 'Budget backpacking across Southeast Asia.', [['youtube', 520000, 110000], ['instagram', 210000, 35000]], ['vlog', 'travel', 'budget'], 'Bali on $20 a day: full itinerary', '10m'],
  ['The Ledger Lab', 'ledgerlab', 'Finance', 'English', 'United Kingdom', 'Personal finance explained without the jargon.', [['youtube', 188000, 42000], ['x', 76000, 15000]], ['tutorial', 'finance', 'how-to'], 'Beginner\'s guide to building an emergency fund', '5m'],
  ['Sora Beauty', 'sorabeauty', 'Beauty', 'Korean', 'South Korea', '10-step skincare routines and honest product reviews.', [['youtube', 760000, 150000], ['instagram', 1400000, 190000]], ['skincare', 'review', 'routine'], 'Testing 5 viral sunscreens for a week', '10m'],
  ['Quang Đạt Vlog', 'quangdatvlog', 'Lifestyle', 'Vietnamese', 'Vietnam', 'Cuộc sống freelancer tại Sài Gòn.', [['youtube', 98000, 24000], ['tiktok', 230000, 61000]], ['vlog', 'day-in-life', 'productivity'], 'A day in the life of a Saigon freelancer', '5m'],
  ['MemeMarket TV', 'mememarkettv', 'Crypto', 'English', 'United States', 'Memecoin news with too many charts and too many jokes.', [['x', 312000, 88000], ['tiktok', 420000, 120000]], ['memecoin', 'news', 'comedy'], 'Memecoin news in 60 seconds', '1m'],
  ['Kodo Learns', 'kodolearns', 'Education', 'English', 'Canada', 'Coding tutorials for absolute beginners.', [['youtube', 295000, 54000]], ['tutorial', 'ai', 'coding'], 'Build your first AI app in one video', '30m'],
  ['Thai Street Eats', 'thaistreeteats', 'Food', 'Thai', 'Thailand', 'Bangkok night markets, stall by stall.', [['youtube', 330000, 87000], ['facebook', 510000, 98000]], ['street-food', 'vlog', 'travel'], 'Night market tour: 10 dishes under 100 baht', '10m'],
  ['Lucía Música', 'luciamusica', 'Music', 'Spanish', 'Mexico', 'Covers acústicos y canciones originales.', [['youtube', 410000, 66000], ['tiktok', 890000, 230000], ['instagram', 300000, 45000]], ['music', 'cover', 'live'], 'Acoustic cover session', '3m'],
  ['Dev Raj Reviews', 'devrajreviews', 'Tech', 'Hindi', 'India', 'Budget gadgets tested for real life.', [['youtube', 1850000, 420000]], ['review', 'budget', 'smartphone'], 'Best phones under ₹15,000 this month', '10m'],
  ['GridIron Daily', 'gridirondaily', 'Sports', 'English', 'United States', 'Football breakdowns and game-day predictions.', [['youtube', 145000, 38000], ['x', 98000, 21000]], ['sports', 'news', 'analysis'], 'Weekend game preview and picks', '5m'],
  ['Hana Draws', 'hanadraws', 'Lifestyle', 'Japanese', 'Japan', 'Digital illustration timelapses and art tips.', [['youtube', 220000, 48000], ['instagram', 380000, 52000]], ['art', 'tutorial', 'timelapse'], 'Character design from sketch to final', '10m'],
  ['Bảo Gaming', 'baogaming', 'Gaming', 'Vietnamese', 'Vietnam', 'Liên Quân, Valorant và game mobile mới.', [['youtube', 640000, 130000], ['tiktok', 520000, 140000], ['facebook', 280000, 40000]], ['gameplay', 'mobile', 'live'], 'New mobile game first impressions', '10m'],
  ['Fit Over Forty', 'fitoverforty', 'Fitness', 'English', 'Australia', 'Strength training for busy adults over 40.', [['youtube', 87000, 19000], ['instagram', 64000, 9000]], ['workout', 'health', 'how-to'], '20-minute full-body strength routine', '30m'],
  ['Crypto Ka', 'cryptoka', 'Crypto', 'Filipino', 'Philippines', 'Crypto basics in Taglish, safe and simple.', [['facebook', 390000, 72000], ['tiktok', 260000, 80000]], ['tutorial', 'airdrop', 'defi'], 'How to spot a crypto scam', '3m'],
  ['Le Petit Chef', 'lepetitchef', 'Food', 'French', 'France', 'Pâtisserie française simplifiée.', [['youtube', 175000, 41000], ['instagram', 240000, 30000]], ['recipe', 'baking', 'how-to'], 'Croissants at home, step by step', '10m'],
  ['NomadStack', 'nomadstack', 'Tech', 'English', 'Portugal', 'Remote-work tools and setups from around the world.', [['youtube', 128000, 26000], ['x', 52000, 11000]], ['productivity', 'review', 'ai'], 'My 2026 remote work desk setup', '5m'],
  ['Zehra Style', 'zehrastyle', 'Fashion', 'Turkish', 'Turkey', 'Modest fashion lookbooks and styling tips.', [['instagram', 720000, 98000], ['tiktok', 450000, 130000]], ['lookbook', 'style', 'shorts'], 'One outfit, five ways', '1m'],
  ['Laugh Lab', 'laughlab', 'Comedy', 'English', 'United States', 'Sketch comedy about office life and the internet.', [['tiktok', 2300000, 640000], ['youtube', 510000, 120000]], ['comedy', 'sketch', 'shorts'], 'Office sketch: the reply-all disaster', '1m'],
  ['Minh Anh English', 'minhanhenglish', 'Education', 'Vietnamese', 'Vietnam', 'Học tiếng Anh giao tiếp mỗi ngày 5 phút.', [['youtube', 860000, 160000], ['tiktok', 1500000, 300000]], ['tutorial', 'english', 'education'], '50 everyday English phrases', '5m'],
  ['Alpha Rumble', 'alpharumble', 'News', 'English', 'United States', 'Tech and market news, no fluff.', [['rumble', 94000, 23000], ['x', 130000, 34000]], ['news', 'ai', 'trading'], 'This week in AI and markets', '10m'],
  ['Kai Plays', 'kaiplays', 'Gaming', 'German', 'Germany', 'Strategy games and community tournaments.', [['twitch', 98000, 5200], ['youtube', 160000, 31000]], ['gameplay', 'strategy', 'live'], 'Community tournament finals', '30m'],
  ['Little Explorers', 'littleexplorers', 'Kids & Family', 'English', 'United Kingdom', 'Family science experiments and weekend activities.', [['youtube', 340000, 90000]], ['science', 'diy', 'family'], 'Five kitchen science experiments', '10m'],
  ['Yuki Run', 'yukirun', 'Sports', 'Japanese', 'Japan', 'Marathon training diaries and running gear.', [['youtube', 72000, 16000], ['instagram', 58000, 8000]], ['running', 'review', 'vlog'], 'Training week before a marathon', '5m'],
  ['DeFi Đơn Giản', 'defidongian', 'Crypto', 'Vietnamese', 'Vietnam', 'Giải thích DeFi và airdrop dễ hiểu.', [['youtube', 120000, 30000], ['x', 45000, 9000], ['tiktok', 88000, 22000]], ['defi', 'airdrop', 'tutorial'], 'Hướng dẫn săn airdrop an toàn', '10m'],
  ['Home Fix Hero', 'homefixhero', 'Lifestyle', 'English', 'United States', 'DIY home repairs anyone can do.', [['youtube', 610000, 140000], ['facebook', 230000, 37000]], ['diy', 'how-to', 'tutorial'], 'Fixing a leaky faucet in 10 minutes', '10m'],
]

// Price per format scales with average views (≈ CPM) and is rounded to a clean $LIP number
const price = (views: number, mult: number) => Math.max(20, Math.round((views / 1000) * 2 * mult / 10) * 10)
const FORMATS: [AdType, number][] = [['image', 1], ['combo', 1.4], ['mention', 2.2], ['segment', 4]]

const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)

const build = () => {
  const users: User[] = [], slots: Slot[] = []
  SPECS.forEach(([name, handle, category, language, country, bio, channels, tags, slotTitle, length], i) => {
    const id = 'sample-' + handle, h = hash(handle)
    const views = Math.max(...channels.map((c) => c[2]))
    const vertical = channels.every(([p]) => ['tiktok', 'instagram'].includes(p))
    users.push({
      id, role: 'creator', name, handle, bio, category, language, country, sample: true,
      channels: channels.map(([platform, followers, avgViews]) => ({ platform, handle, url: '', followers, avgViews, code: '', verified: false })),
      wallets: {}, listed: true, saved: [], savedSlots: [], createdAt: Date.now() - (i + 1) * 86400000 * 3,
    })
    slots.push({
      id: 'sample-slot-' + handle, creatorId: id, title: slotTitle, description: `Sample ad slot from a sample profile.`, sample: true,
      platforms: channels.map((c) => c[0]), length, orientation: vertical || length === '1m' ? 'portrait' : 'landscape',
      category, tags, language, formats: FORMATS.slice(0, 2 + (h % 3)).map(([type, mult]) => ({ type, price: price(views, mult) })),
      positions: ['intro', 'mid', 'outro'], zones: ['tr', 'br', 'bottom'], spots: 1 + (h % 3), exclusive: h % 5 === 0,
      publishBy: addDays(7 + (h % 21)), payTerms: (['delivery', 'split', 'upfront'] as const)[h % 3], blocked: h % 2 ? ['Gambling / Betting', 'Politics'] : ['Gambling / Betting'],
      status: 'open', views: 0, createdAt: Date.now() - i * 3600000, updatedAt: Date.now(),
    })
  })
  return { users, slots }
}

const on = (cfg as { sampleCreators?: boolean }).sampleCreators !== false
export const samples = on ? build() : { users: [] as User[], slots: [] as Slot[] }
