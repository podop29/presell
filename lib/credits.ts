import { supabaseAdmin } from "@/lib/supabase/admin";

export const SIGNUP_BONUS = 3;
export const FREE_REVISIONS = 3;
export const REVISIONS_PER_CREDIT = 5;

/**
 * Get credit balance for a user. On first call, creates the user_credits row
 * with the signup bonus (handles race conditions with ON CONFLICT).
 */
export async function getBalance(userId: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from("user_credits")
    .select("balance")
    .eq("user_id", userId)
    .single();

  if (data) return data.balance;

  // First time — create row with signup bonus
  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("user_credits")
    .upsert(
      { user_id: userId, balance: SIGNUP_BONUS },
      { onConflict: "user_id", ignoreDuplicates: true }
    )
    .select("balance")
    .single();

  if (insertError) {
    // Race condition: another request created the row — re-fetch
    const { data: refetched } = await supabaseAdmin
      .from("user_credits")
      .select("balance")
      .eq("user_id", userId)
      .single();
    if (refetched) {
      return refetched.balance;
    }
    throw new Error("Failed to get or create user credits");
  }

  // Log the signup bonus transaction
  await supabaseAdmin.from("credit_transactions").insert({
    user_id: userId,
    amount: SIGNUP_BONUS,
    type: "signup_bonus",
    description: "Welcome bonus credits",
  });

  return inserted?.balance ?? SIGNUP_BONUS;
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
