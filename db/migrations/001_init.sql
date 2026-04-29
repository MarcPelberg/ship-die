create extension if not exists pgcrypto;

create table if not exists raw_messages (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  group_id text not null,
  sender_hash text,
  occurred_at timestamptz not null,
  text text not null default '',
  links text[] not null default '{}',
  raw jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists cards (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null,
  canonical_type text not null,
  tags text[] not null default '{}',
  source_url text,
  source_domain text,
  source_note text not null,
  discovered_at timestamptz not null,
  published_at timestamptz not null default now(),
  confidence numeric not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(canonical_type, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(array_to_string(tags, ' '), '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(source_url, '')), 'D')
  ) stored
);

create table if not exists card_sources (
  card_id uuid not null references cards(id) on delete cascade,
  raw_message_id uuid not null references raw_messages(id) on delete cascade,
  primary key (card_id, raw_message_id)
);

create table if not exists processing_events (
  id uuid primary key default gen_random_uuid(),
  raw_message_id uuid references raw_messages(id) on delete set null,
  level text not null,
  event_type text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists system_state (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_raw_messages_processed on raw_messages(processed_at) where processed_at is null;
create index if not exists idx_cards_published_at on cards(published_at desc);
create index if not exists idx_cards_type on cards(canonical_type);
create index if not exists idx_cards_search on cards using gin(search_vector);
