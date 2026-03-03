-- ═══════════════════════════════════════════════════════════════════
-- Credit System: tables, columns, RPC functions
-- ═══════════════════════════════════════════════════════════════════

-- ── user_credits ──────────────────────────────────────────────────
CREATE TABLE user_credits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credits" ON user_credits
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ── credit_transactions ──────────────────────────────────────────
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  reference_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);

ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON credit_transactions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ── previews: revision tracking columns ──────────────────────────
ALTER TABLE previews ADD COLUMN revision_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE previews ADD COLUMN revision_limit INTEGER NOT NULL DEFAULT 3;

-- ── RPC: deduct_credits ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION deduct_credits(p_user_id UUID, p_amount INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_credits
    SET balance = balance - p_amount,
        updated_at = now()
    WHERE user_id = p_user_id
      AND balance >= p_amount;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;
END;
$$;

-- ── RPC: add_credits ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION add_credits(p_user_id UUID, p_amount INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_credits
    SET balance = balance + p_amount,
        updated_at = now()
    WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User credits row not found';
  END IF;
END;
$$;

-- ── RPC: increment_revision_count ────────────────────────────────
CREATE OR REPLACE FUNCTION increment_revision_count(p_slug TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE previews
    SET revision_count = revision_count + 1
    WHERE slug = p_slug;
END;
$$;

-- ── RPC: increase_revision_limit ─────────────────────────────────
CREATE OR REPLACE FUNCTION increase_revision_limit(p_slug TEXT, p_amount INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE previews
    SET revision_limit = revision_limit + p_amount
    WHERE slug = p_slug;
END;
$$;
