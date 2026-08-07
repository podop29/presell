import { chromium, type Browser, type Page } from "playwright";
import type { QAIssue, DomFinding, QAViewport } from "@/types";

export type { DomFinding };

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

/** Claude's image limit is 8000px — clip below it with headroom. */
const MAX_SCREENSHOT_HEIGHT = 7500;

const DESKTOP_VIEWPORT = { width: 1280, height: 720 };
const MOBILE_VIEWPORT = { width: 390, height: 844 };

type Viewport = QAViewport;

/** Shape returned from the in-page audit, before viewport tagging. */
interface RawFinding {
  severity: QAIssue["severity"];
  issueType: string;
  description: string;
  suggestedFix: string;
  evidence: string;
}

export interface QACapture {
  desktopScreenshot: string;
  mobileScreenshot: string | null;
  findings: DomFinding[];
}

/**
 * Injected before capture so scroll-reveal animations land on their final
 * state. Without this, below-the-fold sections screenshot at opacity 0 and the
 * vision reviewer reports them as missing content.
 */
const FREEZE_ANIMATIONS_CSS = `
*, *::before, *::after {
  animation-duration: 0.001s !important;
  animation-delay: 0s !important;
  transition-duration: 0.001s !important;
  transition-delay: 0s !important;
}
`;

/**
 * Scroll the full page to trigger IntersectionObserver-driven reveals, then
 * return to the top. CSS alone can't fire a JS observer.
 */
async function settlePage(page: Page): Promise<void> {
  await page.addStyleTag({ content: FREEZE_ANIMATIONS_CSS });
  await page.evaluate(async () => {
    const step = Math.max(200, window.innerHeight);
    const max = document.documentElement.scrollHeight;
    for (let y = 0; y < max; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 100));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 150));
  });
  await page.waitForTimeout(300);
}

/**
 * Measure defects the browser can determine exactly: overflow, broken images,
 * collapsed sections, and text contrast. These are checks a vision model is
 * unreliable at, and they cost nothing beyond the render we already do.
 *
 * Deliberately conservative — a false positive here feeds a bad fix into the
 * HTML, which is worse than missing a marginal issue.
 */
