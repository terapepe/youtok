# YOUTOK

**Your Content. Their Brand. Shared Value.**
The Marketplace Where Creators Monetize Videos and Brands Find Their Audience.

YOUTOK connects video creators directly with advertisers. Creators sell ad space *inside* their videos (image, text, or image + text overlays). Advertisers pick the video, the position and the seconds, preview the ad, and pay the creator in `$YOUTOK`.

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
| `x` | X account URL (`https://x.com/You_tok`) |
| `platformFeePct`, `maxVideoMB` | Platform settings |

The CA is shown, with network icons and a Copy button, in the **top announcement bar**, **hero** (Copy buttons), **token section**, **footer**, **Docs → $YOUTOK token** and the **dashboard top bar**. Networks that share an address are grouped into one Copy button. When the CA is empty, the UI shows "CA soon". Live price/liquidity from DexScreener appears automatically once a CA is set.

Optional env (`.env`): `VITE_SOLANA_RPC`, `VITE_ROBINHOOD_RPC`, `VITE_ROBINHOOD_EXPLORER`.

## Features

- **Landing**: hero, live platform stats, featured creators, trending ad-ready videos, 7-step workflow, formats bento, creator/advertiser benefits, token section.
- **Creator marketplace**: search, category filter, sort by followers / average views / price / newest.
- **Video ad marketplace**: filter by category and format, sort by views / engagement / price.
- **Video Ad Placement Editor**: upload an image, enter text, drag and resize the overlay, keep it inside the creator's allowed zones, set start/end timestamps, style it, preview it inside the video, then submit an offer.
- **Creator Studio**: overview, video upload (thumbnail and duration are extracted automatically), video management, ad requests (approve / quote / reject), **publish** (the ad is rendered into the video with canvas + MediaRecorder), pricing & zones, campaign history, payments, analytics, profile.
- **Advertiser Hub**: overview, discover, saved creators, campaigns (accept quote / withdraw / **pay**), create campaign, editor, collaboration (hire) requests, analytics (impressions, ad views, clicks, cost per ad view), payments, profile.
- **Auth**: email + password (salted SHA-256), wallet sign-in (EVM signature verified with viem; Solana `signMessage`), role selection, role-based dashboard access, switch roles from your profile.
- **Payments**: real on-chain `$YOUTOK` transfers. ERC-20 `transfer` on EVM; SPL `TransferChecked` on Solana, which also creates the recipient's token account if needed. Every transfer is recorded with its tx hash and an explorer link.
- **Docs** at `#/docs`: introduction, quick start, creator guide, advertiser guide, placement, token, FAQ.

## Data

This version stores all data in the browser (IndexedDB, `src/lib/db.ts`), so the full flow works with no backend. To test both sides, use one browser and sign in as a creator, then as an advertiser.
`supabase/schema.sql` defines the production tables (users, saved_creators, videos, campaigns, ad_placements, placement_events, contracts, transactions, collab_requests), which mirror the local store.

## Brand assets

`public/logo.svg` (mark: a play button with an ad tile docked in the corner) · `public/logo-full.svg` (mark + wordmark) · `public/chains/*.svg`.
