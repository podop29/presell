import * as cheerio from "cheerio";
import type { ScrapedData } from "@/types";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
];

export async function scrapeWebsite(url: string): Promise<ScrapedData> {
  const html = await fetchWithRetry(url);
  const $ = cheerio.load(html);

  // Remove non-content elements
  $("script, style, noscript, svg, iframe").remove();

  const title = $("title").text().trim() || "Untitled";

  const description =
    $('meta[name="description"]').attr("content")?.trim() || "";

  const content = ($("body").text() || "").replace(/\s+/g, " ").trim();

  // Extract image URLs with same filtering as before
  const seen = new Set<string>();
  const imageUrls: string[] = [];
  $("img").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src") || "";
    if (!src.startsWith("http") || seen.has(src)) return;
    if (/gravatar\.com|pixel\.wp\.com|\/emoji\/|twemoji/i.test(src)) return;
    const w = parseInt($(el).attr("width") || "0");
    const h = parseInt($(el).attr("height") || "0");
    const knownLarge = w >= 200 && h >= 100;
    const unknownSize = w === 0 && h === 0;
    if (knownLarge || unknownSize) {
      seen.add(src);
      imageUrls.push(src);
    }
  });

  // Best-effort screenshot via thum.io (free, no API key needed)
  let screenshot = "";
  try {
    const thumbUrl = `https://image.thum.io/get/width/1280/crop/960/noanimate/${url}`;
    const res = await fetch(thumbUrl, { signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      screenshot = buf.toString("base64");
    }
  } catch {
    // Screenshot is optional — AI handles missing screenshots
  }

  return {
    title,
    description,
    content: content.slice(0, 5000),
    imageUrls: imageUrls.slice(0, 20),
    screenshot,
  };
}

async function fetchWithRetry(url: string): Promise<string> {
  for (let i = 0; i < USER_AGENTS.length; i++) {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENTS[i],
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) {
      return await res.text();
    }
    // If last attempt also failed, throw
    if (i === USER_AGENTS.length - 1) {
      throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
    }
  }
  throw new Error(`Failed to fetch ${url}`);
}