async function auditDom(page: Page): Promise<RawFinding[]> {
  return page.evaluate(() => {
    const out: Array<{
      severity: "critical" | "major" | "minor";
      issueType: string;
      description: string;
      suggestedFix: string;
      evidence: string;
    }> = [];

    const openingTag = (el: Element): string => {
      const html = el.outerHTML;
      const end = html.indexOf(">");
      const tag = end === -1 ? html.slice(0, 200) : html.slice(0, end + 1);
      return tag.length > 300 ? `${tag.slice(0, 300)}…` : tag;
    };

    const isVisible = (el: Element): boolean => {
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return false;
      if (parseFloat(style.opacity) < 0.05) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };

    // ── 1. Horizontal overflow ──
    const docWidth = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth > docWidth + 2) {
      // Report the innermost offenders — an ancestor is only wide because of
      // them, and the leaf element is what a fix needs to target.
      const overflowing = Array.from(document.body.querySelectorAll("*")).filter(
        (el) => isVisible(el) && el.getBoundingClientRect().right > docWidth + 2
      );
      const culprits = overflowing
        .filter((el) => !overflowing.some((other) => other !== el && el.contains(other)))
        .slice(0, 3);
      if (culprits.length === 0) {
        out.push({
          severity: "critical",
          issueType: "overflow",
          description: `Page scrolls horizontally: content is ${document.documentElement.scrollWidth}px wide in a ${docWidth}px viewport.`,
          suggestedFix:
            "Add overflow-x-hidden to the body wrapper and constrain the offending element with max-w-full.",
          evidence: "<body>",
        });
      } else {
        for (const el of culprits) {
          out.push({
            severity: "critical",
            issueType: "overflow",
            description: `Element extends ${Math.round(
              el.getBoundingClientRect().right - docWidth
            )}px past the right edge of the ${docWidth}px viewport, causing horizontal scroll.`,
            suggestedFix:
              "Constrain this element with max-w-full / w-full and remove fixed widths or negative margins that exceed the viewport.",
            evidence: openingTag(el),
          });
        }
      }
    }

    // ── 2. Broken images ──
    for (const img of Array.from(document.images)) {
      if (img.complete && img.naturalWidth === 0) {
        out.push({
          severity: "major",
          issueType: "broken-image",
          description: `Image failed to load: ${img.getAttribute("src") || "(no src)"}`,
          suggestedFix:
            "Replace the src with a working image URL, or remove the element if the image is decorative.",
          evidence: openingTag(img),
        });
      }
    }

    // ── 3. Collapsed / empty top-level sections ──
    const sections = Array.from(
      document.body.querySelectorAll("section, header, footer, main > div")
    );
    for (const el of sections) {
      const style = getComputedStyle(el);
      if (style.display === "none") continue;
      const rect = el.getBoundingClientRect();
      const text = (el.textContent || "").trim();
      const hasMedia = el.querySelector("img, svg, video, canvas, iframe");
      if (rect.height < 40 && !hasMedia && text.length === 0) {
        out.push({
          severity: "major",
          issueType: "missing-content",
          description: `Section renders empty (${Math.round(
            rect.height
          )}px tall, no text or media).`,
          suggestedFix:
            "Populate this section with real content, or remove it from the page.",
          evidence: openingTag(el),
        });
      }
    }

    // ── 4. Text contrast ──
    const parseColor = (
      value: string
    ): { r: number; g: number; b: number; a: number } | null => {
      const m = value.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const parts = m[1].split(",").map((s) => parseFloat(s.trim()));
      if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return null;
      return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
    };

    const luminance = (c: { r: number; g: number; b: number }): number => {
      const channel = (v: number) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
    };

    const ratio = (
      a: { r: number; g: number; b: number },
      b: { r: number; g: number; b: number }
    ): number => {
      const l1 = luminance(a);
      const l2 = luminance(b);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    };

    /**
     * Walk ancestors for the first opaque background. Returns null when the
     * answer is genuinely unknowable from computed styles (background image,
     * gradient, or a transparent chain) so we don't guess.
     */
    const effectiveBackground = (
      el: Element
    ): { r: number; g: number; b: number } | null => {
      let node: Element | null = el;
      while (node && node !== document.documentElement) {
        const style = getComputedStyle(node);
        if (style.backgroundImage && style.backgroundImage !== "none") return null;
        const bg = parseColor(style.backgroundColor);
        if (bg && bg.a >= 0.9) return bg;
        if (bg && bg.a > 0.05) return null; // semi-transparent overlay — can't be sure
        node = node.parentElement;
      }
      const rootBg = parseColor(getComputedStyle(document.body).backgroundColor);
      if (rootBg && rootBg.a >= 0.9) return rootBg;
      return { r: 255, g: 255, b: 255 };
    };

    let checked = 0;
    for (const el of Array.from(document.body.querySelectorAll("*"))) {
      if (checked >= 400) break;
      if (out.filter((f) => f.issueType === "contrast").length >= 6) break;

      // Only elements holding their own text
      const ownText = Array.from(el.childNodes)
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => (n.textContent || "").trim())
        .join(" ")
        .trim();
      if (ownText.length < 3) continue;
      if (!isVisible(el)) continue;

      const style = getComputedStyle(el);
      const fg = parseColor(style.color);
      if (!fg || fg.a < 0.5) continue;

      const bg = effectiveBackground(el);
      if (!bg) continue;

      checked++;
      const contrast = ratio(fg, bg);
      const fontSize = parseFloat(style.fontSize) || 16;
      const isLarge = fontSize >= 24 || (fontSize >= 18.66 && parseInt(style.fontWeight) >= 700);
      const threshold = isLarge ? 3 : 4.5;

      if (contrast < 1.6) {
        out.push({
          severity: "critical",
          issueType: "contrast",
          description: `Text is effectively invisible — contrast ratio ${contrast.toFixed(
            2
          )}:1 between text ${style.color} and background rgb(${bg.r}, ${bg.g}, ${
            bg.b
          }). Text reads: "${ownText.slice(0, 60)}"`,
          suggestedFix: `Change the text color class on this element so it contrasts with its background (dark text on light backgrounds, light text on dark).`,
          evidence: openingTag(el),
        });
      } else if (contrast < threshold) {
        out.push({
          severity: "major",
          issueType: "contrast",
          description: `Low contrast ${contrast.toFixed(
            2
          )}:1 (needs ${threshold}:1) for ${Math.round(
            fontSize
          )}px text. Text reads: "${ownText.slice(0, 60)}"`,
          suggestedFix:
            "Darken or lighten the text color class until it meets WCAG AA against its background.",
          evidence: openingTag(el),
        });
      }
    }

    // ── 5. Implausibly short page ──
    const pageHeight = document.documentElement.scrollHeight;
    if (pageHeight < 1200) {
      out.push({
        severity: "critical",
        issueType: "missing-content",
        description: `Entire page is only ${pageHeight}px tall — sections are likely missing or collapsed.`,
        suggestedFix:
          "Verify every planned section is present and rendering with content.",
        evidence: "<body>",
      });
    }

    return out;
  });
}

