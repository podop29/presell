-- ═══════════════════════════════════════════════════════════════════
-- 24h Follow-Up Emails: track send state + schedule hourly cron
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Column to track when we've sent the follow-up (per user) ──
ALTER TABLE user_credits
  ADD COLUMN IF NOT EXISTS follow_up_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_user_credits_follow_up_pending
  ON user_credits(user_id)
  WHERE follow_up_sent_at IS NULL;

-- ── 2. Enable pg_cron + pg_net for scheduled HTTP calls ──
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── 3. Schedule: hourly POST to /api/cron/follow-up ──
-- IMPORTANT: Before running, replace the two PLACEHOLDER values below:
--   - BASE_URL_PLACEHOLDER  → your production URL (e.g. https://pitchkit.app)
--   - CRON_SECRET_PLACEHOLDER → value of CRON_SECRET env var in Next.js
-- Re-running this block is safe: it unschedules any previous job first.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'follow-up-emails-hourly') THEN
    PERFORM cron.unschedule('follow-up-emails-hourly');
  END IF;
END $$;

SELECT cron.schedule(
  'follow-up-emails-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://pitchkit.dev/api/cron/follow-up',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Cron-Secret', 'dab27b9147cd385195a5f4b3e38e2300c585a094bc2a1486ce9fa770c914c9e6'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- ── To unschedule later: SELECT cron.unschedule('follow-up-emails-hourly');
-- ── To inspect runs:     SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
