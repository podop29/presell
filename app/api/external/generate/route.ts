import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { scrapeWebsite } from "@/lib/scraper";
import {
  analyzeBusinessContent,
  analyzeGooglePlaceData,
  generateVariation,
  generateColdEmail,
} from "@/lib/ai";
import { searchPexelsGrouped } from "@/lib/pexels";
import {
  extractPlaceId,
  fetchPlaceDetails,
  getPlacePhotoUrls,
} from "@/lib/google-places";
import { validateExternalUrl } from "@/lib/validate-url";
import { notifyError, notifySuccess } from "@/lib/discord";
import type { StockImages } from "@/types";

export const maxDuration = 300;

function validateApiKey(req: NextRequest): boolean {
  const key = req.headers.get("x-api-key");
  return !!key && key === process.env.EXTERNAL_API_KEY;
}

export async function POST(req: NextRequest) {
  if (!validateApiKey(req)) {
    return NextResponse.json({ error: "Invalid API key." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { url, devName, devEmail, devMessage, customInstructions } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required." }, { status: 400 });
    }
    if (!devName || !devEmail) {
      return NextResponse.json(
        { error: "devName and devEmail are required." },
        { status: 400 }
      );
    }

    const urlCheck = validateExternalUrl(url);
    if (!urlCheck.valid) {
      return NextResponse.json({ error: urlCheck.reason }, { status: 400 });
    }

    // Detect if this is a Google Maps URL
    const mapsPattern =
      /google\.com\/maps|maps\.google\.|maps\.app\.goo\.gl|goo\.gl\/maps/i;
    const isGoogleMaps = mapsPattern.test(url);

    // --- Step 1: Analyze ---
    let profile, styles, pageStructure, imageUrls: string[], classifiedImages;
    let stockImages: StockImages = { hero: [], secondary: [], atmosphere: [] };
    let pageContent: string;

    if (isGoogleMaps) {
      // Google Maps flow
      let placeData;
      try {
        const placeId = await extractPlaceId(url);
        placeData = await fetchPlaceDetails(placeId);
      } catch (placeErr) {
        console.error("Google Places error:", placeErr);
        notifyError("External API: Google Places error", placeErr, { url });
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

      let imageSearchQueries: string[];
      try {
        ({ profile, styles, pageStructure, imageSearchQueries, classifiedImages } =
          await analyzeGooglePlaceData(placeData));
      } catch (aiErr) {
        console.error("AI analysis error:", aiErr);
        notifyError("External API: AI analysis error", aiErr);
        return NextResponse.json(
          { error: "AI analysis failed." },
          { status: 502 }
        );
      }

      imageUrls = getPlacePhotoUrls(placeData.photos);

      if (imageSearchQueries.length > 0) {
        try {
          stockImages = await searchPexelsGrouped(imageSearchQueries);
        } catch (err) {
          console.error("Pexels search error:", err);
        }
      }

      const reviewContent = placeData.reviews
        .map((r: { text: string; author_name: string; rating: number }) =>
          `"${r.text}" — ${r.author_name} (${r.rating}/5)`
        )
        .join("\n\n");
      const hoursContent = placeData.opening_hours?.weekday_text?.join("\n") || "";
      const summaryContent = placeData.editorial_summary?.overview || "";
      pageContent = [
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
    } else {
      // Website flow
      let scrapedData;
      try {
        scrapedData = await scrapeWebsite(url);
      } catch (scrapeErr) {
        console.error("Scrape error:", scrapeErr);
        return NextResponse.json(
          {
            error:
              "Couldn't access this website. It may be blocking automated access.",
          },
          { status: 422 }
        );
      }

      let imageSearchQueries: string[];
      try {
        ({ profile, styles, pageStructure, imageSearchQueries, classifiedImages } =
          await analyzeBusinessContent(url, scrapedData));
      } catch (aiErr) {
        console.error("AI analysis error:", aiErr);
        notifyError("External API: AI analysis error", aiErr, { url });
        return NextResponse.json(
          { error: "AI analysis failed." },
          { status: 502 }
        );
      }

      imageUrls = scrapedData.imageUrls;

      if (imageSearchQueries.length > 0) {
        try {
          stockImages = await searchPexelsGrouped(imageSearchQueries);
        } catch (err) {
          console.error("Pexels search error:", err);
        }
      }

      pageContent = scrapedData.content.slice(0, 5000);
    }

    // --- Step 2: Pick first style (or let caller choose by index) ---
    const styleIndex = body.styleIndex ?? 0;
    const selectedStyle = styles[Math.min(styleIndex, styles.length - 1)];

    // --- Step 3: Generate HTML ---
    const stockImageUrls = [
      ...stockImages.hero,
      ...stockImages.secondary,
      ...stockImages.atmosphere,
    ];

    let html: string;
    try {
      html = await generateVariation(
        profile,
        imageUrls,
        stockImageUrls,
        selectedStyle,
        pageStructure,
        pageContent,
        customInstructions,
        classifiedImages,
        stockImages
      );
    } catch (aiErr) {
      console.error("AI generation error:", aiErr);
      notifyError("External API: AI generation error", aiErr, { url });
      return NextResponse.json(
        { error: "Redesign generation failed." },
        { status: 502 }
      );
    }

    // --- Step 4: Save to DB ---
    const slug = nanoid(8);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const previewBaseUrl = process.env.NEXT_PUBLIC_PREVIEW_URL || baseUrl;
    const previewUrl = `${previewBaseUrl}/preview/${slug}`;

    // Generate cold email
    let coldEmail = { subject: "", body: "" };
    try {
      coldEmail = await generateColdEmail(profile, previewUrl, devName, isGoogleMaps);
    } catch (emailErr) {
      console.error("Cold email generation error:", emailErr);
    }

    const { error: dbError } = await supabase.from("previews").insert({
      slug,
      original_url: url,
      redesign_html: html,
      dev_name: devName,
      dev_email: devEmail,
      dev_message: devMessage || null,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      variation_a_style: selectedStyle.styleName,
      cold_email_subject: coldEmail.subject || null,
      cold_email_body: coldEmail.body || null,
      business_name: profile.businessName || null,
      profile_json: JSON.stringify(profile),
      page_content: pageContent || null,
    });

    if (dbError) {
      console.error("DB insert error:", dbError.message);
      notifyError("External API: DB insert error", new Error(dbError.message));
      return NextResponse.json(
        { error: "Failed to save preview." },
        { status: 500 }
      );
    }

    notifySuccess("External API: Preview generated", {
      url,
      slug,
      email: devEmail,
      previewUrl,
    });

    return NextResponse.json({
      slug,
      previewUrl,
      businessName: profile.businessName,
      styleName: selectedStyle.styleName,
      coldEmail,
    });
  } catch (err) {
    console.error("External generate error:", err);
    notifyError("External API: unexpected error", err);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
