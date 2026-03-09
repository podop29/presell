import { chromium } from "playwright";
import type { ScrapedData } from "@/types";

export async function scrapeWebsite(url: string): Promise<ScrapedData> {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  try {
    // Use domcontentloaded — networkidle can hang on sites with long-polling/websockets
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    // Give the page a moment to render dynamic content
    await page.waitForTimeout(3000);

    // Detect bot-challenge pages (Cloudflare, wp.com, etc.) and wait for them to clear
    const bodyText = await page.evaluate(() => document.body.innerText || "");
    const isChallenged =
      bodyText.length < 200 &&
      /checking your browser|just a moment|verify you are human|security check/i.test(bodyText);
    if (isChallenged) {
      await page.waitForTimeout(7000);
    }

    const title = await page.title();

    const description = await page
      .$eval('meta[name="description"]', (el) =>
        el.getAttribute("content") || ""
      )
      .catch(() => "");

    const content = await page.evaluate(() => {
      const body = document.body;
      const scripts = body.querySelectorAll("script, style, noscript");
      scripts.forEach((s) => s.remove());
      return (body.innerText || "").replace(/\s+/g, " ").trim();
    });

    const imageUrls = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll("img"));
      const seen = new Set<string>();
      const results: string[] = [];
      for (const img of imgs) {
        const src = img.src || img.getAttribute("data-src") || "";
        if (!src.startsWith("http") || seen.has(src)) continue;
        // Skip tiny icons, gravatars, and tracking pixels
        if (/gravatar\.com|pixel\.wp\.com|\/emoji\/|twemoji/i.test(src)) continue;
        const w = img.naturalWidth || img.width || parseInt(img.getAttribute("width") || "0");
        const h = img.naturalHeight || img.height || parseInt(img.getAttribute("height") || "0");
        // Accept images that are large enough OR where dimensions are unknown (lazy-loaded)
        const knownLarge = w >= 200 && h >= 100;
        const unknownSize = w === 0 && h === 0;
        if (knownLarge || unknownSize) {
          seen.add(src);
          results.push(src);
        }
      }
      return results.slice(0, 20).map(u => {
        if (u.startsWith("http://")) {
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
          return `${baseUrl}/api/proxy-image?url=${encodeURIComponent(u)}`;
        }
        return u;
      });
    });

    // Clip screenshot height to avoid exceeding Claude's 8000px image limit
    const viewportSize = page.viewportSize() || { width: 1280, height: 720 };
    const fullHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const clipHeight = Math.min(fullHeight, 7500);

    const screenshotBuffer = await page.screenshot({
      clip: { x: 0, y: 0, width: viewportSize.width, height: clipHeight },
      type: "png",
    });
    const screenshot = screenshotBuffer.toString("base64");

    return {
      title: title || "Untitled",
      description,
      content: content.slice(0, 5000),
      imageUrls,
      screenshot,
    };
  } finally {
    await browser.close();
  }
}
