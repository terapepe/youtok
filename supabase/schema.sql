-- YOULIP.FUN database schema (PostgreSQL / Supabase).
-- Mirrors the local IndexedDB tables in src/lib/db.ts.

create type user_role      as enum ('creator', 'advertiser');
create type platform_key   as enum ('youtube', 'tiktok', 'facebook', 'x', 'instagram', 'twitch', 'kick', 'rumble', 'other');
create type length_key     as enum ('30s', '1m', '3m', '5m', '10m', '30m');
create type ad_type        as enum ('image', 'text', 'combo', 'mention', 'segment', 'link');
create type ad_position    as enum ('intro', 'mid', 'outro');
create type pay_terms      as enum ('delivery', 'split', 'upfront');
create type slot_status    as enum ('open', 'paused', 'closed');
create type booking_status as enum ('requested', 'countered', 'accepted', 'delivered', 'revision', 'completed', 'declined', 'cancelled', 'disputed');
create type request_status as enum ('open', 'quoted', 'accepted', 'declined');

create table users (
  id          uuid primary key default gen_random_uuid(),
  email       text unique,                     -- null for wallet-only accounts
  role        user_role not null,
  name        text not null,
  handle      text unique not null,
  bio         text default '',
  category    text default '',
  language    text default 'English',
  country     text default '',
  company     text,
  avatar_url  text, banner_url text, website text,
  wallet_evm  text unique,                     -- shared by Robinhood / Base / BSC
  wallet_sol  text unique,
  listed      boolean not null default true,   -- visible in Explore Creators
  created_at  timestamptz not null default now()
);

-- Linked channels (YouTube, TikTok, Facebook, X, ...). verify_code is placed in the channel bio for verification.
create table channels (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  platform    platform_key not null,
  url         text not null,
  handle      text not null,
  followers   bigint not null default 0,
  avg_views   bigint not null default 0,
  verify_code text not null,
  verified    boolean not null default false,
  unique (user_id, platform, handle)
);

create table saved_creators (advertiser_id uuid references users(id) on delete cascade, creator_id uuid references users(id) on delete cascade, primary key (advertiser_id, creator_id));
create table saved_slots    (advertiser_id uuid references users(id) on delete cascade, slot_id uuid, primary key (advertiser_id, slot_id));

-- An ad slot = a video the creator WILL make, offered for sponsorship
create table ad_slots (
  id            uuid primary key default gen_random_uuid(),
  creator_id    uuid not null references users(id) on delete cascade,
  title         text not null,
  description   text default '',
  platforms     platform_key[] not null,
  length        length_key not null,
  orientation   text not null default 'landscape',      -- landscape | portrait
  category      text not null,
  tags          text[] not null default '{}',
  language      text not null default 'English',
  formats       jsonb not null,                          -- [{type, price}] price in $LIP set by creator
  positions     ad_position[] not null default '{intro,mid,outro}',
  zones         text[] not null default '{tl,tr,top,bl,br,bottom}',
  spots         integer not null default 1,
  exclusive     boolean not null default false,
  publish_by    date,
  pay_terms     pay_terms not null default 'delivery',
  blocked       text[] not null default '{}',            -- ad categories the creator refuses
  sample_video  uuid,
  status        slot_status not null default 'open',
  views         bigint not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on ad_slots (status, publish_by);
create index on ad_slots using gin (tags);
create index on ad_slots using gin (platforms);

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  advertiser_id uuid not null references users(id) on delete cascade,
  name text not null, brand text not null, objective text default '',
  budget numeric not null default 0, status text not null default 'active',
  created_at timestamptz not null default now()
);

create table bookings (
  id            uuid primary key default gen_random_uuid(),
  slot_id       uuid not null references ad_slots(id) on delete cascade,
  creator_id    uuid not null references users(id),
  advertiser_id uuid not null references users(id),
  campaign_id   uuid references campaigns(id),
  type          ad_type not null,
  position      ad_position not null,
  ad_category   text not null,
  image_url     text, text text, link text, script text,
  style         jsonb,
  x numeric, y numeric, w numeric, h numeric,              -- overlay box, % of frame
  show_for      numeric,                                   -- seconds on screen
  offer         numeric not null,                          -- $LIP
  counter       numeric,                                   -- creator counter-offer
  status        booking_status not null default 'requested',
  due           date,
  extension     jsonb,                                     -- {date, note, by}
  dispute       jsonb,                                     -- {by, reason, at}
  cancel_by     uuid,                                      -- first party asking for mutual cancel
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on bookings (creator_id, status);
create index on bookings (advertiser_id, status);

create table deliveries (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  platform platform_key not null, url text not null, ad_at text, views bigint, note text,
  created_at timestamptz not null default now()
);
create table booking_messages (
  id bigserial primary key, booking_id uuid not null references bookings(id) on delete cascade,
  sender_id uuid not null references users(id), text text not null, created_at timestamptz not null default now()
);
create table booking_events (
  id bigserial primary key, booking_id uuid not null references bookings(id) on delete cascade,
  actor_id uuid references users(id), action text not null, note text, created_at timestamptz not null default now()
);
create table reviews (
  booking_id uuid references bookings(id) on delete cascade,
  author_id uuid references users(id), target_id uuid references users(id),
  rating smallint not null check (rating between 1 and 5), text text default '',
  created_at timestamptz not null default now(), primary key (booking_id, author_id)
);
create table contracts (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid unique not null references bookings(id) on delete cascade,
  creator_id uuid not null references users(id), advertiser_id uuid not null references users(id),
  amount numeric not null, terms text not null, created_at timestamptz not null default now()
);
create table transactions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id),
  kind text not null,                                      -- upfront | final | full
  from_address text not null, to_address text not null, amount numeric not null,
  network text not null, tx_hash text unique not null, status text not null default 'submitted',
  created_at timestamptz not null default now()
);
create table portfolio_videos (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references users(id) on delete cascade,
  title text not null, description text default '', category text default '',
  platform platform_key, url text, video_url text, thumb_url text,
  duration_s numeric default 0, width int, height int, views bigint default 0, likes bigint default 0,
  created_at timestamptz not null default now()
);
create table collab_requests (
  id uuid primary key default gen_random_uuid(),
  advertiser_id uuid not null references users(id) on delete cascade,
  creator_id uuid not null references users(id) on delete cascade,
  brief text not null, budget numeric not null default 0, deadline date,
  quote numeric, reply text, status request_status not null default 'open',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
