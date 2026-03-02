import { NextRequest, NextResponse } from "next/server";
import { scrapeWebsite } from "@/lib/scraper";
import { analyzeBusinessContent } from "@/lib/ai";
import { searchPexels } from "@/lib/pexels";

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
    const { profile, styles, pageStructure, imageSearchQueries } =
      await analyzeBusinessContent(url, scrapedData);

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
    });
  } catch (err) {
    console.error("Analyze error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
