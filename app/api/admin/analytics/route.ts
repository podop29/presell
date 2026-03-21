import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUser } from "@/lib/auth";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim()).filter(Boolean);

export async function GET() {
  try {
    const user = await getUser();
    if (!user || !ADMIN_EMAILS.includes(user.email || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000).toISOString();

    // Event counts by name (7d, 30d, all time)
    const { data: allEvents } = await supabaseAdmin
      .from("analytics_events")
      .select("event_name, created_at");

    const eventCounts: Record<string, { total: number; last7d: number; last30d: number }> = {};
    for (const ev of allEvents || []) {
      if (!eventCounts[ev.event_name]) {
        eventCounts[ev.event_name] = { total: 0, last7d: 0, last30d: 0 };
      }
      eventCounts[ev.event_name].total++;
      if (ev.created_at >= sevenDaysAgo) eventCounts[ev.event_name].last7d++;
      if (ev.created_at >= thirtyDaysAgo) eventCounts[ev.event_name].last30d++;
    }

    // Signups by day (last 30 days)
    const signupEvents = (allEvents || []).filter(
      (e) => e.event_name === "user_signup" && e.created_at >= thirtyDaysAgo
    );
    const signupsByDay: Record<string, number> = {};
    for (const ev of signupEvents) {
      const day = ev.created_at.slice(0, 10);
      signupsByDay[day] = (signupsByDay[day] || 0) + 1;
    }

    // Total preview views
    const { count: totalPreviewViews } = await supabaseAdmin
      .from("preview_views")
      .select("id", { count: "exact", head: true })
      .eq("is_owner", false);

    // Total users (from auth.users via previews or credits)
    const { count: totalUsers } = await supabaseAdmin
      .from("user_credits")
      .select("user_id", { count: "exact", head: true });

    // Recent events
    const { data: recentEvents } = await supabaseAdmin
      .from("analytics_events")
      .select("event_name, user_id, properties, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    return NextResponse.json({
      eventCounts,
      signupsByDay,
      totalPreviewViews: totalPreviewViews || 0,
      totalUsers: totalUsers || 0,
      recentEvents: recentEvents || [],
    });
  } catch (err) {
    console.error("Admin analytics error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
