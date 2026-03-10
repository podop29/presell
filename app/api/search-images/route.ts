import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { rateLimit, getIP } from "@/lib/rate-limit";
import { searchPexels } from "@/lib/pexels";

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getIP(req.headers);
  const limit = await rateLimit(`search-images:${ip}`, {
    maxRequests: 20,
    windowMs: 60 * 1000,
  });
  if (!limit.success) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${limit.retryAfter}s.` },
      { status: 429 }
    );
  }

  const query = req.nextUrl.searchParams.get("q")?.trim();
  if (!query || query.length > 200) {
    return NextResponse.json(
      { error: "A search query is required (max 200 chars)." },
      { status: 400 }
    );
  }

  const urls = await searchPexels([query], 5);
  return NextResponse.json({ images: urls });
}
