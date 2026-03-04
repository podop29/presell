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
  expires_at timestamptz not null,
  variation_a_html text,
  variation_a_style text default 'Clean & Minimal',
  variation_b_html text,
  variation_b_style text default 'Bold & Modern',
  variation_c_html text,
  variation_c_style text default 'Dark & Sleek'
);

-- Index for fast slug lookups
create index if not exists idx_previews_slug on previews (slug);

-- Storage: create a public "logos" bucket (run in Supabase dashboard or via SQL)
-- insert into storage.buckets (id, name, public, file_size_limit)
-- values ('logos', 'logos', true, 2097152)
-- on conflict (id) do nothing;

-- Migration: run this if the table already exists to add the new columns
-- alter table previews add column if not exists variation_a_html text;
-- alter table previews add column if not exists variation_a_style text default 'Clean & Minimal';
-- alter table previews add column if not exists variation_b_html text;
-- alter table previews add column if not exists variation_b_style text default 'Bold & Modern';
-- alter table previews add column if not exists variation_c_html text;
-- alter table previews add column if not exists variation_c_style text default 'Dark & Sleek';

-- Migration: add business_name for Google Maps-sourced previews
-- alter table previews add column if not exists business_name text;
