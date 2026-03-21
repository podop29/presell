import { NextRequest, NextResponse } from "next/server";
import { trackEvent } from "@/lib/analytics";
import { rateLimit, getIP } from "@/lib/rate-limit";
import { getUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const ip = getIP(req.headers);
    const limit = await rateLimit(`analytics:${ip}`, {
      maxRequests: 60,
      windowMs: 60 * 1000,
    });
    if (!limit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { eventName, properties } = await req.json();
    if (!eventName || typeof eventName !== "string") {
      return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    }

    const user = await getUser().catch(() => null);

    trackEvent(eventName, properties ?? {}, {
      userId: user?.id,
      ip,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
