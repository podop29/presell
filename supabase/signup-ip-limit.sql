-- ═══════════════════════════════════════════════════════════════════
-- Signup bonus abuse control: cap free credits per IP
--
-- Records the IP an account claimed its signup bonus from, so a second
-- account from the same IP can be created with a 0 balance instead of
-- another free credit.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE user_credits ADD COLUMN IF NOT EXISTS signup_ip TEXT;

-- true = this account was created but denied the signup bonus because its IP
-- had already used its quota. Existing rows default to false: they all got one.
ALTER TABLE user_credits
  ADD COLUMN IF NOT EXISTS signup_bonus_blocked BOOLEAN NOT NULL DEFAULT false;

-- The quota check counts rows by signup_ip on every first-time balance lookup.
CREATE INDEX IF NOT EXISTS idx_user_credits_signup_ip
  ON user_credits (signup_ip)
  WHERE signup_ip IS NOT NULL;


-- ── Backfill (optional but recommended) ──────────────────────────
-- Existing accounts have no signup_ip, so their IPs start with a clean quota
-- and a known abuser could claim one more free credit. Recover the IP from the
-- earliest analytics event we logged for each user.
--
-- IPv6 addresses are skipped: the app now keys on the /64 prefix, and
-- reproducing that truncation in SQL isn't worth it for the handful of rows.

UPDATE user_credits uc
SET signup_ip = first_event.ip_address
FROM (
  SELECT DISTINCT ON (user_id) user_id, ip_address
  FROM analytics_events
  WHERE user_id IS NOT NULL
    AND ip_address IS NOT NULL
    AND ip_address <> 'unknown'
    AND ip_address NOT LIKE '%:%'   -- IPv4 only
  ORDER BY user_id, created_at ASC
) AS first_event
WHERE uc.user_id = first_event.user_id
  AND uc.signup_ip IS NULL;


-- ── Handy: which IPs have multiple accounts? ─────────────────────
-- SELECT signup_ip, count(*) AS accounts, sum(balance) AS total_balance
-- FROM user_credits
-- WHERE signup_ip IS NOT NULL
-- GROUP BY signup_ip
-- HAVING count(*) > 1
-- ORDER BY accounts DESC;
