import { supabaseAdmin } from "@/lib/supabase/admin";
import { notifySuccess } from "@/lib/discord";

export const SIGNUP_BONUS = 1;
export const FREE_REVISIONS = 5;
export const REVISIONS_PER_CREDIT = 5;

/**
 * How many accounts from one IP may claim the signup bonus. Beyond this, new
 * accounts are still created and can sign in and buy credits — they just start
 * at a 0 balance. Set MAX_FREE_SIGNUPS_PER_IP to loosen it for shared networks.
 */
const rawMaxFreeSignups = process.env.MAX_FREE_SIGNUPS_PER_IP?.trim();
export const MAX_FREE_SIGNUPS_PER_IP =
  rawMaxFreeSignups && Number.isFinite(Number(rawMaxFreeSignups)) && Number(rawMaxFreeSignups) >= 0
    ? Number(rawMaxFreeSignups)
    : 1;

export type CreditStatus = {
  balance: number;
  /** Account has no credits *because* its IP already used up the free quota. */
  bonusBlocked: boolean;
};

/** Has this IP already handed out its allowance of signup bonuses? */
async function ipQuotaExhausted(ip: string): Promise<boolean> {
  const { count, error } = await supabaseAdmin
    .from("user_credits")
    .select("user_id", { count: "exact", head: true })
    .eq("signup_ip", ip)
    .eq("signup_bonus_blocked", false);

  // Fail open — a broken count should never cost a legitimate user their bonus.
  if (error) return false;

  return (count ?? 0) >= MAX_FREE_SIGNUPS_PER_IP;
}

/** Has this user ever received credits from any source (purchase, code, bonus)? */
async function hasEverReceivedCredits(userId: string): Promise<boolean> {
  const { count } = await supabaseAdmin
    .from("credit_transactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gt("amount", 0);

  return (count ?? 0) > 0;
}

/**
 * Get credit balance for a user. On first call, creates the user_credits row
 * with the signup bonus (handles race conditions with ON CONFLICT).
 *
 * Pass the request IP so the signup bonus can be capped per IP — people were
 * cycling throwaway accounts to farm free credits. Callers without a request
 * context (e.g. the Stripe webhook) can omit it; those paths only ever run for
 * users who already exist or already paid.
 */
export async function getCreditStatus(
  userId: string,
  ip?: string
): Promise<CreditStatus> {
  const { data } = await supabaseAdmin
    .from("user_credits")
    .select("balance, signup_bonus_blocked")
    .eq("user_id", userId)
    .single();

  if (data) {
    // Only report "blocked" for an account that never received credits at all.
    // A paying customer who spent down to 0 is just out of credits.
    const bonusBlocked =
      data.balance === 0 && data.signup_bonus_blocked
        ? !(await hasEverReceivedCredits(userId))
        : false;

    return { balance: data.balance, bonusBlocked };
  }

  // First time — create the row, granting the signup bonus unless this IP has
  // already claimed its share.
  const signupIp = ip && ip !== "unknown" ? ip : null;
  const blocked = signupIp ? await ipQuotaExhausted(signupIp) : false;
  const bonus = blocked ? 0 : SIGNUP_BONUS;

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("user_credits")
    .upsert(
      {
        user_id: userId,
        balance: bonus,
        signup_ip: signupIp,
        signup_bonus_blocked: blocked,
      },
      { onConflict: "user_id", ignoreDuplicates: true }
    )
    .select("balance, signup_bonus_blocked")
    .single();

  if (insertError) {
    // Race condition: another request created the row — re-fetch
    const { data: refetched } = await supabaseAdmin
      .from("user_credits")
      .select("balance, signup_bonus_blocked")
      .eq("user_id", userId)
      .single();
    if (refetched) {
      return {
        balance: refetched.balance,
        bonusBlocked: refetched.balance === 0 && !!refetched.signup_bonus_blocked,
      };
    }
    throw new Error("Failed to get or create user credits");
  }

  if (!blocked) {
    // Log the signup bonus transaction
    await supabaseAdmin.from("credit_transactions").insert({
      user_id: userId,
      amount: SIGNUP_BONUS,
      type: "signup_bonus",
      description: "Welcome bonus credits",
    });
  }

  // Notify Discord of new account
  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
  notifySuccess(blocked ? "New account — signup bonus blocked" : "New account created", {
    email: authUser?.user?.email || "unknown",
    userId,
    ip: signupIp || "unknown",
    ...(blocked ? { reason: `IP already used ${MAX_FREE_SIGNUPS_PER_IP} free signup(s)` } : {}),
  });

  return { balance: inserted?.balance ?? bonus, bonusBlocked: blocked };
}

/** Convenience wrapper for callers that only need the number. */
export async function getBalance(userId: string, ip?: string): Promise<number> {
  const { balance } = await getCreditStatus(userId, ip);
  return balance;
}

/**
 * Deduct credits from a user's balance. Returns success/balance.
 */
export async function deductCredit(
  userId: string,
  amount: number,
  type: string,
  description: string,
  referenceId?: string
): Promise<{ success: boolean; balance: number }> {
  const { error } = await supabaseAdmin.rpc("deduct_credits", {
    p_user_id: userId,
    p_amount: amount,
  });

  if (error) {
    const balance = await getBalance(userId);
    return { success: false, balance };
  }

  // Log transaction
  await supabaseAdmin.from("credit_transactions").insert({
    user_id: userId,
    amount: -amount,
    type,
    description,
    reference_id: referenceId ?? null,
  });

  const balance = await getBalance(userId);
  return { success: true, balance };
}

/**
 * Add credits to a user's balance.
 */
export async function addCredits(
  userId: string,
  amount: number,
  type: string,
  description: string,
  referenceId?: string
): Promise<void> {
  const { error } = await supabaseAdmin.rpc("add_credits", {
    p_user_id: userId,
    p_amount: amount,
  });

  if (error) {
    throw new Error(`Failed to add credits: ${error.message}`);
  }

  await supabaseAdmin.from("credit_transactions").insert({
    user_id: userId,
    amount,
    type,
    description,
    reference_id: referenceId ?? null,
  });
}

export type RedeemResult =
  | { success: true; credits: number; balance: number }
  | {
      success: false;
      reason: "NOT_FOUND" | "EXPIRED" | "EXHAUSTED" | "ALREADY_REDEEMED" | "ERROR";
    };

/**
 * Redeem a code for free credits. The RPC handles validation, idempotency,
 * and credit grant atomically; this wrapper just maps Postgres errors to
 * stable reason codes the API layer can return.
 */
export async function redeemCode(
  userId: string,
  rawCode: string
): Promise<RedeemResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { success: false, reason: "NOT_FOUND" };

  const { data, error } = await supabaseAdmin.rpc("redeem_code", {
    p_user_id: userId,
    p_code: code,
  });

  if (error) {
    const msg = error.message || "";
    if (msg.includes("NOT_FOUND")) return { success: false, reason: "NOT_FOUND" };
    if (msg.includes("EXPIRED")) return { success: false, reason: "EXPIRED" };
    if (msg.includes("EXHAUSTED")) return { success: false, reason: "EXHAUSTED" };
    if (msg.includes("ALREADY_REDEEMED"))
      return { success: false, reason: "ALREADY_REDEEMED" };
    return { success: false, reason: "ERROR" };
  }

  const credits = typeof data === "number" ? data : Number(data) || 0;
  const balance = await getBalance(userId);

  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
  notifySuccess("Code redeemed", {
    email: authUser?.user?.email || "unknown",
    code,
    credits: String(credits),
    balance: String(balance),
  });

  return { success: true, credits, balance };
}

