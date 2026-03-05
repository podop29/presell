-- Migration: add profile_json and page_content columns for revision context
alter table previews add column if not exists profile_json jsonb;
alter table previews add column if not exists page_content text;
