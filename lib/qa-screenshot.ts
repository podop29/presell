import { chromium, type Browser } from "playwright";

let _browser: Browser | null = null;

/** Reuse a single browser instance across QA screenshots to avoid cold-start overhead. */
async function getBrowser(): Promise<Browser> {
  if (_browser && _browser.isConnected()) return _browser;
  _browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  return _browser;
}

/**
 * Render generated HTML in a headless browser and capture a full-page screenshot.
 * Used by the QA loop to visually verify generated sites.
 * Returns a base64-encoded PNG string.
 */
export async function screenshotHtml(html: string): Promise<string> {
  const browser = await getBrowser();
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  try {
    // Render HTML directly — external resources (Google Fonts, Tailwind CDN, Pexels images)
    // load normally since they use absolute URLs
    await page.setContent(html, { waitUntil: "networkidle", timeout: 30000 });

    // Brief wait for Tailwind JIT processing after network settles
    await page.waitForTimeout(1000);

    // Clip to same height limit as scraper (Claude's 8000px image limit)
    const fullHeight = await page.evaluate(
      () => document.documentElement.scrollHeight
    );
    const clipHeight = Math.min(fullHeight, 7500);

    const screenshotBuffer = await page.screenshot({
      clip: { x: 0, y: 0, width: 1280, height: clipHeight },
      type: "png",
    });

    return screenshotBuffer.toString("base64");
  } finally {
    await context.close();
  }
}
