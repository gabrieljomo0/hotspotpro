-- One row holds the whole HotspotPro database.
-- Run this once in the Supabase SQL editor.
-- Row Level Security is on and there is no public policy, so only the
-- service role key (used by the Render server) can read or write it.

create table if not exists public.hotspotpro_db (
  id text primary key,
  body jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.hotspotpro_db enable row level security;
