-- ═══════════════════════════════════════════════════════════════════
-- Redemption Codes: shareable codes that grant free credits
-- ═══════════════════════════════════════════════════════════════════
--
-- Security model:
--   • redemption_codes — NO access for anon/authenticated. The codes
--     themselves (and their remaining-uses counters) are admin-only data.
--     All user-driven reads/writes go through the redeem_code() RPC,
--     which runs as SECURITY DEFINER and bypasses RLS.
--   • redemptions — users can SELECT their own rows (so they could see
--     redemption history if we ever surface it). Writes happen only via
--     the RPC; no INSERT/UPDATE/DELETE policy means the API has no path
--     to forge or alter rows.
--   • service_role bypasses RLS unconditionally (Supabase default), so
--     the cron, webhooks, and admin endpoints can manage codes freely.

-- ── redemption_codes ──────────────────────────────────────────────
-- Each row defines a redeemable code (e.g. 'PHUNT'). One code per row.
CREATE TABLE redemption_codes (
  code         TEXT PRIMARY KEY,
  credits      INTEGER NOT NULL CHECK (credits > 0),
  max_uses     INTEGER,                              -- NULL = unlimited
  uses_count   INTEGER NOT NULL DEFAULT 0,
  expires_at   TIMESTAMPTZ,                          -- NULL = never expires
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE redemption_codes ENABLE ROW LEVEL SECURITY;

-- Explicit deny for anon and authenticated. Redundant with "no policies"
-- (default-deny under RLS) but documents intent and prevents a future
-- maintainer from accidentally opening access by adding a permissive policy.
CREATE POLICY "redemption_codes: no client access (anon)" ON redemption_codes
  FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "redemption_codes: no client access (authenticated)" ON redemption_codes
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- ── redemptions ──────────────────────────────────────────────────
-- Idempotency ledger: one row per (code, user_id). Prevents the same
-- user from redeeming the same code twice even on concurrent requests.
CREATE TABLE redemptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code         TEXT NOT NULL REFERENCES redemption_codes(code) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits      INTEGER NOT NULL,
  redeemed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (code, user_id)
);

CREATE INDEX idx_redemptions_user_id ON redemptions(user_id);

ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;

-- Read: a user can see their own redemption history (and only their own).
CREATE POLICY "redemptions: users read own" ON redemptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Write: explicitly deny direct INSERT/UPDATE/DELETE from clients.
-- The redeem_code() RPC inserts via SECURITY DEFINER, which bypasses RLS.
CREATE POLICY "redemptions: no direct insert" ON redemptions
  FOR INSERT TO authenticated WITH CHECK (false);

CREATE POLICY "redemptions: no update" ON redemptions
  FOR UPDATE TO authenticated USING (false) WITH CHECK (false);

CREATE POLICY "redemptions: no delete" ON redemptions
  FOR DELETE TO authenticated USING (false);

-- ── RPC: redeem_code ─────────────────────────────────────────────
-- Atomically validates a code, grants credits, and logs the redemption.
-- Raises with a stable SQLERRM string the API layer can match against.
CREATE OR REPLACE FUNCTION redeem_code(p_user_id UUID, p_code TEXT)
RETURNS INTEGER  -- credits granted
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code      redemption_codes%ROWTYPE;
  v_credits   INTEGER;
BEGIN
  -- Normalize the code to upper-case for case-insensitive matching.
  p_code := upper(trim(p_code));

  -- Lock the code row so concurrent redemptions can't race past max_uses.
  SELECT * INTO v_code FROM redemption_codes
    WHERE code = p_code
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN
    RAISE EXCEPTION 'EXPIRED';
  END IF;

  IF v_code.max_uses IS NOT NULL AND v_code.uses_count >= v_code.max_uses THEN
    RAISE EXCEPTION 'EXHAUSTED';
  END IF;

  -- Insert the redemption row. Unique (code, user_id) catches double-redeem.
  BEGIN
    INSERT INTO redemptions (code, user_id, credits)
      VALUES (p_code, p_user_id, v_code.credits);
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'ALREADY_REDEEMED';
  END;

  -- Increment usage counter.
  UPDATE redemption_codes
    SET uses_count = uses_count + 1
    WHERE code = p_code;

  -- Ensure user_credits row exists, then add the credits.
  INSERT INTO user_credits (user_id, balance)
    VALUES (p_user_id, v_code.credits)
    ON CONFLICT (user_id) DO UPDATE
      SET balance = user_credits.balance + EXCLUDED.balance,
          updated_at = now();

  -- Log the transaction (matches existing credit ledger).
  INSERT INTO credit_transactions (user_id, amount, type, description, reference_id)
    VALUES (
      p_user_id,
      v_code.credits,
      'redemption',
      'Redeemed code ' || p_code,
      p_code
    );

  v_credits := v_code.credits;
  RETURN v_credits;
END;
$$;
