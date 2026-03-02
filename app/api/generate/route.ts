import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { supabase } from "@/lib/supabase";
import { scrapeWebsite } from "@/lib/scraper";
import { analyzeBusinessContent, generateVariations } from "@/lib/ai";
import type { GenerateRequest } from "@/types";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body: GenerateRequest = await req.json();
    const { url, devName, devEmail, devMessage } = body;

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL provided." }, { status: 400 });
    }

    if (!devName || !devEmail) {
      return NextResponse.json(
        { error: "Name and email are required." },
        { status: 400 }
      );
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

    // Check timeout
    if (Date.now() - startTime > 100_000) {
      return NextResponse.json(
        { error: "Generation is taking too long. Please try again." },
        { status: 504 }
      );
    }

    // Step 2: Analyze business content (Pass 1)
    const profile = await analyzeBusinessContent(url, scrapedData);

    // Check timeout
    if (Date.now() - startTime > 100_000) {
      return NextResponse.json(
        { error: "Generation is taking too long. Please try again." },
        { status: 504 }
      );
    }

    // Step 3: Generate 3 variations in parallel (Pass 2)
    let variations;
    try {
      variations = await generateVariations(profile, scrapedData.imageUrls);
    } catch {
      return NextResponse.json(
        { error: "Redesign generation failed. Please try again." },
        { status: 500 }
      );
    }

    // Check timeout
    if (Date.now() - startTime > 100_000) {
      return NextResponse.json(
        { error: "Generation is taking too long. Please try again." },
        { status: 504 }
      );
    }

    // Step 4: Save to Supabase
    const slug = nanoid(8);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const { error: dbError } = await supabase.from("previews").insert({
      slug,
      original_url: url,
      original_screenshot: scrapedData.screenshot,
      redesign_html: variations.a,
      dev_name: devName,
      dev_email: devEmail,
      dev_message: devMessage || null,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      variation_a_html: variations.a,
      variation_a_style: "Clean & Minimal",
      variation_b_html: variations.b,
      variation_b_style: "Bold & Modern",
      variation_c_html: variations.c,
      variation_c_style: "Dark & Sleek",
    });

    if (dbError) {
      console.error("Supabase insert error:", dbError);
      return NextResponse.json(
        { error: "Failed to save preview. Please try again." },
        { status: 500 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    return NextResponse.json({
      slug,
      previewUrl: `${baseUrl}/preview/${slug}`,
    });
  } catch (err) {
    console.error("Generate error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