/** Render HTML in one viewport, settle it, then screenshot and audit. */
async function renderAndAudit(
  html: string,
  viewport: Viewport,
  withScreenshot: boolean
): Promise<{ screenshot: string | null; findings: DomFinding[] }> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: viewport === "desktop" ? DESKTOP_VIEWPORT : MOBILE_VIEWPORT,
    deviceScaleFactor: 1,
    isMobile: viewport === "mobile",
    hasTouch: viewport === "mobile",
  });
  const page = await context.newPage();

  const consoleErrors: string[] = [];
  page.on("pageerror", (err) => consoleErrors.push(err.message));

  try {
    // External resources (Google Fonts, Tailwind CDN, Pexels) use absolute URLs
    // and load normally.
    await page.setContent(html, { waitUntil: "networkidle", timeout: 30000 });
    // Brief wait for Tailwind JIT processing after network settles
    await page.waitForTimeout(1000);
    await settlePage(page);

    const raw = await auditDom(page);
    const findings: DomFinding[] = raw.map((f) => ({
      ...f,
      issueType: f.issueType as QAIssue["issueType"],
      viewport,
    }));

    if (consoleErrors.length > 0) {
      findings.push({
        severity: "major",
        issueType: "layout",
        viewport,
        description: `Page threw ${consoleErrors.length} JavaScript error(s): ${consoleErrors
          .slice(0, 2)
          .join("; ")
          .slice(0, 300)}`,
        suggestedFix:
          "Fix or remove the failing inline script — JS errors commonly leave scroll-reveal content permanently hidden.",
        evidence: "<script>",
      });
    }

    let screenshot: string | null = null;
    if (withScreenshot) {
      const fullHeight = await page.evaluate(
        () => document.documentElement.scrollHeight
      );
      const width = viewport === "desktop" ? DESKTOP_VIEWPORT.width : MOBILE_VIEWPORT.width;
      const buffer = await page.screenshot({
        clip: {
          x: 0,
          y: 0,
          width,
          height: Math.min(fullHeight, MAX_SCREENSHOT_HEIGHT),
        },
        type: "png",
      });
      screenshot = buffer.toString("base64");
    }

    return { screenshot, findings };
  } finally {
    await context.close();
  }
}

/**
 * Contrast, broken images, and empty sections are viewport-independent, so both
 * renders report them. Collapse duplicates by element and defect type — feeding
 * the same issue to the fix pass twice invites duplicate or conflicting edits.
 */
function dedupeFindings(findings: DomFinding[]): DomFinding[] {
  const rank = { critical: 3, major: 2, minor: 1 } as const;
  const byKey = new Map<string, DomFinding>();

  for (const f of findings) {
    const key = `${f.issueType}::${f.evidence}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, f);
      continue;
    }
    // Keep the more severe report; note that it reproduces on both sizes.
    const winner = rank[f.severity] > rank[existing.severity] ? f : existing;
    byKey.set(key, { ...winner, viewport: winner.viewport });
  }

  return Array.from(byKey.values());
}

/**
 * Render generated HTML at desktop and mobile, capture screenshots for the
 * vision reviewer, and run deterministic DOM checks at both sizes.
 */
export async function captureAndAudit(html: string): Promise<QACapture> {
  const desktop = await renderAndAudit(html, "desktop", true);

  let mobile: { screenshot: string | null; findings: DomFinding[] } = {
    screenshot: null,
    findings: [],
  };
  try {
    mobile = await renderAndAudit(html, "mobile", true);
  } catch (err) {
    // A mobile failure shouldn't sink the whole QA pass
    console.error("[qa] mobile capture failed:", err);
  }

  return {
    desktopScreenshot: desktop.screenshot!,
    mobileScreenshot: mobile.screenshot,
    findings: dedupeFindings([...desktop.findings, ...mobile.findings]),
  };
}

/**
 * Deterministic checks only, no screenshots — used to verify a fix pass didn't
 * make things worse. Costs a render, no AI tokens.
 */
export async function auditOnly(html: string): Promise<DomFinding[]> {
  const desktop = await renderAndAudit(html, "desktop", false);
  let mobileFindings: DomFinding[] = [];
  try {
    const mobile = await renderAndAudit(html, "mobile", false);
    mobileFindings = mobile.findings;
  } catch (err) {
    console.error("[qa] mobile re-audit failed:", err);
  }
  return dedupeFindings([...desktop.findings, ...mobileFindings]);
}

/** Backwards-compatible single desktop screenshot. */
export async function screenshotHtml(html: string): Promise<string> {
  const { screenshot } = await renderAndAudit(html, "desktop", true);
  return screenshot!;
}
