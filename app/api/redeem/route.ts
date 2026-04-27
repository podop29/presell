import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { rateLimit, getIP } from "@/lib/rate-limit";
import { redeemCode } from "@/lib/credits";

const ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: "That code doesn't exist.",
  EXPIRED: "That code has expired.",
  EXHAUSTED: "That code has reached its redemption limit.",
  ALREADY_REDEEMED: "You've already redeemed this code.",
  ERROR: "Something went wrong. Try again.",
};

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to redeem a code." }, { status: 401 });
  }

  const ip = getIP(req.headers);
  const limit = await rateLimit(`redeem:${ip}`, {
    maxRequests: 10,
    windowMs: 10 * 60 * 1000,
  });
  if (!limit.success) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${limit.retryAfter} seconds.` },
      { status: 429 }
    );
  }

  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const code = (body.code || "").trim();
  if (!code) {
    return NextResponse.json({ error: "Enter a code." }, { status: 400 });
  }

  const result = await redeemCode(user.id, code);

  if (!result.success) {
    return NextResponse.json(
      { error: ERROR_MESSAGES[result.reason] },
      { status: result.reason === "ERROR" ? 500 : 400 }
    );
  }

  return NextResponse.json({
    success: true,
    credits: result.credits,
    balance: result.balance,
  });
}
