-- Migration: record the QA outcome for each generated preview.
--
-- Before this, a QA failure was indistinguishable from a clean pass — the
-- reviewer's catch block returned { pass: true, score: 75 } and nothing was
-- persisted. These columns let you find previews that shipped with known
-- defects, or that were never actually checked.
--
-- qa_status:
--   'passed'  — clean on the first pass
--   'fixed'   — had defects, fix pass resolved them (or a rebuild did)
--   'failed'  — shipped with critical/major defects still present
--   'skipped' — QA could not run (render or API failure); score is meaningless

alter table previews add column if not exists qa_status text;
alter table previews add column if not exists qa_score integer;

-- Find previews that need a manual look
create index if not exists idx_previews_qa_status
  on previews (qa_status)
  where qa_status in ('failed', 'skipped');

-- Useful query:
--   select slug, business_name, qa_status, qa_score, created_at
--   from previews
--   where qa_status in ('failed', 'skipped')
--   order by created_at desc;