/**
 * Get revision info for a preview.
 */
export async function getRevisionInfo(slug: string): Promise<{
  revisionCount: number;
  revisionLimit: number;
  freeRemaining: number;
  canRevise: boolean;
}> {
  const { data, error } = await supabaseAdmin
    .from("previews")
    .select("revision_count, revision_limit")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    return {
      revisionCount: 0,
      revisionLimit: FREE_REVISIONS,
      freeRemaining: FREE_REVISIONS,
      canRevise: true,
    };
  }

  const freeRemaining = Math.max(0, data.revision_limit - data.revision_count);

  return {
    revisionCount: data.revision_count,
    revisionLimit: data.revision_limit,
    freeRemaining,
    canRevise: data.revision_count < data.revision_limit,
  };
}

/**
 * Increment the revision count for a preview.
 */
export async function incrementRevisionCount(slug: string): Promise<void> {
  await supabaseAdmin.rpc("increment_revision_count", { p_slug: slug });
}

/**
 * Unlock more revisions for a preview by spending 1 credit.
 */
export async function unlockRevisions(
  userId: string,
  slug: string
): Promise<{ success: boolean; balance: number; newLimit: number }> {
  const result = await deductCredit(
    userId,
    1,
    "revision_unlock",
    `Unlocked ${REVISIONS_PER_CREDIT} more revisions`,
    slug
  );

  if (!result.success) {
    return { success: false, balance: result.balance, newLimit: 0 };
  }

  await supabaseAdmin.rpc("increase_revision_limit", {
    p_slug: slug,
    p_amount: REVISIONS_PER_CREDIT,
  });

  const info = await getRevisionInfo(slug);
  return { success: true, balance: result.balance, newLimit: info.revisionLimit };
}
