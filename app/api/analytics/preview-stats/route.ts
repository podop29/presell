import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all preview slugs owned by this user
    const { data: previews } = await supabaseAdmin
      .from("previews")
      .select("id, slug")
      .eq("user_id", user.id);

    if (!previews || previews.length === 0) {
      return NextResponse.json({ stats: {} });
    }

    const previewIds = previews.map((p) => p.id);

    // Get all non-owner views for these previews
    const { data: views } = await supabaseAdmin
      .from("preview_views")
      .select("slug, visitor_hash, duration_seconds, created_at")
      .in("preview_id", previewIds)
      .eq("is_owner", false);

    if (!views || views.length === 0) {
      return NextResponse.json({ stats: {} });
    }

    // Aggregate per slug
    const stats: Record<
      string,
      {
        totalViews: number;
        uniqueVisitors: number;
        lastViewed: string;
        totalTimeSeconds: number;
      }
    > = {};

    for (const view of views) {
      if (!stats[view.slug]) {
        stats[view.slug] = {
          totalViews: 0,
          uniqueVisitors: 0,
          lastViewed: view.created_at,
          totalTimeSeconds: 0,
        };
      }
      const s = stats[view.slug];
      s.totalViews++;
      s.totalTimeSeconds += view.duration_seconds || 0;
      if (view.created_at > s.lastViewed) {
        s.lastViewed = view.created_at;
      }
    }

    // Count unique visitors per slug
    for (const slug of Object.keys(stats)) {
      const uniqueHashes = new Set(
        views.filter((v) => v.slug === slug).map((v) => v.visitor_hash)
      );
      stats[slug].uniqueVisitors = uniqueHashes.size;
    }

    return NextResponse.json({ stats });
  } catch (err) {
    console.error("Preview stats error:", err);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
