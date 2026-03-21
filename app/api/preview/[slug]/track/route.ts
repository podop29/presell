import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { rateLimit, getIP } from "@/lib/rate-limit";
import { getUser } from "@/lib/auth";
import { trackEvent } from "@/lib/analytics";
import { createHash } from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const ip = getIP(req.headers);

    const limit = await rateLimit(`track:${ip}`, {
      maxRequests: 30,
      windowMs: 60 * 1000,
    });
    if (!limit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Look up the preview
    const { data: preview } = await supabaseAdmin
      .from("previews")
      .select("id, user_id")
      .eq("slug", slug)
      .single();

    if (!preview) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const userAgent = req.headers.get("user-agent") || "";
    const referrer = req.headers.get("referer") || "";
    const visitorHash = createHash("sha256")
      .update(ip + userAgent)
      .digest("hex")
      .slice(0, 16);

    // Check if current viewer is the owner or an admin
    const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim()).filter(Boolean);
    let isOwner = false;
    try {
      const user = await getUser();
      if (user && (user.id === preview.user_id || adminEmails.includes(user.email || ""))) {
        isOwner = true;
      }
    } catch {
      // Not authenticated — that's fine, it's a prospect
    }

    const { data: view, error } = await supabaseAdmin
      .from("preview_views")
      .insert({
        preview_id: preview.id,
        slug,
        visitor_hash: visitorHash,
        ip_address: ip,
        user_agent: userAgent,
        referrer,
        is_owner: isOwner,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to track view:", error.message);
      return NextResponse.json({ error: "Failed to track" }, { status: 500 });
    }

    // Also log to analytics_events for unified admin view
    trackEvent("preview_viewed", { slug, isOwner }, {
      userId: isOwner ? preview.user_id : undefined,
      ip,
      userAgent,
    });

    return NextResponse.json({ viewId: view.id });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
