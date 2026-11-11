# YOULIP.FUN

**Your Content. Their Brand. Shared Value.**
The Marketplace Where Creators Pre-Sell Ad Slots and Brands Find Their Audience. Token: **YOULIP ($LIP)**.

Creators link their channels (YouTube, TikTok, Facebook, X, Instagram, Twitch, Kick, Rumble…) and list **ad slots** for videos they are about to make: length (30s, 1, 3, 5, 10, 30 min), platforms, content tags, the ad formats they accept and **their own $LIP price** for each. Advertisers search creators and slots, book, send their creative, review the delivery and pay in $LIP.
## Stack

Vite + React + TypeScript · wagmi/viem (Robinhood, Base, BNB Chain) · Solana wallet adapter · IndexedDB local data layer.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # → dist/ (Vercel config included)
```

## Configuration: `src/config/config.json`

Everything brand- or token-related is in this one file.

| Key | Meaning |
|---|---|
| `brand`, `tokenName`, `symbol` | Brand name, token name, ticker (without `$`) |
| `tagline`, `positioning` | Hero / footer copy |
| `mode` | `"multi"` = always all 4 networks · `"single"` = only `singleNetwork` |
| `singleNetwork` | `solana` \| `robinhood` \| `base` \| `bsc`. In single mode the whole UI takes that network's color theme. |
| `multiOrder` | Order of the networks in multi mode |
| `evmAddress` | Token CA shared by Robinhood, Base and BSC |
| `solanaAddress` | Token mint on Solana |
| `chains.<key>.ca` | Optional per-network CA override (takes priority) |
| `chains.<key>.name/short/color/tagline` | Per-network display overrides |
| `tokenDecimals` | Fallback decimals for EVM payments (read on-chain when possible) |
| `x` | X account URL (`https://x.com/YoulipFun`) |
| `platformFeePct`, `maxVideoMB` | Platform settings |

The CA is shown, with network icons and a Copy button, in the **top announcement bar**, **hero** (Copy buttons), **token section**, **footer**, **Docs → $LIP token** and the **dashboard top bar**. Networks that share an address are grouped into one Copy button. When the CA is empty, the UI shows "CA soon". Live price/liquidity from DexScreener appears automatically once a CA is set.

Optional env (`.env`): `VITE_SOLANA_RPC`, `VITE_ROBINHOOD_RPC`, `VITE_ROBINHOOD_EXPLORER`.

## Features

- **Explore Creators**: platform, category, size tier, language, rating, max price and open-slot filters; 7 sort orders; grid/list view; top rated; browse by category.
- **Ad Slots**: filter by platform, length, tag, category, format, language, payment terms, orientation and price; sort by publish date, price, reach or spots.
- **Tags**: browse slots by topic.
- **Creator profile**: banner, tier, linked channels, open slots, portfolio, reviews, save, custom request.
- **Booking editor**: choose format and position, ad category (blocked ones are refused), logo/text overlay with drag, resize and zone check, or a script for mentions and segments, plus an offer.
- **Ad formats**: logo overlay, text overlay, logo + text, verbal mention, sponsored segment, link in description.
- **Deal lifecycle**: requested → countered → accepted → delivered → revision → completed, with decline, withdraw, extension requests, overdue cancel, disputes, mutual cancel, per-deal chat, history and two-way reviews.
- **Payment terms per slot**: on delivery, 50/50, or upfront. Real on-chain $LIP transfers (ERC-20 / SPL) recorded with tx hash.
- **Creator Studio**: channels (with verification codes), ad slots (create/edit/pause/duplicate/close), bookings, portfolio, custom requests, payments, analytics, reviews, profile.
- **Advertiser Hub**: discover, saved creators and slots, bookings, campaigns with budget warnings, custom requests, analytics (reported views, CPM), payments, reviews.
- **Overlay render tool**: burns the booked overlay into the creator's final video file in the browser.
- **Docs** at `#/docs`: introduction, quick start, guides, ad formats, deal scenarios, token, FAQ.

## Data

This version stores all data in the browser (IndexedDB, `src/lib/db.ts`), so the full flow works with no backend. To test both sides, use one browser and sign in as a creator, then as an advertiser.
`supabase/schema.sql` defines the production tables (users, channels, ad_slots, bookings, deliveries, booking_messages, booking_events, reviews, contracts, transactions, portfolio_videos, campaigns, collab_requests), which mirror the local store.

## Brand assets

`public/logo.svg` (mark: a speech bubble with a play button and a $LIP coin) · `public/logo-full.svg` (mark + wordmark) · `public/chains/*.svg`.
