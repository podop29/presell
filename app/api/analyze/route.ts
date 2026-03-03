import { NextRequest, NextResponse } from "next/server";
import { scrapeWebsite } from "@/lib/scraper";
import { analyzeBusinessContent } from "@/lib/ai";
import { searchPexels } from "@/lib/pexels";
import { rateLimit, getIP } from "@/lib/rate-limit";
import { getUser } from "@/lib/auth";
import { getBalance } from "@/lib/credits";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    // Require auth
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "You must be signed in to analyze a site." },
        { status: 401 }
      );
    }

    // Check credits before doing expensive scrape + AI work
    const balance = await getBalance(user.id);
    if (balance < 1) {
      return NextResponse.json(
        { error: "You don't have enough credits.", insufficientCredits: true, balance: 0 },
        { status: 402 }
      );
    }

    // Rate limit: 5 analyses per 10 minutes per IP
    const ip = getIP(req.headers);
    const limit = rateLimit(`analyze:${ip}`, { maxRequests: 5, windowMs: 10 * 60 * 1000 });
    if (!limit.success) {
      return NextResponse.json(
        { error: `Too many requests. Please try again in ${limit.retryAfter} seconds.` },
        { status: 429 }
      );
    }

    const { url } = await req.json();

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL provided." }, { status: 400 });
    }

    // Step 1: Scrape the website
    let scrapedData;
    try {
      scrapedData = await scrapeWebsite(url);
    } catch (scrapeErr) {
      console.error("Scrape error:", scrapeErr);
      return NextResponse.json(
        {
          error:
            "We couldn't access this website. It may be blocking automated access. Try a different URL.",
        },
        { status: 422 }
      );
    }

    // Step 2: Analyze business content + generate style directions
    let profile, styles, pageStructure, imageSearchQueries;
    try {
      ({ profile, styles, pageStructure, imageSearchQueries } =
        await analyzeBusinessContent(url, scrapedData));
    } catch (aiErr) {
      console.error("AI analysis error:", aiErr);
      return NextResponse.json(
        { error: "AI analysis failed — please check your API key or credits and try again." },
        { status: 502 }
      );
    }

    // Step 3: Fetch stock images from Pexels using AI-suggested queries
    let stockImageUrls: string[] = [];
    if (imageSearchQueries.length > 0) {
      try {
        stockImageUrls = await searchPexels(imageSearchQueries);
      } catch (err) {
        console.error("Pexels search error:", err);
      }
    }

    return NextResponse.json({
      profile,
      styles,
      pageStructure,
      imageUrls: scrapedData.imageUrls,
      stockImageUrls,
      pageContent: scrapedData.content.slice(0, 5000),
    });
  } catch (err) {
    console.error("Analyze error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
