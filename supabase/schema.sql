-- Run this in your Supabase SQL Editor to create the previews table

create table if not exists previews (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  original_url text not null,
  original_screenshot text,
  redesign_html text not null,
  dev_name text not null,
  dev_email text not null,
  dev_message text,
  created_at timestamptz default now(),
  expires_at timestamptz not null
);

-- Index for fast slug lookups
create index if not exists idx_previews_slug on previews (slug);
