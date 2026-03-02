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
    await page.waitForTimeout(2000);

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
      return imgs
        .filter((img) => {
          const w = img.naturalWidth || img.width;
          const h = img.naturalHeight || img.height;
          return w >= 200 && h >= 150 && img.src.startsWith("http");
        })
        .map((img) => img.src)
        .slice(0, 20);
    });

    const screenshotBuffer = await page.screenshot({
      fullPage: true,
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
