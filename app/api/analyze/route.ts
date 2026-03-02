import { NextRequest, NextResponse } from "next/server";
import { scrapeWebsite } from "@/lib/scraper";
import { analyzeBusinessContent } from "@/lib/ai";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
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
    const { profile, styles, pageStructure } = await analyzeBusinessContent(
      url,
      scrapedData
    );

    return NextResponse.json({
      profile,
      styles,
      pageStructure,
      imageUrls: scrapedData.imageUrls,
    });
  } catch (err) {
    console.error("Analyze error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
