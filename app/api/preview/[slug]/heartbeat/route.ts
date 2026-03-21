import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { rateLimit, getIP } from "@/lib/rate-limit";

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const ip = getIP(req.headers);

    const limit = await rateLimit(`heartbeat:${ip}`, {
      maxRequests: 10,
      windowMs: 60 * 1000,
    });
    if (!limit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { viewId } = await req.json();
    if (!viewId) {
      return NextResponse.json({ error: "Missing viewId" }, { status: 400 });
    }

    await supabaseAdmin.rpc("increment_view_duration", {
      view_id: viewId,
      view_slug: slug,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
