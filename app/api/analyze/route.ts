import { NextRequest, NextResponse } from "next/server";
import { scrapeWebsite } from "@/lib/scraper";
import { analyzeBusinessContent, analyzeGooglePlaceData } from "@/lib/ai";
import { searchPexelsGrouped } from "@/lib/pexels";
import { rateLimit, getIP } from "@/lib/rate-limit";
import { getUser } from "@/lib/auth";
import { getBalance } from "@/lib/credits";
import {
  extractPlaceId,
  fetchPlaceDetails,
  getPlacePhotoUrls,
} from "@/lib/google-places";
import { notifyError } from "@/lib/discord";
import { validateExternalUrl } from "@/lib/validate-url";

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
    const limit = await rateLimit(`analyze:${ip}`, { maxRequests: 5, windowMs: 10 * 60 * 1000 });
    if (!limit.success) {
      return NextResponse.json(
        { error: `Too many requests. Please try again in ${limit.retryAfter} seconds.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const source: "website" | "google-maps" = body.source || "website";

    // ─── Google Maps flow ───
    if (source === "google-maps") {
      const mapsUrl = body.mapsUrl as string | undefined;
      if (!mapsUrl) {
        return NextResponse.json({ error: "No Google Maps URL provided." }, { status: 400 });
      }

      const mapsCheck = validateExternalUrl(mapsUrl);
      if (!mapsCheck.valid) {
        return NextResponse.json({ error: mapsCheck.reason }, { status: 400 });
      }

      // Step 1: Extract place_id and fetch details
      let placeData;
      try {
        const placeId = await extractPlaceId(mapsUrl);
        placeData = await fetchPlaceDetails(placeId);
      } catch (placeErr) {
        console.error("Google Places error:", placeErr);
        notifyError("Google Places error", placeErr, { url: mapsUrl });
        return NextResponse.json(
          {
            error:
              placeErr instanceof Error
                ? placeErr.message
                : "Could not fetch business details from Google Maps.",
          },
          { status: 422 }
        );
      }

      // Step 2: Analyze with AI
      let profile, styles, pageStructure, imageSearchQueries, classifiedImages;
      try {
        ({ profile, styles, pageStructure, imageSearchQueries, classifiedImages } =
          await analyzeGooglePlaceData(placeData));
      } catch (aiErr) {
        console.error("AI analysis error:", aiErr);
        notifyError("AI analysis error (Google Maps)", aiErr);
        return NextResponse.json(
          { error: "AI analysis failed — please check your API key or credits and try again." },
          { status: 502 }
        );
      }

      // Step 3: Get Google Places photos + Pexels stock images
      const placePhotoUrls = getPlacePhotoUrls(placeData.photos);

      let stockImages = { hero: [] as string[], secondary: [] as string[], atmosphere: [] as string[] };
      if (imageSearchQueries.length > 0) {
        try {
          stockImages = await searchPexelsGrouped(imageSearchQueries);
        } catch (err) {
          console.error("Pexels search error:", err);
          notifyError("Pexels search error", err);
        }
      }

      // Build pageContent from reviews + hours + summary
      const reviewContent = placeData.reviews
        .map((r) => `"${r.text}" — ${r.author_name} (${r.rating}/5)`)
        .join("\n\n");
      const hoursContent = placeData.opening_hours?.weekday_text?.join("\n") || "";
      const summaryContent = placeData.editorial_summary?.overview || "";
      const pageContent = [
        placeData.name,
        placeData.formatted_address,
        placeData.formatted_phone_number,
        summaryContent,
        hoursContent ? `Hours:\n${hoursContent}` : "",
        reviewContent ? `Reviews:\n${reviewContent}` : "",
      ]
        .filter(Boolean)
        .join("\n\n")
        .slice(0, 5000);

      return NextResponse.json({
        profile,
        styles,
        pageStructure,
        imageUrls: placePhotoUrls,
        stockImageUrls: [...stockImages.hero, ...stockImages.secondary, ...stockImages.atmosphere],
        stockImages,
        pageContent,
        classifiedImages: classifiedImages || [],
      });
    }

    // ─── Website flow (existing) ───
    const { url } = body;

    // Validate URL — block private/internal addresses
    const urlCheck = validateExternalUrl(url);
    if (!urlCheck.valid) {
      return NextResponse.json({ error: urlCheck.reason }, { status: 400 });
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
    let profile, styles, pageStructure, imageSearchQueries, classifiedImages;
    try {
      ({ profile, styles, pageStructure, imageSearchQueries, classifiedImages } =
        await analyzeBusinessContent(url, scrapedData));
    } catch (aiErr) {
      console.error(`AI analysis error for ${url}:`, aiErr);
      notifyError("AI analysis error", aiErr, { url });
      return NextResponse.json(
        { error: "AI analysis failed — please check your API key or credits and try again." },
        { status: 502 }
      );
    }

    // Step 3: Fetch stock images from Pexels using AI-suggested queries
    let stockImages = { hero: [] as string[], secondary: [] as string[], atmosphere: [] as string[] };
    if (imageSearchQueries.length > 0) {
      try {
        stockImages = await searchPexelsGrouped(imageSearchQueries);
      } catch (err) {
        console.error("Pexels search error:", err);
        notifyError("Pexels search error", err);
      }
    }

    return NextResponse.json({
      profile,
      styles,
      pageStructure,
      imageUrls: scrapedData.imageUrls,
      stockImageUrls: [...stockImages.hero, ...stockImages.secondary, ...stockImages.atmosphere],
      stockImages,
      pageContent: scrapedData.content.slice(0, 5000),
      classifiedImages: classifiedImages || [],
    });
  } catch (err) {
    console.error("Analyze error:", err);
    notifyError("Analyze error", err);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
