-- YOUTOK database schema (PostgreSQL / Supabase).
-- Mirrors the local IndexedDB tables in src/lib/db.ts so the app can move to a hosted backend.

create type user_role        as enum ('creator', 'advertiser');
create type ad_type          as enum ('image', 'text', 'combo');
create type placement_status as enum ('pending', 'quoted', 'approved', 'rejected', 'published', 'paid', 'cancelled');
create type campaign_status  as enum ('draft', 'active', 'completed');
create type request_status   as enum ('open', 'quoted', 'accepted', 'declined');

create table users (
  id           uuid primary key default gen_random_uuid(),
  email        text unique,                       -- null for wallet-only accounts
  role         user_role not null,
  name         text not null,
  handle       text unique not null,
  bio          text default '',
  category     text default '',
  company      text,
  avatar_url   text,
  socials      jsonb not null default '{}',       -- {x, youtube, tiktok, instagram, website}
  followers    integer not null default 0,
  wallet_evm   text unique,                       -- shared by Robinhood / Base / BSC
  wallet_sol   text unique,
  pricing      jsonb not null default '{"image":0,"text":0,"combo":0}',
  zones        text[] not null default '{tl,tr,top,bl,br,bottom}',
  accepts_ads  boolean not null default true,
  created_at   timestamptz not null default now()
);

create table saved_creators (
  advertiser_id uuid references users(id) on delete cascade,
  creator_id    uuid references users(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (advertiser_id, creator_id)
);

create table videos (
  id           uuid primary key default gen_random_uuid(),
  creator_id   uuid not null references users(id) on delete cascade,
  title        text not null,
  description  text default '',
  category     text default '',
  video_url    text not null,
  thumb_url    text,
  duration_s   numeric not null,
  width        integer, height integer,
  ad_enabled   boolean not null default true,
  formats      ad_type[] not null default '{image,text,combo}',
  price        jsonb,                              -- per-video override of users.pricing
  zones        text[],                             -- per-video override of users.zones
  views        bigint not null default 0,
  likes        bigint not null default 0,
  created_at   timestamptz not null default now()
);
create index on videos (creator_id);

create table campaigns (
  id            uuid primary key default gen_random_uuid(),
  advertiser_id uuid not null references users(id) on delete cascade,
  name          text not null,
  brand         text not null,
  objective     text default '',
  budget        numeric not null default 0,
  status        campaign_status not null default 'active',
  created_at    timestamptz not null default now()
);

create table ad_placements (
  id            uuid primary key default gen_random_uuid(),
  campaign_id   uuid not null references campaigns(id) on delete cascade,
  video_id      uuid not null references videos(id) on delete cascade,
  creator_id    uuid not null references users(id),
  advertiser_id uuid not null references users(id),
  type          ad_type not null,
  image_url     text,
  text          text,
  style         jsonb not null,                    -- {color,bg,size,weight,radius,opacity}
  x numeric not null, y numeric not null, w numeric not null, h numeric not null,  -- % of frame
  start_s numeric not null, end_s numeric not null,
  link          text,
  offer         numeric not null,                  -- advertiser offer in $YOUTOK
  quote         numeric,                           -- creator counter-quote
  note          text,
  status        placement_status not null default 'pending',
  published_url text,                              -- rendered video with the ad burned in
  impressions   bigint not null default 0,         -- plays of the published video
  ad_views      bigint not null default 0,         -- plays that reached the ad window
  clicks        bigint not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on ad_placements (creator_id, status);
create index on ad_placements (advertiser_id, status);

create table placement_events (
  id           bigserial primary key,
  placement_id uuid not null references ad_placements(id) on delete cascade,
  actor_id     uuid references users(id),
  action       text not null,                      -- requested, quoted, approved, rejected, published, paid
  note         text,
  created_at   timestamptz not null default now()
);

create table contracts (
  id            uuid primary key default gen_random_uuid(),
  placement_id  uuid unique not null references ad_placements(id) on delete cascade,
  creator_id    uuid not null references users(id),
  advertiser_id uuid not null references users(id),
  amount        numeric not null,
  terms         text not null,
  created_at    timestamptz not null default now()
);

create table transactions (
  id            uuid primary key default gen_random_uuid(),
  placement_id  uuid references ad_placements(id),
  from_address  text not null,
  to_address    text not null,
  amount        numeric not null,
  network       text not null,                     -- solana | robinhood | base | bsc
  tx_hash       text unique not null,
  status        text not null default 'submitted', -- submitted | confirmed
  created_at    timestamptz not null default now()
);

create table collab_requests (
  id            uuid primary key default gen_random_uuid(),
  advertiser_id uuid not null references users(id) on delete cascade,
  creator_id    uuid not null references users(id) on delete cascade,
  brief         text not null,
  budget        numeric not null default 0,
  deadline      date,
  quote         numeric,
  reply         text,
  status        request_status not null default 'open',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
