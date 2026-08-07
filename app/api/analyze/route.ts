import { NextRequest, NextResponse } from "next/server";
import { scrapeWebsite } from "@/lib/scraper";
import { analyzeBusinessContent, analyzeGooglePlaceData } from "@/lib/ai";
import { searchPexelsGrouped } from "@/lib/pexels";
import { rateLimit, getIP } from "@/lib/rate-limit";
import { getUser } from "@/lib/auth";
import { getCreditStatus } from "@/lib/credits";
import {
  extractPlaceId,
  fetchPlaceDetails,
  getPlacePhotoUrls,
} from "@/lib/google-places";
import { notifyError } from "@/lib/discord";
import { validateExternalUrl } from "@/lib/validate-url";
import { trackEvent } from "@/lib/analytics";
import { withTimeout, StageTimeoutError, StageTimer } from "@/lib/with-timeout";

export const maxDuration = 120;

/**
 * Unlike /api/generate, this route answers with a single JSON body — no bytes
 * reach the client until the very end. A request that outlives the edge proxy's
 * patience is killed upstream and the browser sees a plain-text `upstream error`
 * 502 that never touches our error handling. Bound every stage so we always
 * answer first, and say which stage was slow.
 */
const SCRAPE_BUDGET_MS = 55_000;
const AI_BUDGET_MS = 65_000;
const IMAGE_BUDGET_MS = 15_000;

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

    const ip = getIP(req.headers);

    // Check credits before doing expensive scrape + AI work
    const { balance, bonusBlocked } = await getCreditStatus(user.id, ip);
    if (balance < 1) {
      return NextResponse.json(
        {
          error: bonusBlocked
            ? "Free starter credits have already been claimed on this network."
            : "You don't have enough credits.",
          insufficientCredits: true,
          bonusBlocked,
          balance: 0,
        },
        { status: 402 }
      );
    }

    // Rate limit: 15 analyses per 10 minutes per IP
    const limit = await rateLimit(`analyze:${ip}`, { maxRequests: 15, windowMs: 10 * 60 * 1000 });
    if (!limit.success) {
      return NextResponse.json(
        { error: `Too many requests. Please try again in ${limit.retryAfter} seconds.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const source: "website" | "google-maps" = body.source || "website";

    trackEvent("analysis_started", { source, url: body.url || body.mapsUrl }, {
      userId: user.id, ip, userAgent: req.headers.get("user-agent") || undefined,
    });

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
          await withTimeout("ai-analysis", AI_BUDGET_MS, () =>
            analyzeGooglePlaceData(placeData)
          ));
      } catch (aiErr) {
        console.error("AI analysis error:", aiErr);
        notifyError("AI analysis error (Google Maps)", aiErr);
        return NextResponse.json(
          {
            error:
              aiErr instanceof StageTimeoutError
                ? "The design analysis took too long. Please try again."
                : "AI analysis failed — please check your API key or credits and try again.",
          },
          { status: aiErr instanceof StageTimeoutError ? 504 : 502 }
        );
      }

      // Step 3: Get Google Places photos + Pexels stock images
      const placePhotoUrls = getPlacePhotoUrls(placeData.photos);

      let stockImages = { hero: [] as string[], secondary: [] as string[], atmosphere: [] as string[] };
      if (imageSearchQueries.length > 0) {
        try {
          stockImages = await withTimeout("pexels", IMAGE_BUDGET_MS, () =>
            searchPexelsGrouped(imageSearchQueries)
          );
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

    const timer = new StageTimer();

    // Step 1: Scrape the website
    let scrapedData;
    try {
      scrapedData = await withTimeout("scrape", SCRAPE_BUDGET_MS, () =>
        scrapeWebsite(url)
      );
    } catch (scrapeErr) {
      console.error("Scrape error:", scrapeErr);
      if (scrapeErr instanceof StageTimeoutError) {
        notifyError("Analyze scrape timeout", scrapeErr, { url });
        return NextResponse.json(
          {
            error:
              "That site took too long to load. It may be very slow or blocking automated access — try a different URL.",
          },
          { status: 504 }
        );
      }
      return NextResponse.json(
        {
          error:
            "We couldn't access this website. It may be blocking automated access. Try a different URL.",
        },
        { status: 422 }
      );
    }
    timer.mark("scrape");

    // Step 2: Analyze business content + generate style directions
    let profile, styles, pageStructure, imageSearchQueries, classifiedImages;
    try {
      ({ profile, styles, pageStructure, imageSearchQueries, classifiedImages } =
        await withTimeout("ai-analysis", AI_BUDGET_MS, () =>
          analyzeBusinessContent(url, scrapedData)
        ));
    } catch (aiErr) {
      console.error(`AI analysis error for ${url}:`, aiErr);
      notifyError("AI analysis error", aiErr, { url, timings: timer.summary() });
      return NextResponse.json(
        {
          error:
            aiErr instanceof StageTimeoutError
              ? "The design analysis took too long. Please try again."
              : "AI analysis failed — please check your API key or credits and try again.",
        },
        { status: aiErr instanceof StageTimeoutError ? 504 : 502 }
      );
    }
    timer.mark("ai-analysis");

    // Step 3: Fetch stock images from Pexels using AI-suggested queries
    let stockImages = { hero: [] as string[], secondary: [] as string[], atmosphere: [] as string[] };
    if (imageSearchQueries.length > 0) {
      try {
        stockImages = await withTimeout("pexels", IMAGE_BUDGET_MS, () =>
          searchPexelsGrouped(imageSearchQueries)
        );
      } catch (err) {
        // Stock images are a nice-to-have — never fail the request over them
        console.error("Pexels search error:", err);
        notifyError("Pexels search error", err);
      }
    }
    timer.mark("pexels");

    // Surface slow-but-successful requests: these are the ones that will start
    // 502ing as soon as they cross the proxy's limit.
    if (timer.totalMs > 60_000) {
      console.warn(`[analyze] slow request for ${url}: ${timer.summary()}`);
      notifyError("Analyze slow request", new Error(timer.summary()), { url });
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
