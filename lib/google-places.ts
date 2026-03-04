export interface GoogleReview {
  author_name: string;
  rating: number;
  text: string;
  relative_time_description: string;
}

export interface GooglePlaceData {
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  website?: string;
  types: string[];
  photos: { photo_reference: string; width: number; height: number }[];
  reviews: GoogleReview[];
  opening_hours?: {
    weekday_text: string[];
    open_now?: boolean;
  };
  editorial_summary?: { overview: string };
  place_id: string;
}

const API_KEY = process.env.GOOGLE_PLACES_API_KEY!;

/**
 * Extract a place_id from a Google Maps URL.
 * Handles short URLs (maps.app.goo.gl/..., goo.gl/maps/...) by following redirects,
 * then uses Places Text Search with the business name from the URL path.
 */
export async function extractPlaceId(mapsUrl: string): Promise<string> {
  let resolvedUrl = mapsUrl;

  // Follow redirects for short URLs
  if (
    resolvedUrl.includes("goo.gl/maps") ||
    resolvedUrl.includes("maps.app.goo.gl")
  ) {
    const res = await fetch(resolvedUrl, { redirect: "follow" });
    resolvedUrl = res.url;
  }

  // Try to extract place_id directly from URL params (e.g. ?place_id=... or /place/...)
  const urlObj = new URL(resolvedUrl);
  const placeIdParam = urlObj.searchParams.get("place_id");
  if (placeIdParam) return placeIdParam;

  // Try ftid parameter (used in some Maps URLs)
  // Format: 0x...:0x... — we need to use findplacefromtext instead

  // Extract search query from the URL path
  // Common patterns:
  //   /maps/place/Business+Name/...
  //   /maps/search/Business+Name/...
  //   /maps?q=Business+Name
  let query = "";

  const qParam = urlObj.searchParams.get("q");
  if (qParam) {
    query = qParam;
  }

  if (!query) {
    const placeMatch = resolvedUrl.match(/\/place\/([^/@]+)/);
    if (placeMatch) {
      query = decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
    }
  }

  if (!query) {
    const searchMatch = resolvedUrl.match(/\/search\/([^/@]+)/);
    if (searchMatch) {
      query = decodeURIComponent(searchMatch[1].replace(/\+/g, " "));
    }
  }

  if (!query) {
    throw new Error(
      "Could not extract a business name from this Google Maps URL. Please try a different link."
    );
  }

  // Use Text Search to find the place_id
  const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${API_KEY}`;
  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json();

  if (
    searchData.status !== "OK" ||
    !searchData.results ||
    searchData.results.length === 0
  ) {
    throw new Error(
      "Could not find this business on Google Maps. Please verify the link and try again."
    );
  }

  return searchData.results[0].place_id;
}

/**
 * Fetch full place details from the Places API.
 */
export async function fetchPlaceDetails(
  placeId: string
): Promise<GooglePlaceData> {
  const fields = [
    "name",
    "formatted_address",
    "formatted_phone_number",
    "website",
    "types",
    "photos",
    "reviews",
    "opening_hours",
    "editorial_summary",
    "place_id",
  ].join(",");

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== "OK" || !data.result) {
    throw new Error("Failed to fetch business details from Google Maps.");
  }

  const r = data.result;
  return {
    name: r.name || "Unknown Business",
    formatted_address: r.formatted_address || "",
    formatted_phone_number: r.formatted_phone_number,
    website: r.website,
    types: r.types || [],
    photos: (r.photos || []).map(
      (p: { photo_reference: string; width: number; height: number }) => ({
        photo_reference: p.photo_reference,
        width: p.width,
        height: p.height,
      })
    ),
    reviews: (r.reviews || []).map(
      (rev: {
        author_name: string;
        rating: number;
        text: string;
        relative_time_description: string;
      }) => ({
        author_name: rev.author_name,
        rating: rev.rating,
        text: rev.text,
        relative_time_description: rev.relative_time_description,
      })
    ),
    opening_hours: r.opening_hours
      ? {
          weekday_text: r.opening_hours.weekday_text || [],
          open_now: r.opening_hours.open_now,
        }
      : undefined,
    editorial_summary: r.editorial_summary,
    place_id: r.place_id || placeId,
  };
}

/**
 * Convert photo references to proxied Google Places photo URLs.
 */
export function getPlacePhotoUrls(
  photos: { photo_reference: string }[],
  max: number = 8
): string[] {
  return photos.slice(0, max).map(
    (p) =>
      `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photo_reference=${p.photo_reference}&key=${API_KEY}`
  );
}
