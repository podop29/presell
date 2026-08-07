import Anthropic from "@anthropic-ai/sdk";
import type {
  ScrapedData,
  BusinessProfile,
  StyleSuggestion,
  ClassifiedImage,
  AnalysisResult,
  StockImages,
  DesignBlueprint,
  SectionBlueprint,
  QAIssue,
  QAResult,
  DomFinding,
} from "@/types";
import type { GooglePlaceData } from "@/lib/google-places";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const DEFAULT_PROFILE: BusinessProfile = {
  businessName: "This Business",
  businessType: "local",
  industry: "General",
  whatTheyDo: "Provides products and services to customers",
  targetCustomer: "General public",
  keySellingPoints: ["Quality service", "Experienced team", "Customer focused"],
  brandTone: "professional",
  primaryColors: "unknown",
  location: "unknown",
};

const DEFAULT_STYLES: StyleSuggestion[] = [
  {
    styleName: "Refined & Editorial",
    styleBrief:
      "Sophisticated editorial layout with Playfair Display for headlines and Source Sans 3 for body. Color palette: #1a1a2e deep navy with #e8d5b7 warm gold accents. Asymmetric hero with oversized typography, magazine-style section layouts, generous whitespace, subtle grain texture on light sections, elegant card borders, and muted hover transitions. Channel the refined aesthetic of a high-end architecture portfolio.",
  },
];

const DEFAULT_PAGE_STRUCTURE = [
  "Navigation bar with logo and links",
  "Hero section with headline and call-to-action",
  "Services or features section",
  "About section",
  "Testimonials section",
  "Contact section",
  "Footer",
];

// Pass 1 — Business Analysis + Style Generation + Page Structure + Image Classification
export async function analyzeBusinessContent(
  url: string,
  data: ScrapedData
): Promise<AnalysisResult> {
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: `You are an elite brand strategist and creative director who creates distinctive, context-specific design directions. You avoid generic AI aesthetics and cookie-cutter suggestions. Every style you propose must feel intentionally crafted for the specific business.

You always respond with valid JSON only — no explanation, no markdown, no code fences.`,
      messages: [
        {
          role: "user",
          content: [
            ...(data.screenshot
              ? [
                  {
                    type: "image" as const,
                    source: {
                      type: "base64" as const,
                      media_type: "image/png" as const,
                      data: data.screenshot,
                    },
                  },
                ]
              : []),
            {
              type: "text" as const,
              text: `Analyze this website (and the screenshot above if provided) and return a JSON object with five top-level keys: "profile", "styles", "pageStructure", "imageSearchQueries", and "classifiedImages".

"profile" must have exactly these fields:
{
  "businessName": "string",
  "businessType": "string ('local' for physical/location-based businesses like restaurants, salons, contractors, clinics, retail stores — or 'digital' for SaaS, software products, digital agencies, online platforms, dev tools, portfolios, apps)",
  "industry": "string",
  "whatTheyDo": "string (one clear sentence)",
  "targetCustomer": "string",
  "keySellingPoints": ["string"] (3-5 points),
  "brandTone": "string (e.g. 'professional and trustworthy' or 'fun and casual')",
  "primaryColors": "string (list the specific hex codes of the site's dominant brand colors visible in the screenshot, e.g. '#2b5797 blue, #ff6600 orange'. Say 'unknown' only if truly unclear)",
  "location": "string (city/region if mentioned, or 'unknown')"
}

"pageStructure" must be an array of strings describing the sections that exist on the original website, in order. Look at the actual page content and identify what sections the site has. Examples:
- A restaurant might have: ["Navigation with logo", "Hero with restaurant name and tagline", "Menu highlights section with food categories", "Photo gallery of dishes", "About the chef / our story", "Customer reviews", "Hours and location with map", "Reservation CTA", "Footer with social links"]
- A law firm might have: ["Navigation with firm name", "Hero with firm tagline", "Practice areas grid", "Attorney profiles", "Case results / track record", "Client testimonials", "Contact form with office address", "Footer"]
- A plumber might have: ["Navigation with phone number", "Hero with emergency CTA", "Services list", "Service area map", "Before/after gallery", "Reviews from Google", "Pricing or free estimate CTA", "Footer with license number"]
- A SaaS product might have: ["Navigation with logo and sign-up CTA", "Hero with product headline, subheadline, and demo CTA", "Social proof logos bar", "Features grid with icons", "How it works / workflow section", "Pricing table with tiers", "Testimonials from companies", "FAQ accordion", "Final CTA section", "Footer with product links"]
- A web agency might have: ["Navigation with logo and contact CTA", "Hero with agency tagline and portfolio CTA", "Selected work / case studies grid", "Services overview", "Process / how we work", "Team section", "Client logos", "Contact form", "Footer"]

Be specific about what content each section contains — don't just say "Hero section", say "Hero with bakery name, 'Fresh baked daily' tagline, and order online button". Include 6-10 sections.

"imageSearchQueries" must be an array of exactly 3 strings — search queries to find high-quality stock photos that would look great on this business's redesigned website. Be specific and descriptive:
- Query 1 (HERO IMAGE — most important): A dramatic, wide-angle photo that works as a full-width hero background. Think cinematic and atmospheric. Be SPECIFIC to the business type but focus on the ENVIRONMENT or ACTIVITY, not generic concepts. Examples: "professional barber cutting hair in modern barbershop" not "barbershop", "chef plating food in restaurant kitchen warm lighting" not "restaurant food", "aerial view modern dental office clean bright". Include lighting/mood keywords like "warm lighting", "bright natural light", "dramatic", "professional photography".
- Query 2: A secondary/lifestyle image showing the business's work or customers (e.g. "relaxed woman enjoying facial treatment spa" or "happy family receiving car keys dealership")
- Query 3: A background/atmosphere image for secondary sections (e.g. "zen spa stones candles peaceful" or "clean modern office workspace minimal")
Tailor these to the specific business and industry. Use descriptive keywords that will return professional, high-quality photos.
For digital/SaaS businesses: focus on abstract tech imagery, workspace environments, or conceptual photos. Examples: "minimal workspace laptop clean desk natural light", "abstract gradient mesh colorful background", "team collaborating modern office whiteboard". Do NOT search for physical storefronts or location-based imagery.

"classifiedImages" must be an array of objects classifying the images found on the original website. For each image URL listed below, determine its role on the page using the screenshot for visual context and the URL for hints. Each object has:
{
  "url": "string (the exact image URL from the list below)",
  "category": "string (one of: logo, hero-worthy, product, team, storefront, gallery, decorative, skip)",
  "description": "string (brief 3-8 word description, e.g. 'company logo white background', 'chocolate cake close-up', 'storefront exterior sunny day')"
}

Category definitions:
- "logo": The business logo or brand mark
- "hero-worthy": Large, high-quality image suitable as a full-width hero background (wide aspect ratio, professional quality, relevant to business)
- "product": Product photos, menu items, work samples, portfolio pieces
- "team": Photos of people — staff, owners, team members
- "storefront": Exterior or interior shots of the physical business location
- "screenshot": Product screenshots, dashboard UIs, app interfaces, software demos
- "gallery": Other decent-quality images worth showing in a gallery or content section
- "decorative": Small decorative elements, icons, badges, pattern images
- "skip": Low-quality, broken-looking, tiny icons, social media badges, tracking pixels, or irrelevant images not worth using

IMAGE URLS TO CLASSIFY:
${data.imageUrls.length > 0 ? data.imageUrls.slice(0, 20).join("\n") : "(no images found)"}

Classify EVERY image URL listed above. Be strict with "skip" — only quality images that add value should be kept. If the screenshot helps you see what an image actually looks like on the page, use that context.

"styles" must be an array with exactly 1 object — the single best design direction for this business. The object has:
{
  "styleName": "string — a short, catchy name for this design direction (3-5 words, like 'Warm & Inviting' or 'Sleek Tech Forward')",
  "styleBrief": "string — a detailed 150-250 word design brief covering: color palette (specific hex codes), typography (specific Google Font names for display and body), overall mood, hero section approach, card/component style, CTA button style, and what real-world brand or website aesthetic this should channel"
}

STYLE SELECTION STRATEGY — RESPECT THE EXISTING BRAND:
First, assess whether the site has a strong existing brand identity (clear logo, consistent color scheme, recognizable style) or a weak/generic one (default template, no clear colors, no brand personality).

IF THE SITE HAS STRONG BRANDING (clear colors, logo, identity):
- PRESERVE the brand's core color palette. Use the exact hex codes from "primaryColors" and the screenshot. These are the client's colors — do not replace them.
- Create an ELEVATED version of their existing brand — same colors, dramatically better design execution.
- Think of it as the best designer in the world taking their brand guidelines and making the most beautiful version possible.
- Name it something that signals elevation (e.g. "Elevated [Brand]", "Refined [Business Name]").

IF THE SITE HAS WEAK/NO BRANDING (generic template, unclear colors, no identity):
- Create a fresh, distinctive design direction that feels like a natural fit for this specific business and industry.
- Propose colors that are appropriate and compelling for their industry — a law firm gets different colors than a surf shop.
- The style should feel like a cohesive brand proposal crafted specifically for them.

Rules:
- The goal is ELEVATION, not reinvention. The business owner should see their site made beautiful.
- FONT SELECTION IS CRITICAL: choose distinctive, characterful Google Fonts — NEVER suggest Inter, Roboto, Arial, Open Sans, or other overused defaults. Pick fonts with personality: Playfair Display, Fraunces, DM Serif Display, Space Grotesk, Outfit, Sora, Manrope, Cabinet Grotesk, Satoshi, General Sans, Clash Display, etc.
- Reference specific colors (hex codes), specific Google Fonts by name, and specific design techniques
- Describe the atmosphere: what real-world brand or website aesthetic should this channel?
- The brief should be opinionated, vivid, and specific — say "use #1e3a5f navy with #f4a261 warm amber accents, grain-textured cream sections" not "use professional colors"
- ANTI-PATTERNS: Never suggest generic purple-on-white, safe blue corporate palettes, or any design direction that feels like generic AI output

Website Title: ${data.title}
Website URL: ${url}
Meta Description: ${data.description}
Page Content: ${data.content.slice(0, 3000)}`,
            },
          ],
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { profile: DEFAULT_PROFILE, styles: DEFAULT_STYLES, pageStructure: DEFAULT_PAGE_STRUCTURE, imageSearchQueries: [], classifiedImages: [] };
    }

    let jsonStr = textBlock.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonStr);

    const profile: BusinessProfile = {
      businessName: parsed.profile?.businessName || DEFAULT_PROFILE.businessName,
      businessType: parsed.profile?.businessType === "digital" ? "digital" : "local",
      industry: parsed.profile?.industry || DEFAULT_PROFILE.industry,
      whatTheyDo: parsed.profile?.whatTheyDo || DEFAULT_PROFILE.whatTheyDo,
      targetCustomer: parsed.profile?.targetCustomer || DEFAULT_PROFILE.targetCustomer,
      keySellingPoints:
        Array.isArray(parsed.profile?.keySellingPoints) &&
        parsed.profile.keySellingPoints.length > 0
          ? parsed.profile.keySellingPoints
          : DEFAULT_PROFILE.keySellingPoints,
      brandTone: parsed.profile?.brandTone || DEFAULT_PROFILE.brandTone,
      primaryColors: parsed.profile?.primaryColors || DEFAULT_PROFILE.primaryColors,
      location: parsed.profile?.location || DEFAULT_PROFILE.location,
    };

    let styles = DEFAULT_STYLES;
    if (
      Array.isArray(parsed.styles) &&
      parsed.styles.length >= 1 &&
      parsed.styles.every(
        (s: Record<string, unknown>) =>
          typeof s.styleName === "string" && typeof s.styleBrief === "string"
      )
    ) {
      styles = parsed.styles.map((s: Record<string, string>) => ({
        styleName: s.styleName,
        styleBrief: s.styleBrief,
      })) as StyleSuggestion[];
    }

    let pageStructure = DEFAULT_PAGE_STRUCTURE;
    if (
      Array.isArray(parsed.pageStructure) &&
      parsed.pageStructure.length >= 3 &&
      parsed.pageStructure.every((s: unknown) => typeof s === "string")
    ) {
      pageStructure = parsed.pageStructure;
    }

    let imageSearchQueries: string[] = [];
    if (
      Array.isArray(parsed.imageSearchQueries) &&
      parsed.imageSearchQueries.every((s: unknown) => typeof s === "string")
    ) {
      imageSearchQueries = parsed.imageSearchQueries;
    }

    const validCategories = new Set(["logo", "hero-worthy", "product", "team", "storefront", "screenshot", "gallery", "decorative", "skip"]);
    let classifiedImages: ClassifiedImage[] = [];
    if (Array.isArray(parsed.classifiedImages)) {
      classifiedImages = parsed.classifiedImages
        .filter(
          (img: Record<string, unknown>) =>
            typeof img.url === "string" &&
            typeof img.category === "string" &&
            validCategories.has(img.category) &&
            typeof img.description === "string"
        )
        .map((img: Record<string, string>) => ({
          url: img.url,
          category: img.category as ClassifiedImage["category"],
          description: img.description,
        }));
    }

    return { profile, styles, pageStructure, imageSearchQueries, classifiedImages };
  } catch (err) {
    // Let API-level errors (auth, credits, rate limit) propagate
    // so the route can return a proper error to the client
    if (
      err instanceof Anthropic.APIError ||
      err instanceof Anthropic.APIConnectionError ||
      err instanceof Anthropic.AuthenticationError ||
      err instanceof Anthropic.RateLimitError
    ) {
      throw err;
    }
    // Parsing/validation errors — fall back to defaults
    return { profile: DEFAULT_PROFILE, styles: DEFAULT_STYLES, pageStructure: DEFAULT_PAGE_STRUCTURE, imageSearchQueries: [], classifiedImages: [] };
  }
}

// Pass 1 (alt) — Business Analysis from Google Places data (no website to scrape)
export async function analyzeGooglePlaceData(
  placeData: GooglePlaceData
): Promise<AnalysisResult> {
  const reviewText = placeData.reviews
    .slice(0, 5)
    .map((r) => `"${r.text}" — ${r.author_name} (${r.rating}/5)`)
    .join("\n");

  const hoursText = placeData.opening_hours?.weekday_text?.join(", ") || "Not available";

  const categoryText = placeData.types
    .filter((t) => !t.startsWith("point_of_interest") && t !== "establishment")
    .map((t) => t.replace(/_/g, " "))
    .join(", ") || "business";

  const summaryText = placeData.editorial_summary?.overview || "";

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: `You are an elite brand strategist and creative director who creates distinctive, context-specific design directions. You avoid generic AI aesthetics and cookie-cutter suggestions. Every style you propose must feel intentionally crafted for the specific business.

You are creating a BRAND NEW website for a business that currently has no website (or a very poor one). You have full creative freedom on colors, fonts, and layout — there is no existing brand to preserve.

You always respond with valid JSON only — no explanation, no markdown, no code fences.`,
      messages: [
        {
          role: "user",
          content: `Analyze this business (sourced from Google Maps) and return a JSON object with four top-level keys: "profile", "styles", "pageStructure", and "imageSearchQueries".

Business Name: ${placeData.name}
Address: ${placeData.formatted_address}
Phone: ${placeData.formatted_phone_number || "Not listed"}
Category: ${categoryText}
Website: ${placeData.website || "None"}
Summary: ${summaryText}

Hours:
${hoursText}

Customer Reviews:
${reviewText || "No reviews available"}

"profile" must have exactly these fields:
{
  "businessName": "string",
  "industry": "string",
  "whatTheyDo": "string (one clear sentence)",
  "targetCustomer": "string",
  "keySellingPoints": ["string"] (3-5 points — infer from reviews and category),
  "brandTone": "string (e.g. 'professional and trustworthy' or 'fun and casual')",
  "primaryColors": "string (suggest a fitting color palette with specific hex codes for this type of business, e.g. '#2b5797 blue, #ff6600 orange')",
  "location": "string"
}

"pageStructure" must be an array of strings describing the ideal sections for a NEW website for this type of business. Think about what sections would be most effective for a ${categoryText} business. Include 6-10 sections, each described specifically:
- Not just "Hero section" but "Hero with business name, tagline about [their specialty], and a call-to-action button"
- Include sections that leverage the available data: reviews, hours, location, phone number
- Example for a restaurant: ["Navigation with restaurant name and phone number", "Hero with restaurant name, cuisine type tagline, and reservation CTA", "Menu highlights with popular dishes", "Photo gallery", "Customer reviews carousel", "Hours and location with embedded map", "Contact section with phone and address", "Footer with social links"]

"imageSearchQueries" must be an array of exactly 3 strings — search queries to find high-quality stock photos for this business's website. Be specific:
- Query 1 (HERO IMAGE — most important): A dramatic, wide-angle photo for a full-width hero background. Be SPECIFIC to the business type, focus on the ENVIRONMENT or ACTIVITY, and include lighting/mood keywords. Examples: "professional barber cutting hair in modern barbershop warm lighting", "chef plating food in restaurant kitchen dramatic", "aerial view modern dental office clean bright".
- Query 2: A secondary/lifestyle image specific to the business type
- Query 3: A background/atmosphere image
Tailor these to the specific business category: ${categoryText}

"styles" must be an array with exactly 1 object — the single best design direction for this business. The object has:
{
  "styleName": "string — a short, catchy name for this design direction (3-5 words)",
  "styleBrief": "string — a detailed 150-250 word design brief covering: color palette (specific hex codes), typography (specific Google Font names for display and body), overall mood, hero section approach, card/component style, CTA button style, and what real-world brand aesthetic this should channel"
}

Since this business has NO existing website, you have FULL CREATIVE FREEDOM:
- Create the single most natural, industry-appropriate design direction — what the best designer in the world would create as the obvious best choice for this specific business category.
- Tailor the style to this specific business and industry — a law firm should never get the same style as a surf shop.
- FONT SELECTION IS CRITICAL: choose distinctive, characterful Google Fonts — NEVER suggest Inter, Roboto, Arial, Open Sans, or other overused defaults. Pick fonts with personality: Playfair Display, Fraunces, DM Serif Display, Space Grotesk, Outfit, Sora, Manrope, Cabinet Grotesk, Satoshi, General Sans, Clash Display, etc.
- Reference specific colors (hex codes), specific Google Fonts by name, and specific design techniques
- The brief should be opinionated, vivid, and specific
- ANTI-PATTERNS: Never suggest generic purple-on-white, safe blue corporate palettes, or any design direction that feels like generic AI output`,
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { profile: DEFAULT_PROFILE, styles: DEFAULT_STYLES, pageStructure: DEFAULT_PAGE_STRUCTURE, imageSearchQueries: [], classifiedImages: [] };
    }

    let jsonStr = textBlock.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonStr);

    const profile: BusinessProfile = {
      businessName: parsed.profile?.businessName || placeData.name,
      businessType: "local",
      industry: parsed.profile?.industry || categoryText,
      whatTheyDo: parsed.profile?.whatTheyDo || DEFAULT_PROFILE.whatTheyDo,
      targetCustomer: parsed.profile?.targetCustomer || DEFAULT_PROFILE.targetCustomer,
      keySellingPoints:
        Array.isArray(parsed.profile?.keySellingPoints) &&
        parsed.profile.keySellingPoints.length > 0
          ? parsed.profile.keySellingPoints
          : DEFAULT_PROFILE.keySellingPoints,
      brandTone: parsed.profile?.brandTone || DEFAULT_PROFILE.brandTone,
      primaryColors: parsed.profile?.primaryColors || DEFAULT_PROFILE.primaryColors,
      location: parsed.profile?.location || placeData.formatted_address,
    };

    let styles = DEFAULT_STYLES;
    if (
      Array.isArray(parsed.styles) &&
      parsed.styles.length >= 1 &&
      parsed.styles.every(
        (s: Record<string, unknown>) =>
          typeof s.styleName === "string" && typeof s.styleBrief === "string"
      )
    ) {
      styles = parsed.styles.map((s: Record<string, string>) => ({
        styleName: s.styleName,
        styleBrief: s.styleBrief,
      })) as StyleSuggestion[];
    }

    let pageStructure = DEFAULT_PAGE_STRUCTURE;
    if (
      Array.isArray(parsed.pageStructure) &&
      parsed.pageStructure.length >= 3 &&
      parsed.pageStructure.every((s: unknown) => typeof s === "string")
    ) {
      pageStructure = parsed.pageStructure;
    }

    let imageSearchQueries: string[] = [];
    if (
      Array.isArray(parsed.imageSearchQueries) &&
      parsed.imageSearchQueries.every((s: unknown) => typeof s === "string")
    ) {
      imageSearchQueries = parsed.imageSearchQueries;
    }

    return { profile, styles, pageStructure, imageSearchQueries, classifiedImages: [] };
  } catch (err) {
    if (
      err instanceof Anthropic.APIError ||
      err instanceof Anthropic.APIConnectionError ||
      err instanceof Anthropic.AuthenticationError ||
      err instanceof Anthropic.RateLimitError
    ) {
      throw err;
    }
    return { profile: DEFAULT_PROFILE, styles: DEFAULT_STYLES, pageStructure: DEFAULT_PAGE_STRUCTURE, imageSearchQueries: [], classifiedImages: [] };
  }
}

// ── Design Blueprint Generation (Stage 2) ──

const BLUEPRINT_SYSTEM_PROMPT = `You are an elite architectural web designer who plans website layouts with precision before any code is written. You create detailed section-by-section blueprints that guide HTML generation.

You always respond with valid JSON only — no explanation, no markdown, no code fences.

Your blueprint must:
1. Pre-solve every contrast pairing — assign explicit background + text colors per section
2. Pre-assign specific images to specific sections — no ambiguity during generation
3. Choose layout patterns that match the business type and style direction
4. Budget line counts per section to keep total HTML under 800 lines
5. Create visual rhythm — alternate light/dark sections, vary layouts, build toward a cohesive whole

SECTION PATTERN MENUS by business type:

FOR LOCAL/PHYSICAL BUSINESSES (restaurants, salons, contractors, retail, clinics):
Hero patterns: hero-fullwidth-overlay, hero-split-image-right, hero-split-image-left, hero-video-bg, hero-parallax-image
Content patterns: menu-grid, services-cards-3col, services-alternating-rows, gallery-masonry, gallery-lightbox-grid
Social proof: reviews-carousel, reviews-stacked-cards, reviews-featured-quote, rating-stats-bar
Info patterns: hours-and-map-split, team-grid, team-spotlight, about-story-timeline, process-steps
CTA patterns: cta-banner-fullwidth, cta-split-with-image, cta-floating-card

FOR DIGITAL/SAAS BUSINESSES (software, apps, agencies, platforms, dev tools):
Hero patterns: hero-product-screenshot-centered, hero-split-demo-right, hero-gradient-mesh-bg, hero-animated-grid-bg
Content patterns: features-bento-grid, features-alternating-showcase, features-icon-grid-4col, integrations-logo-cloud, workflow-steps-visual
Social proof: testimonials-company-logos, testimonials-tweet-wall, case-study-cards, metrics-counter-row
Info patterns: pricing-table-3tier, pricing-toggle-monthly-annual, faq-accordion, comparison-table
CTA patterns: cta-gradient-banner, cta-minimal-centered, cta-with-demo-form

FOR PORTFOLIO/AGENCY:
Hero patterns: hero-minimal-text-only, hero-showreel-bg, hero-bold-statement
Content patterns: work-grid-asymmetric, case-study-fullwidth, services-minimal-list, process-numbered-steps
Social proof: client-logo-bar, testimonials-minimal-quotes

Choose patterns that create variety within the page — never use the same layout pattern twice in a row.`;

function buildDefaultBlueprint(
  style: StyleSuggestion,
  pageStructure: string[]
): DesignBlueprint {
  // Extract colors from style brief
  const hexMatches = style.styleBrief.match(/#[0-9a-fA-F]{6}/g) || [];
  const primary = hexMatches[0] || "#1a1a2e";
  const secondary = hexMatches[1] || "#f4f4f5";
  const accent = hexMatches[2] || "#f59e0b";

  // Extract font names from style brief
  const fontRegex = /\b(Playfair Display|Fraunces|DM Serif Display|Space Grotesk|Outfit|Sora|Manrope|Cabinet Grotesk|Satoshi|General Sans|Clash Display|DM Sans|Nunito|Source Sans|Poppins|Lora|Merriweather|Raleway|Montserrat|Work Sans)\b/gi;
  const fontMatches = style.styleBrief.match(fontRegex) || [];
  const displayFont = fontMatches[0] || "Space Grotesk";
  const bodyFont = fontMatches[1] || "DM Sans";

  const sections: SectionBlueprint[] = pageStructure.map((section, i) => ({
    id: `section-${i}`,
    sectionType: i === 0 ? "nav" : i === 1 ? "hero" : `content-${i}`,
    layoutPattern: "auto",
    headline: section,
    contentNotes: `Follow original page structure: ${section}`,
    imageStrategy: { source: "none" as const, fallback: `linear-gradient(135deg, ${primary}, ${secondary})` },
    backgroundColor: i % 2 === 0 ? "#ffffff" : "#f9fafb",
    textColor: "#1a1a2e",
    componentChoices: [],
    animationApproach: "fade-in-up",
    estimatedLines: Math.floor(700 / pageStructure.length),
  }));

  return {
    globalTypography: {
      displayFont,
      bodyFont,
      heroSize: "text-5xl md:text-7xl",
      sectionHeadingSize: "text-3xl md:text-4xl",
    },
    colorSystem: {
      primary,
      secondary,
      accent,
      backgroundLight: "#ffffff",
      backgroundDark: "#0f172a",
      textOnLight: "#1a1a2e",
      textOnDark: "#f4f4f5",
    },
    navStyle: "glass-blur-sticky",
    footerStyle: "dark-3-column",
    sections,
    totalEstimatedLines: 700,
    designRationale: `Default blueprint based on ${style.styleName} direction.`,
  };
}

export async function generateBlueprint(
  profile: BusinessProfile,
  style: StyleSuggestion,
  pageStructure: string[],
  pageContent: string,
  classifiedImages?: ClassifiedImage[],
  groupedStockImages?: StockImages
): Promise<DesignBlueprint> {
  try {
    // Build available images summary for the blueprint
    const hasClassified = classifiedImages && classifiedImages.length > 0;
    let imagesContext = "";

    if (hasClassified) {
      const usable = classifiedImages.filter((img) => img.category !== "skip");
      imagesContext = `AVAILABLE BUSINESS IMAGES:\n${usable.map((img) => `- [${img.category}] ${img.url} — ${img.description}`).join("\n")}`;
    }

    if (groupedStockImages) {
      const parts: string[] = [];
      if (groupedStockImages.hero.length > 0) parts.push(`HERO STOCK IMAGES:\n${groupedStockImages.hero.map((u) => `  ${u}`).join("\n")}`);
      if (groupedStockImages.secondary.length > 0) parts.push(`SECONDARY STOCK IMAGES:\n${groupedStockImages.secondary.map((u) => `  ${u}`).join("\n")}`);
      if (groupedStockImages.atmosphere.length > 0) parts.push(`ATMOSPHERE STOCK IMAGES:\n${groupedStockImages.atmosphere.map((u) => `  ${u}`).join("\n")}`);
      if (parts.length > 0) imagesContext += `\n\n${parts.join("\n\n")}`;
    }

    const structureList = pageStructure.map((s, i) => `${i + 1}. ${s}`).join("\n");

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: BLUEPRINT_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Plan a detailed section-by-section blueprint for redesigning this business's website.

BUSINESS PROFILE:
- Name: ${profile.businessName}
- Type: ${profile.businessType === "digital" ? "Digital/SaaS" : "Local/Physical"}
- Industry: ${profile.industry}
- What They Do: ${profile.whatTheyDo}
- Target Customer: ${profile.targetCustomer}
- Key Selling Points: ${profile.keySellingPoints.join(", ")}
- Brand Tone: ${profile.brandTone}
- Existing Brand Colors: ${profile.primaryColors}
- Location: ${profile.location}

SELECTED DESIGN STYLE: ${style.styleName}
STYLE DIRECTION:
${style.styleBrief}

ORIGINAL PAGE STRUCTURE (redesign must follow this structure):
${structureList}

ORIGINAL PAGE CONTENT (use for real headlines, content, and details):
${pageContent ? pageContent.slice(0, 3000) : "(no content available)"}

${imagesContext}

Return a JSON object with this exact structure:
{
  "globalTypography": {
    "displayFont": "specific Google Font name for headings",
    "bodyFont": "specific Google Font name for body text",
    "heroSize": "Tailwind text size classes e.g. 'text-5xl md:text-7xl'",
    "sectionHeadingSize": "Tailwind text size classes e.g. 'text-3xl md:text-4xl'"
  },
  "colorSystem": {
    "primary": "#hex (main brand color)",
    "secondary": "#hex (supporting color)",
    "accent": "#hex (accent/CTA color)",
    "backgroundLight": "#hex (light section background)",
    "backgroundDark": "#hex (dark section background)",
    "textOnLight": "#hex (text color for light sections — must be dark)",
    "textOnDark": "#hex (text color for dark sections — must be light)"
  },
  "navStyle": "description of navigation style",
  "footerStyle": "description of footer style",
  "sections": [
    {
      "id": "unique-section-id",
      "sectionType": "section type from the pattern menu above",
      "layoutPattern": "specific layout description",
      "headline": "actual headline text to use (from real content or improved version)",
      "subheadline": "optional subheadline",
      "contentNotes": "what real content from pageContent to use here — be specific (quote actual text, list items, etc.)",
      "imageStrategy": {
        "source": "classified | stock-hero | stock-secondary | stock-atmosphere | none",
        "url": "specific image URL to use (from the available images above) or omit if none",
        "fallback": "CSS gradient fallback e.g. 'linear-gradient(135deg, #hex1, #hex2)'"
      },
      "backgroundColor": "#hex or 'image-based'",
      "textColor": "#hex — MUST contrast with backgroundColor",
      "componentChoices": ["specific component types to use in this section"],
      "animationApproach": "animation style for this section",
      "estimatedLines": number
    }
  ],
  "totalEstimatedLines": number (must be under 800),
  "designRationale": "2-3 sentences explaining the creative direction and why it fits this business"
}

RULES:
1. The first section should be the navigation, the second should be the hero. Include a footer as the last section.
2. Map EVERY item from the original page structure to a section in the blueprint.
3. Pre-assign specific image URLs from the available images — don't leave it ambiguous.
4. For the hero: prefer [hero-worthy] classified images. If none exist, use the best hero stock image.
5. Every backgroundColor + textColor pair MUST have strong contrast. Light bg = dark text. Dark bg = light text.
6. Vary section backgrounds for visual rhythm — alternate light/dark/colored.
7. Keep totalEstimatedLines under 800. Budget ~40-60 lines for simple sections, ~80-120 for complex ones.
8. Use real content from pageContent for headlines, not generic placeholders.
9. Choose layout patterns from the pattern menu that match the business type.
10. The blueprint should feel like a premium, hand-crafted design plan — not a generic template.`,
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      console.error("[blueprint] No text response from Claude");
      return buildDefaultBlueprint(style, pageStructure);
    }

    let jsonStr = textBlock.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonStr);

    // Validate and construct the blueprint with safe fallbacks
    const blueprint: DesignBlueprint = {
      globalTypography: {
        displayFont: parsed.globalTypography?.displayFont || "Space Grotesk",
        bodyFont: parsed.globalTypography?.bodyFont || "DM Sans",
        heroSize: parsed.globalTypography?.heroSize || "text-5xl md:text-7xl",
        sectionHeadingSize: parsed.globalTypography?.sectionHeadingSize || "text-3xl md:text-4xl",
      },
      colorSystem: {
        primary: parsed.colorSystem?.primary || "#1a1a2e",
        secondary: parsed.colorSystem?.secondary || "#f4f4f5",
        accent: parsed.colorSystem?.accent || "#f59e0b",
        backgroundLight: parsed.colorSystem?.backgroundLight || "#ffffff",
        backgroundDark: parsed.colorSystem?.backgroundDark || "#0f172a",
        textOnLight: parsed.colorSystem?.textOnLight || "#1a1a2e",
        textOnDark: parsed.colorSystem?.textOnDark || "#f4f4f5",
      },
      navStyle: parsed.navStyle || "glass-blur-sticky",
      footerStyle: parsed.footerStyle || "dark-3-column",
      sections: Array.isArray(parsed.sections)
        ? parsed.sections.map((s: Record<string, unknown>, i: number) => ({
            id: (s.id as string) || `section-${i}`,
            sectionType: (s.sectionType as string) || "content",
            layoutPattern: (s.layoutPattern as string) || "auto",
            headline: (s.headline as string) || "",
            subheadline: (s.subheadline as string) || undefined,
            contentNotes: (s.contentNotes as string) || "",
            imageStrategy: s.imageStrategy && typeof s.imageStrategy === "object"
              ? {
                  source: ((s.imageStrategy as Record<string, unknown>).source as string) || "none",
                  url: ((s.imageStrategy as Record<string, unknown>).url as string) || undefined,
                  fallback: ((s.imageStrategy as Record<string, unknown>).fallback as string) || "linear-gradient(135deg, #1a1a2e, #2d3748)",
                }
              : { source: "none" as const, fallback: "linear-gradient(135deg, #1a1a2e, #2d3748)" },
            backgroundColor: (s.backgroundColor as string) || "#ffffff",
            textColor: (s.textColor as string) || "#1a1a2e",
            componentChoices: Array.isArray(s.componentChoices) ? s.componentChoices as string[] : [],
            animationApproach: (s.animationApproach as string) || "fade-in-up",
            estimatedLines: typeof s.estimatedLines === "number" ? s.estimatedLines : 60,
          }))
        : buildDefaultBlueprint(style, pageStructure).sections,
      totalEstimatedLines: typeof parsed.totalEstimatedLines === "number" ? parsed.totalEstimatedLines : 700,
      designRationale: parsed.designRationale || "",
    };

    return blueprint;
  } catch (err) {
    if (
      err instanceof Anthropic.APIError ||
      err instanceof Anthropic.APIConnectionError ||
      err instanceof Anthropic.AuthenticationError ||
      err instanceof Anthropic.RateLimitError
    ) {
      throw err;
    }
    console.error("[blueprint] Failed to generate blueprint, using default:", err);
    return buildDefaultBlueprint(style, pageStructure);
  }
}

// ── Visual QA Review (Stage 4) ──

export async function reviewDesignQA(
  capture: {
    desktopScreenshot: string;
    mobileScreenshot?: string | null;
    domFindings?: DomFinding[];
  },
  blueprint: DesignBlueprint,
  profile: BusinessProfile
): Promise<QAResult & { reviewFailed: boolean }> {
  const { desktopScreenshot, mobileScreenshot, domFindings = [] } = capture;

  // Browser-measured defects are ground truth — they don't need the model's
  // agreement, so they bypass the review and go straight into the issue list.
  const measuredIssues: QAIssue[] = domFindings.map((f) => ({
    severity: f.severity,
    sectionId: f.viewport === "mobile" ? "global (mobile)" : "global",
    issueType: f.issueType,
    description: `[${f.viewport}] ${f.description}`,
    suggestedFix: `${f.suggestedFix} Target element: ${f.evidence}`,
    source: "measured",
  }));

  try {
    // Condensed blueprint for QA context
    const sectionSummary = blueprint.sections
      .map((s) => `- ${s.id}: bg=${s.backgroundColor}, text=${s.textColor}, type=${s.sectionType}`)
      .join("\n");

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: `You are a senior web design QA reviewer performing a visual audit. You compare a screenshot of a generated website against its design blueprint and identify real, visible defects.

You ONLY flag problems that are clearly visible in the screenshot — not style preferences or hypothetical issues. Be strict but fair.

ISSUE SEVERITY:
- "critical": Makes the site unusable or unprofessional — text unreadable, layout completely broken, content overflow
- "major": Significantly hurts quality — empty sections, broken images, navbar covering content, sections with no padding
- "minor": Small polish issues — inconsistent spacing, slight alignment off, could be better but doesn't hurt

WHAT TO CHECK:
1. TEXT CONTRAST: Can ALL text be read easily? White text on light backgrounds = critical. Dark text on dark backgrounds = critical.
2. LAYOUT INTEGRITY: Do elements overlap incorrectly? Is there horizontal scroll? Are sections properly stacked?
3. CONTENT COMPLETENESS: Are there empty cards, missing text, placeholder content, or skeleton elements?
4. IMAGE DISPLAY: Are any images visibly broken (broken icon showing)? Are images properly sized?
5. NAVBAR/BANNER: Does the navbar overlap or cover the hero headline? Is there a gap between a banner and the header when scrolled? If a banner exists above the nav, are they both inside the same sticky container?
6. SPACING: Do sections have adequate vertical padding? Is content crammed together?
7. VISUAL HIERARCHY: Is there clear separation between sections?
8. CONTENT VISIBILITY: Is ALL content visible? If the page looks mostly empty or sections appear blank, this is critical — it may indicate an animation bug where content disappeared after load.
9. MOBILE LAYOUT: When a mobile screenshot is provided, check it separately — text clipped or running off the edge, nav overlapping the hero, columns that never stacked, images squashed, tap targets crushed together. Prefix mobile issue descriptions with "[mobile]".

Automated browser checks may be listed below the screenshots. Those are already confirmed — do NOT repeat them in your issues list. Report only what you can see that they missed.

PASS CRITERIA: Zero critical issues AND zero major issues. Minor issues are noted but don't block.

Score 0-100:
- 90-100: Production-ready, polished
- 80-89: Good, minor polish needed
- 60-79: Usable but has noticeable issues
- Below 60: Needs significant fixes

You always respond with valid JSON only — no explanation, no markdown, no code fences.`,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text" as const,
              text: "DESKTOP SCREENSHOT (1280px wide):",
            },
            {
              type: "image" as const,
              source: {
                type: "base64" as const,
                media_type: "image/png" as const,
                data: desktopScreenshot,
              },
            },
            ...(mobileScreenshot
              ? [
                  {
                    type: "text" as const,
                    text: "MOBILE SCREENSHOT (390px wide):",
                  },
                  {
                    type: "image" as const,
                    source: {
                      type: "base64" as const,
                      media_type: "image/png" as const,
                      data: mobileScreenshot,
                    },
                  },
                ]
              : []),
            {
              type: "text" as const,
              text: `${
                domFindings.length > 0
                  ? `AUTOMATED BROWSER CHECKS ALREADY CONFIRMED (do not repeat these):\n${domFindings
                      .map(
                        (f) =>
                          `- [${f.severity}/${f.viewport}] ${f.description}`
                      )
                      .join("\n")}\n\n`
                  : ""
              }Review these screenshots against the design blueprint below.

BUSINESS: ${profile.businessName} (${profile.industry})

EXPECTED DESIGN:
- Display Font: ${blueprint.globalTypography.displayFont}
- Body Font: ${blueprint.globalTypography.bodyFont}
- Color System: primary=${blueprint.colorSystem.primary}, accent=${blueprint.colorSystem.accent}
- Text on light: ${blueprint.colorSystem.textOnLight}, Text on dark: ${blueprint.colorSystem.textOnDark}

EXPECTED SECTIONS:
${sectionSummary}

Return a JSON object:
{
  "pass": boolean,
  "score": number (0-100),
  "issues": [
    {
      "severity": "critical" | "major" | "minor",
      "sectionId": "which section has the problem (use section id from blueprint, or 'global')",
      "issueType": "contrast" | "layout" | "overflow" | "missing-content" | "broken-image" | "spacing" | "alignment",
      "description": "what's wrong — be specific about what you see",
      "suggestedFix": "concrete CSS/HTML fix suggestion"
    }
  ]
}

If the design looks good with no critical or major issues, return { "pass": true, "score": 90+, "issues": [] } or include only minor issues.`,
            },
          ],
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      console.error("[qa] No text response from Claude");
      return measuredOnlyResult(measuredIssues, true);
    }

    let jsonStr = textBlock.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonStr);

    const validSeverities = new Set(["critical", "major", "minor"]);
    const validIssueTypes = new Set(["contrast", "layout", "overflow", "missing-content", "broken-image", "spacing", "alignment"]);

    const issues: QAIssue[] = Array.isArray(parsed.issues)
      ? parsed.issues
          .filter(
            (issue: Record<string, unknown>) =>
              validSeverities.has(issue.severity as string) &&
              validIssueTypes.has(issue.issueType as string) &&
              typeof issue.description === "string" &&
              typeof issue.suggestedFix === "string"
          )
          .map((issue: Record<string, string>) => ({
            severity: issue.severity as QAIssue["severity"],
            sectionId: issue.sectionId || "global",
            issueType: issue.issueType as QAIssue["issueType"],
            description: issue.description,
            suggestedFix: issue.suggestedFix,
            source: "review" as const,
          }))
      : [];

    const allIssues = [...measuredIssues, ...issues];
    const hasCritical = allIssues.some((i) => i.severity === "critical");
    const hasMajor = allIssues.some((i) => i.severity === "major");
    const pass = !hasCritical && !hasMajor;

    let score = typeof parsed.score === "number" ? parsed.score : pass ? 85 : 50;
    // The reviewer scores what it can see; measured defects it was told to skip
    // must still pull the score down.
    if (measuredIssues.length > 0) {
      const penalty = measuredIssues.reduce(
        (sum, i) => sum + (i.severity === "critical" ? 20 : 10),
        0
      );
      score = Math.max(0, Math.min(score, 100 - penalty));
    }

    return { pass, score, issues: allIssues, reviewFailed: false };
  } catch (err) {
    // Don't block generation on a reviewer failure, but don't pretend it passed
    // either — fall back to whatever the browser measured.
    console.error("[qa] QA review failed:", err);
    return measuredOnlyResult(measuredIssues, true);
  }
}

/**
 * Result built from browser-measured findings alone, used when the vision
 * reviewer is unavailable. `reviewFailed` lets the pipeline record this as
 * "skipped" rather than a clean pass.
 */
function measuredOnlyResult(
  measuredIssues: QAIssue[],
  reviewFailed: boolean
): QAResult & { reviewFailed: boolean } {
  const hasCritical = measuredIssues.some((i) => i.severity === "critical");
  const hasMajor = measuredIssues.some((i) => i.severity === "major");
  const pass = !hasCritical && !hasMajor;
  const penalty = measuredIssues.reduce(
    (sum, i) => sum + (i.severity === "critical" ? 20 : 10),
    0
  );
  return {
    pass,
    score: Math.max(0, 75 - penalty),
    issues: measuredIssues,
    reviewFailed,
  };
}

// ── QA Fix Application (Stage 4 fix loop) ──

const QA_FIX_TOOL = {
  name: "apply_fixes" as const,
  description: "Apply search-and-replace operations to fix visual defects in the HTML.",
  input_schema: {
    type: "object" as const,
    properties: {
      operations: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            search: {
              type: "string" as const,
              description: "Exact substring from the existing HTML to find.",
            },
            replace: {
              type: "string" as const,
              description: "The replacement string.",
            },
          },
          required: ["search", "replace"],
        },
        description: "The search-and-replace operations to fix the identified issues.",
      },
    },
    required: ["operations"],
  },
};

export async function applyQAFixes(
  html: string,
  issues: QAIssue[],
  blueprint: DesignBlueprint
): Promise<string> {
  try {
    const issuesList = issues
      .filter((i) => i.severity === "critical" || i.severity === "major")
      .map(
        (issue, idx) =>
          `${idx + 1}. [${issue.severity}/${issue.issueType}] Section "${issue.sectionId}": ${issue.description}\n   Suggested fix: ${issue.suggestedFix}`
      )
      .join("\n\n");

    if (!issuesList) {
      return html; // No critical/major issues to fix
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 16000,
      system: `You are a surgical HTML fixer. You receive an HTML document and a list of visual defects found by a QA reviewer. Apply the MINIMUM changes needed to fix each defect.

Rules:
1. "search" must be an EXACT substring copied from the existing HTML — character-for-character.
2. "replace" is the string to substitute.
3. Make each "search" string long enough to be unique in the document.
4. Fix ONLY the listed issues — do not make any other changes.
5. Focus on Tailwind classes: changing text colors, adding overlays, fixing padding, adjusting layout classes.
6. Do NOT restructure sections, add new sections, or remove content.
7. For contrast fixes: change text color classes (e.g. text-white → text-gray-900) or add background overlays.
8. For spacing fixes: adjust padding/margin classes.
9. For layout fixes: adjust flex/grid classes, widths, or positioning.

Design system reference:
- Text on light backgrounds: use ${blueprint.colorSystem.textOnLight} or text-gray-900/text-zinc-800
- Text on dark backgrounds: use ${blueprint.colorSystem.textOnDark} or text-white/text-gray-100
- Primary color: ${blueprint.colorSystem.primary}
- Accent color: ${blueprint.colorSystem.accent}`,
      tools: [QA_FIX_TOOL],
      tool_choice: { type: "tool", name: "apply_fixes" },
      messages: [
        {
          role: "user",
          content: `Here is the HTML document:\n\n${html}\n\n---\n\nFIX THESE ISSUES:\n${issuesList}`,
        },
      ],
    });

    // A truncated response leaves the tool input as incomplete JSON. Applying a
    // partial fix set is worse than applying none, so bail out.
    if (message.stop_reason === "max_tokens") {
      console.error("[qa-fix] Response truncated, skipping fixes");
      return html;
    }

    const toolBlock = message.content.find((block) => block.type === "tool_use");
    if (!toolBlock || toolBlock.type !== "tool_use") {
      console.error("[qa-fix] No tool use response");
      return html;
    }

    const response = toolBlock.input as { operations: Array<{ search: string; replace: string }> };
    const operations = response.operations;

    if (!Array.isArray(operations) || operations.length === 0) {
      return html;
    }

    // Keep original in case fixes break something
    const originalHtml = html;
    let fixedHtml = html;
    let appliedCount = 0;

    for (const op of operations) {
      if (typeof op.search !== "string" || typeof op.replace !== "string") continue;
      const matched = findMatch(fixedHtml, op.search);
      if (matched) {
        // Function replacer: a plain string would let `$&`, `$1`, `` $` `` etc.
        // in the replacement be interpreted as substitution patterns.
        fixedHtml = fixedHtml.replace(matched, () => op.replace);
        appliedCount++;
      }
    }

    if (appliedCount < operations.length) {
      console.warn(
        `[qa-fix] Only ${appliedCount}/${operations.length} fixes matched the HTML`
      );
    }

    // Safety check: if fixes broke the HTML structure, revert
    if (
      appliedCount === 0 ||
      !fixedHtml.includes("<!DOCTYPE") ||
      !fixedHtml.includes("</html>") ||
      fixedHtml.length < originalHtml.length * 0.5
    ) {
      console.error(`[qa-fix] Fixes may have broken HTML (applied=${appliedCount}, sizeRatio=${fixedHtml.length / originalHtml.length}), reverting`);
      return originalHtml;
    }

    return fixedHtml;
  } catch (err) {
    console.error("[qa-fix] Failed to apply fixes:", err);
    return html;
  }
}

const VARIATION_SYSTEM_PROMPT = `You are an elite creative director and frontend designer. You create website redesigns so striking that business owners feel compelled to hire on the spot. Your work is production-grade, visually unforgettable, and avoids anything that looks like generic AI output.

You use HTML and Tailwind CSS via CDN. You only return complete, valid HTML — no explanation, no markdown, no code fences. The HTML must start with <!DOCTYPE html>.

DESIGN PHILOSOPHY — COMMIT TO A BOLD VISION:
Before writing any code, commit to a clear aesthetic direction and execute it with precision. Every design must feel intentionally crafted for this specific business — never generic.

Typography:
- Choose distinctive, characterful fonts — NEVER use generic fonts like Inter, Roboto, Arial, or system fonts
- Pair a bold display font with a refined body font (both from Google Fonts)
- Dramatic size contrast: hero text at text-5xl to text-8xl, delicate body text, intentional scale hierarchy
- Use font-weight variation and letter-spacing as design tools

Color & Atmosphere:
- Commit to a cohesive color story with dominant colors and sharp accents — never timid, evenly-distributed palettes
- Create depth with layered backgrounds: noise textures, geometric patterns, layered transparencies, grain overlays
- Use CSS variables for color consistency
- Alternate section backgrounds for visual rhythm — vary between light, dark, colored, and textured
- Gradients should be used sparingly and only on large surfaces (hero backgrounds, section dividers) — never on buttons or small UI elements

TEXT CONTRAST — THIS IS A HARD RULE:
- EVERY piece of text must have strong contrast against its background. No exceptions.
- On light backgrounds: use dark text (text-gray-900, text-zinc-800, text-black). NEVER use white, light gray, or pale colors on light backgrounds.
- On dark backgrounds: use white or very light text. NEVER use dark gray or muted colors on dark backgrounds.
- For text over images: ALWAYS add a dark overlay (bg-black/50 or bg-gradient-to-t from-black/70) beneath the text. Never place bare text directly on an image.
- Subheadings and body text on colored sections must still be clearly readable — use text-white/90 or text-gray-100 on dark sections, text-gray-700 or darker on light sections.
- If a section has a medium-tone background (gray-300, gray-400, etc.), use either very dark or very white text — never mid-tone grays.
- BEFORE FINISHING: mentally scan every section and verify all text is clearly readable against its direct background. If any text blends into its background, fix it immediately.

Spatial Composition & Layout:
- Break the grid intentionally — asymmetry, overlap, diagonal flow, grid-breaking hero elements
- Generous negative space OR controlled density — match the aesthetic vision
- Sections breathe with py-20 to py-32 padding, never cramped
- Use max-w-7xl mx-auto containers but let hero elements break out
- Unexpected layouts that feel genuinely designed, not template-driven
- NAVBAR OVERLAP FIX: The navbar is fixed/sticky, so the hero section's content must not be hidden behind it. The simplest fix: add pt-20 or pt-24 to the hero section (just enough to clear the nav height). Do NOT overdo it — the goal is to prevent overlap, not add excessive whitespace.
- BANNER + STICKY HEADER FIX — THIS CAUSES VISIBLE BUGS IF DONE WRONG: If you add an announcement/info banner above the header, you MUST wrap BOTH the banner and the nav inside a single sticky container (sticky top-0 z-50). Do NOT make the nav "fixed top-8" or "fixed top-[banner-height]" while leaving the banner non-sticky — this causes the banner to scroll away and leaves a visible gap above the header. The correct pattern is: <div class="sticky top-0 z-50"><div class="banner...">...</div><nav class="nav...">...</nav></div>. Then the hero needs pt-28 or pt-32 to clear both. The SIMPLEST approach: skip the banner entirely — only add one if the business truly benefits from it.
- HERO BOTTOM SPACING: The hero section must have enough bottom padding (pb-12 or pb-16) so that CTA buttons at the bottom of the hero don't touch or crowd the next section below.

Motion & Interaction:
- Orchestrated page load: staggered fade-in-up reveals using animation-delay create more delight than scattered animations
- Smooth CSS transitions (transition-all duration-300) on every interactive element
- Hover states that surprise: translate-y, shadow shifts, color transitions, scale changes on cards and buttons
- Extend Tailwind config inline with <script> to add custom keyframe animations via tailwind.config
- A sticky nav with backdrop-blur glass effect

ANIMATION FILL MODE — CRITICAL BUG PREVENTION:
- When using staggered animations with opacity-0 + animation-delay, you MUST include "forwards" in the Tailwind animation config so elements stay visible after animating.
- In the tailwind.config script, define animations like this: 'fade-in-up': 'fadeInUp 0.8s ease-out forwards', 'fade-in': 'fadeIn 0.8s ease-out forwards'
- The "forwards" keyword is MANDATORY — without it, elements snap back to opacity-0 after the animation completes, making all content disappear.
- Do NOT define separate CSS @keyframes AND Tailwind config animations for the same name — Tailwind CDN will override your CSS. Use ONLY the Tailwind config extend approach.
- Example correct config:
  tailwind.config = { theme: { extend: { keyframes: { fadeInUp: { '0%': { opacity: '0', transform: 'translateY(30px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } } }, animation: { 'fade-in-up': 'fadeInUp 0.8s ease-out forwards' } } } }
- Then use: class="animate-fade-in-up opacity-0" style="animation-delay: 0.2s"
- NEVER define @keyframes in a <style> block AND also in the Tailwind config — this causes conflicts.

Component Quality:
- Cards that feel elevated: layered shadows, border highlights, hover transforms
- Testimonials that feel premium — real quotes with names, roles, and visual treatment
- Buttons must use flat solid background colors — NEVER gradient backgrounds on buttons. Use hover:brightness, hover:shadow, or hover:translate for interactivity. A button with a single strong brand color is always more polished than a gradient button.
- CTAs that demand attention through size, color contrast, and hover effects
- Images with rounded corners, subtle shadows, overflow-hidden, and object-cover
- Footer that feels intentionally designed, not an afterthought

ANTI-PATTERNS — NEVER DO THESE:
- Generic fonts (Inter, Roboto, Arial, system-ui, sans-serif defaults)
- Cliched color schemes (purple gradient on white, generic blue/indigo)
- Gradient backgrounds on buttons or links — this is the #1 tell of cheap AI-generated sites
- Predictable 3-column grids with identical card layouts
- Cookie-cutter component patterns that look like every other AI-generated site
- Flat, boring section backgrounds with no texture or depth
- Using emoji as icons
- White or light text on white or light backgrounds — UNREADABLE
- Gray text on gray backgrounds — UNREADABLE
- Text placed directly on images without a dark overlay — UNREADABLE
- Low-contrast color combinations (e.g. light blue text on white, light gray on beige)

ICONS — USE LUCIDE ICONS VIA CDN:
For all icons, use the Lucide icon library. Do NOT use emoji, Font Awesome, Heroicons, or inline SVGs for icons.

Setup — include BOTH of these in the HTML:
1. In <head>: <script src="https://unpkg.com/lucide@0.473.0/dist/umd/lucide.min.js"></script>
2. Right before </body>: <script>document.addEventListener('DOMContentLoaded', function() { lucide.createIcons(); });</script>

Usage — ALWAYS use this exact format: <i data-lucide="icon-name" class="w-6 h-6"></i>
Style with Tailwind classes for size and color: class="w-6 h-6 text-blue-500"
CRITICAL: The data-lucide attribute is REQUIRED for icons to render. Never omit it.

Common icon names: phone, mail, map-pin, star, check, check-circle, arrow-right, menu, x, heart, shield, clock, users, building-2, wrench, utensils, briefcase, globe, zap, award, trending-up, calendar, dollar-sign, thumbs-up, sparkles, home, camera, music, scissors, truck, leaf, sun, moon.

INTERACTIVE MAP — ONLY FOR LOCAL/PHYSICAL BUSINESSES:
If the business has a physical address/location (not "unknown") AND is a local/physical business (businessType is "local", not a SaaS or digital product), include a Google Maps embed in the contact or location section.
Do NOT include a map for digital/SaaS businesses, even if they list an office address.
Use this exact iframe pattern:
<iframe src="https://maps.google.com/maps?q=ENCODED_ADDRESS&t=&z=15&ie=UTF8&iwloc=&output=embed" class="w-full h-64 md:h-80 rounded-xl" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Business Location"></iframe>
Replace ENCODED_ADDRESS with the URL-encoded exact street address from the provided location field. Use ONLY the street address — NEVER use the business name in the map query, as it may resolve to a different business with the same name at a different location.
Style the map container with rounded corners, shadow, and spacing to match the section.
Only include a map when a real, specific address is available — never for "unknown" locations.

CRITICAL RULE — NO EMPTY ELEMENTS:
Every HTML element MUST contain real, visible content. Never output empty cards, paragraphs, headings, or testimonials. If you create 3 cards, all 3 must have full content. Before finishing, mentally scan every element and verify it has text content inside it.

Remember: you are capable of extraordinary creative work. Don't hold back — show what can truly be created when committing fully to a distinctive vision.`;

function renderBlueprintInstructions(blueprint: DesignBlueprint): string {
  const fontUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(blueprint.globalTypography.displayFont)}:wght@400;500;600;700;800;900&family=${encodeURIComponent(blueprint.globalTypography.bodyFont)}:wght@300;400;500;600;700&display=swap`;

  let text = `
═══════════════════════════════════════
DESIGN BLUEPRINT — FOLLOW THIS PRECISELY
═══════════════════════════════════════

GLOBAL DESIGN SYSTEM:
- Display font: ${blueprint.globalTypography.displayFont} (load via Google Fonts: ${fontUrl})
- Body font: ${blueprint.globalTypography.bodyFont}
- Hero text size: ${blueprint.globalTypography.heroSize}
- Section heading size: ${blueprint.globalTypography.sectionHeadingSize}
- Color system:
  Primary: ${blueprint.colorSystem.primary}
  Secondary: ${blueprint.colorSystem.secondary}
  Accent: ${blueprint.colorSystem.accent}
  Light backgrounds: ${blueprint.colorSystem.backgroundLight}
  Dark backgrounds: ${blueprint.colorSystem.backgroundDark}
  Text on light: ${blueprint.colorSystem.textOnLight}
  Text on dark: ${blueprint.colorSystem.textOnDark}
- Nav style: ${blueprint.navStyle}
- Footer style: ${blueprint.footerStyle}
- Design rationale: ${blueprint.designRationale}

SECTIONS TO BUILD (in order):
`;

  for (let i = 0; i < blueprint.sections.length; i++) {
    const s = blueprint.sections[i];
    text += `
SECTION ${i + 1}: ${s.id} (${s.sectionType} — ${s.layoutPattern})
- Headline: "${s.headline}"${s.subheadline ? `\n- Subheadline: "${s.subheadline}"` : ""}
- Content: ${s.contentNotes}
- Background: ${s.backgroundColor} | Text: ${s.textColor}
- Image: ${s.imageStrategy.source !== "none" && s.imageStrategy.url ? `${s.imageStrategy.url} (${s.imageStrategy.source})` : s.imageStrategy.source === "none" ? "No image — use background colors/gradients" : `Use best available ${s.imageStrategy.source} image`}
- Fallback: ${s.imageStrategy.fallback}
- Components: ${s.componentChoices.length > 0 ? s.componentChoices.join(", ") : "use best judgment"}
- Animation: ${s.animationApproach}
- Line budget: ~${s.estimatedLines} lines
`;
  }

  text += `
TOTAL LINE BUDGET: ${blueprint.totalEstimatedLines} lines (do not exceed 800)

CRITICAL: Follow the blueprint's color assignments per section. Every section's text color has been pre-verified for contrast against its background — use them exactly as specified.
`;

  return text;
}

function buildVariationPrompt(
  profile: BusinessProfile,
  imageUrls: string[],
  stockImageUrls: string[],
  style: StyleSuggestion,
  pageStructure: string[],
  pageContent: string,
  customInstructions?: string,
  classifiedImages?: ClassifiedImage[],
  groupedStockImages?: StockImages,
  blueprint?: DesignBlueprint
): string {
  // Use classified images if available, otherwise fall back to flat URL list
  const hasClassified = classifiedImages && classifiedImages.length > 0;

  const originalImages = hasClassified
    ? classifiedImages
        .filter((img) => img.category !== "skip")
        .map((img) => `- [${img.category}] ${img.url} — ${img.description}`)
        .join("\n")
    : imageUrls.length > 0
      ? imageUrls.slice(0, 10).join("\n")
      : "(no images found on original site)";

  // Build stock images section — grouped by purpose when available
  let stockImagesText: string;
  if (groupedStockImages && (groupedStockImages.hero.length > 0 || groupedStockImages.secondary.length > 0 || groupedStockImages.atmosphere.length > 0)) {
    const heroList = groupedStockImages.hero.length > 0
      ? `HERO CANDIDATES (wide, high-quality — pick the best one for the hero section):\n${groupedStockImages.hero.map((u) => `  ${u}`).join("\n")}`
      : "";
    const secondaryList = groupedStockImages.secondary.length > 0
      ? `SECONDARY (lifestyle/detail shots — use in content sections, about, features):\n${groupedStockImages.secondary.map((u) => `  ${u}`).join("\n")}`
      : "";
    const atmosphereList = groupedStockImages.atmosphere.length > 0
      ? `ATMOSPHERE (background/mood images — use for section backgrounds or decorative):\n${groupedStockImages.atmosphere.map((u) => `  ${u}`).join("\n")}`
      : "";
    stockImagesText = [heroList, secondaryList, atmosphereList].filter(Boolean).join("\n\n");
  } else {
    stockImagesText = stockImageUrls.length > 0
      ? stockImageUrls.join("\n")
      : "(no stock images available)";
  }

  const structureList = pageStructure
    .map((section, i) => `${i + 1}. ${section}`)
    .join("\n");

  return `You are redesigning a real business website. This will be shown to the business owner to convince them to hire a web developer. It MUST look dramatically better than their current site — so impressive they feel they need it immediately.

Business Profile:
- Business Name: ${profile.businessName}
- Business Type: ${profile.businessType === "digital" ? "Digital/SaaS" : "Local/Physical"}
- Industry: ${profile.industry}
- What They Do: ${profile.whatTheyDo}
- Target Customer: ${profile.targetCustomer}
- Key Selling Points: ${profile.keySellingPoints.join(", ")}
- Brand Tone: ${profile.brandTone}
- Location: ${profile.location}
${profile.businessType === "digital" ? `
DIGITAL/SAAS BUSINESS — SPECIAL INSTRUCTIONS:
- Do NOT include a Google Maps embed — this is not a physical storefront business.
- Focus sections on: product features, pricing, integrations, workflows, social proof from companies/users.
- Hero should focus on the product value proposition, not a physical environment.
- Use product screenshots or abstract imagery, not storefront/environment photos.
- CTAs should focus on sign-up, demo, or trial — not "visit us" or "call now".
- Testimonials should reference companies or roles, not local community members.
` : ""}
Design Style: ${style.styleName}
Style Direction:
${style.styleBrief}

BUSINESS IMAGES (from the business — use these for authenticity):
${originalImages}

STOCK IMAGES (high-quality professional photos relevant to this business — use these to fill gaps):
${stockImagesText}

${hasClassified ? `Image Usage Strategy — CLASSIFIED IMAGES (use the category tags to place images correctly):
- [logo] images: Use ONLY in the navbar and footer — never as content images.
- [hero-worthy] images: These are pre-screened as large, high-quality originals — use them for the hero section or major section backgrounds. If none exist, use a STOCK image for the hero.
- [product] images: Use in service/product showcases, menu sections, portfolio grids, and feature highlights. These are the business's real work — the owner will recognize them.
- [team] images: Use in about sections, team grids, or founder spotlights.
- [storefront] images: Use in about/location sections, or as secondary section backgrounds.
- [screenshot] images: Product screenshots, dashboard UIs, app interfaces — use in feature sections, hero areas, or product demo sections. Display them in device mockup frames or with subtle shadows.
- [gallery] images: Use in gallery grids, content sections, or testimonial backgrounds.
- [decorative] images: Use sparingly as small visual accents, or skip if not needed.
- STOCK images are grouped by purpose: HERO CANDIDATES are pre-selected wide images ideal for full-width hero backgrounds, SECONDARY are lifestyle/detail shots for content sections, ATMOSPHERE are mood images for section backgrounds. Use the right group for the right placement.
- For the HERO section, pick from the HERO CANDIDATES stock images — these are specifically chosen to be wide, dramatic, and high-quality. Only use a classified [hero-worthy] original instead if one exists and is clearly professional quality.
- Every image must use object-cover, rounded corners where appropriate, and proper aspect ratios.
- If a section needs an image but neither set has a good fit, use a CSS gradient or textured background instead.` : `Image Usage Strategy — PRIORITIZE THE BUSINESS'S OWN IMAGES:
- BUSINESS images are the business's REAL photos — their shop, team, products, storefront, food, work, etc. The business owner will recognize their own photos and feel an immediate connection. This is what sells them on the redesign.
- ALWAYS prefer business images over stock photos when they are decent quality. A real photo of their actual restaurant, salon, or storefront is infinitely more compelling than a generic stock photo of "a restaurant".
- HERO SECTION: Use the business's best, most visually striking image for the hero if one is available and looks professional. Their real storefront, interior, signature dish, finished project, etc. makes the hero feel personal and authentic. Only fall back to a HERO CANDIDATE stock image if the business images are all low quality, too small, or clearly unsuitable for a hero.
- Use business images throughout: gallery sections, about sections, service showcases, team photos, location sections — anywhere their real content fits.
- Use STOCK images to FILL GAPS — sections where no business image fits, or where you need variety and have run out of business images. Stock images are the backup, not the default.
- Use ATMOSPHERE stock images for section backgrounds or decorative overlays where a subtle, non-specific image works better than a specific business photo.
- Every image must use object-cover, rounded corners where appropriate, and proper aspect ratios.
- If a section needs an image but neither set has a good fit, use a CSS gradient or textured background instead.`}

ORIGINAL PAGE CONTENT (scraped from the real website — use this as your primary content source):
${pageContent || "(no page content available)"}

ORIGINAL PAGE STRUCTURE — follow this structure closely:
The original website has these sections. Your redesign must include upgraded versions of each of these, in a similar order. Don't invent sections that don't relate to this business. Instead, take what they already have and make each section dramatically more beautiful and polished.

${structureList}

For each section above:
- Keep the same type of content (if they have a menu, redesign the menu — don't replace it with generic "services cards")
- Enhance it with better layout, typography, spacing, and visual hierarchy
- Add any obviously missing essentials (if they have no clear CTA, add one; if they have no footer, add a proper one)
- You may split a dense section into two cleaner sections, or combine thin sections — use your design judgment
- Rewrite headlines and copy to be more compelling, but keep the same meaning and facts

USE REAL CONTENT FROM THE ORIGINAL SITE — THIS IS CRITICAL:
- Extract and use REAL information from the page content above: addresses, phone numbers, email addresses, business hours, service lists, menu items, pricing, team member names, and any other factual details.
- If the site has real customer reviews or testimonials, use those exact quotes and names — do NOT invent fake ones.
- If the site lists real services, menu items, or products, use those — do NOT replace them with generic alternatives.
- Real addresses and phone numbers must appear in the contact/footer sections exactly as they do on the original site.
- Business hours should be displayed if they appear in the original content.
- You may polish the wording of descriptions and headlines, but NEVER change factual details (names, numbers, addresses, prices).
- Only invent content (e.g. testimonial quotes) if the original site has NO real content for that section.

CONTENT COMPLETENESS — MANDATORY:
- Every card, testimonial, feature block, or repeated element MUST be fully populated with real text content
- If you create a grid of 3 cards, ALL 3 must have a heading, description, and any visual element — zero empty cards
- If you create testimonials, prefer REAL reviews from the original site. Only create fictional ones if no real reviews exist — and if so, every one must have: a realistic quote (2-3 sentences), a full name, and a role or context.
- If you create a stats section, EVERY stat must have a number and a label
- Do NOT create placeholder or skeleton elements — if you can't fill it, don't create it
- Before completing your response, verify: does every visible HTML element contain actual text content? If not, fix it.

Critical Design Rules:
- Add preconnect hints in <head> for fast image loading: <link rel="preconnect" href="https://images.pexels.com"> and <link rel="dns-prefetch" href="https://images.pexels.com">
- IMAGE LOADING PERFORMANCE: The hero image must load eagerly (no loading attribute). ALL other images below the fold MUST use loading="lazy" to avoid blocking page load.
- Load Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
- Use Lucide icons via <i data-lucide="name"> tags — NEVER use emoji characters as icons
- Extend Tailwind config inline with <script> to add custom keyframe animations (fadeInUp, fadeIn, etc.) via tailwind.config — ALWAYS include "forwards" fill mode in animation values so animated elements stay visible. Example: 'fade-in-up': 'fadeInUp 0.8s ease-out forwards'. Do NOT define duplicate @keyframes in a <style> block — use ONLY the Tailwind config approach.
- Load a Google Font via <link> tag in <head> (pick the font specified in the style direction, or one that fits)
- Set the font-family on <body> and configure it in the Tailwind config extend
- Use the real business content — NEVER use placeholder text like "Lorem Ipsum" or "Your Business Name Here"
- Use the original image URLs in <img> tags with object-cover, rounded corners, and shadows
- For any images that fail to load, set a neutral gradient placeholder via onerror
- Alternate section backgrounds for visual rhythm — never have two identical sections back to back
- Every section: py-20 minimum, many should use py-24 or py-32
- ALL buttons must have hover states with transition-all duration-300 — scale, shadow, or color shifts
- ALL cards must have hover states — translate-y, shadow changes, or border color transitions
- The design must be fully mobile responsive — test mental model at 375px, 768px, and 1440px
- Use max-w-7xl mx-auto for content containers
- Add orchestrated page-load animations: staggered fade-in-up reveals with animation-delay on hero elements and section content. CRITICAL: animations MUST use "forwards" fill mode and define keyframes ONLY in the Tailwind config, not in a separate <style> block.
- Create visual depth: use background textures (subtle noise/grain via CSS), layered transparencies, and atmospheric gradients — not flat solid-color sections
- The design must feel like it was hand-crafted by a senior designer for this specific business, not generated from a template
- HERO SECTIONS WITH BACKGROUND IMAGES: Always add a dark overlay div (absolute inset-0 bg-black/50 or bg-gradient-to-t from-black/70 to-black/30) between the image and the text content. The text container must be relative with z-10. This is MANDATORY — never skip the overlay.
- NAVBAR OVERLAP FIX: The nav is fixed/sticky, so the hero's first visible content must clear the nav. Add pt-20 or pt-24 to the hero section to prevent the headline from hiding behind the navbar. Don't overdo the spacing — just enough to clear the nav.
- BANNER + STICKY HEADER FIX — THIS CAUSES VISIBLE BUGS IF DONE WRONG: If you add an announcement/info banner above the header, you MUST wrap BOTH the banner and the nav inside a single sticky container (sticky top-0 z-50). Do NOT make the nav "fixed top-8" or "fixed top-[banner-height]" while leaving the banner non-sticky — this causes the banner to scroll away and leaves a visible gap above the header. The correct pattern is: <div class="sticky top-0 z-50"><div class="banner...">...</div><nav class="nav...">...</nav></div>. Then the hero needs pt-28 or pt-32 to clear both. The SIMPLEST approach: skip the banner entirely — only add one if the business truly benefits from it.
- HERO BOTTOM SPACING: The hero section must have enough bottom padding (pb-12 or pb-16) so that CTA buttons at the bottom of the hero don't touch or crowd the next section below.
- FINAL CONTRAST CHECK: After generating the full HTML, scan every section top to bottom. For each section, verify the text color has high contrast against the section background. If any text would be hard to read, fix it before outputting.
${customInstructions ? `\nADDITIONAL INSTRUCTIONS FROM THE USER — follow these closely:\n${customInstructions}\n` : ""}
- Keep the total HTML under 800 lines. Favor clean, efficient code — combine utility classes, avoid unnecessary wrapper divs, and keep sections impactful but concise. Quality over quantity.
- Return ONLY the complete HTML document starting with <!DOCTYPE html> — absolutely nothing else
${blueprint ? renderBlueprintInstructions(blueprint) : ""}`;
}

function extractHtml(text: string): string {
  let html = text.trim();
  if (html.startsWith("```")) {
    html = html.replace(/^```(?:html)?\n?/, "").replace(/\n?```$/, "");
  }
  return html;
}

// Pass 2 — Generate a single variation
export async function generateVariation(
  profile: BusinessProfile,
  imageUrls: string[],
  stockImageUrls: string[],
  style: StyleSuggestion,
  pageStructure: string[],
  pageContent: string,
  customInstructions?: string,
  classifiedImages?: ClassifiedImage[],
  groupedStockImages?: StockImages,
  blueprint?: DesignBlueprint
): Promise<string> {
  const userContent = buildVariationPrompt(profile, imageUrls, stockImageUrls, style, pageStructure, pageContent, customInstructions, classifiedImages, groupedStockImages, blueprint);

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 16000,
    system: VARIATION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: userContent,
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  let html = textBlock.text;
  let stopReason = message.stop_reason;

  // If output was truncated, keep continuing until the document is complete.
  // A single continuation isn't always enough, and shipping a half-written
  // document is the most visible way a generation can be broken.
  const MAX_CONTINUATIONS = 3;
  for (let i = 0; i < MAX_CONTINUATIONS && stopReason === "max_tokens"; i++) {
    const continuation = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      system: "You were generating an HTML document that was cut off. Continue EXACTLY where you left off — output only the remaining HTML to complete the document. Do not repeat any content. Do not add explanation.",
      messages: [
        { role: "user", content: userContent },
        { role: "assistant", content: html },
        { role: "user", content: "Continue exactly where you left off. Output only the remaining HTML." },
      ],
    });

    const contBlock = continuation.content.find((block) => block.type === "text");
    if (!contBlock || contBlock.type !== "text" || !contBlock.text.trim()) break;

    html += contBlock.text;
    stopReason = continuation.stop_reason;
  }

  const finalHtml = extractHtml(html);

  // The system prompt contracts a complete document. A missing closing tag means
  // we never recovered from truncation — fail loudly rather than saving a broken
  // preview and charging a credit for it.
  if (!/<\/html\s*>/i.test(finalHtml)) {
    throw new Error(
      "Generated HTML was truncated and could not be completed after continuations"
    );
  }

  return finalHtml;
}

// ── Revision (surgical edit of existing HTML via search-and-replace) ──

const REVISION_SYSTEM_PROMPT = `You are a minimally-invasive website editor. You receive HTML and a revision request. Use the apply_revisions tool to return search-and-replace operations strictly necessary to fulfill the request — nothing more.

You may also receive BUSINESS CONTEXT and ORIGINAL PAGE CONTENT with real business data (hours, services, reviews, address, phone, etc.). When the user asks to add or update content, use this real data — never invent fake details when real ones are available.

Rules:
1. "search" must be an EXACT substring copied from the existing HTML — character-for-character, including whitespace and quotes.
2. "replace" is the string to substitute in its place.
3. Make each "search" string long enough to be unique in the document.
4. Use the FEWEST operations possible. If the user asks to change a headline, return 1 operation — not 5.
5. NEVER touch anything the user didn't ask about. No "while I'm at it" fixes. No adjusting colors for contrast. No improving hover states. No fixing things that look wrong to you. ONLY what was explicitly requested.

IMAGE CHANGES:
When the user asks to add, change, move, or replace an image:
1. FIRST check EXISTING IMAGES IN THE PAGE (listed below the HTML). If the user refers to a logo, brand image, or any image already present elsewhere on the page, REUSE that existing URL — do NOT use {{STOCK_IMAGE_URL}} or request a stock photo. For example, if the logo appears in the footer and the user asks to add it to the header, copy the same src URL.
2. Only set "image_search" to a Pexels query if no suitable image already exists on the page. If you are reusing an existing image, set "image_search" to null.
3. For the "search" string, copy the EXACT HTML substring to replace — character-for-character, including whitespace and quotes.
4. For the "replace" string, write the new HTML. Use the existing image URL directly when reusing, or src="{{STOCK_IMAGE_URL}}" only when a new stock photo is truly needed.
5. Keep the same class, alt, and other attributes unless the user asks to change them.`;

const REVISION_TOOL = {
  name: "apply_revisions" as const,
  description: "Apply search-and-replace operations to revise the HTML document.",
  input_schema: {
    type: "object" as const,
    properties: {
      image_search: {
        type: ["string", "null"] as const,
        description:
          "A Pexels search query if the revision involves changing an image, otherwise null.",
      },
      operations: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            search: {
              type: "string" as const,
              description:
                "Exact substring from the existing HTML to find.",
            },
            replace: {
              type: "string" as const,
              description: "The replacement string.",
            },
          },
          required: ["search", "replace"],
        },
        description: "The search-and-replace operations to apply.",
      },
    },
    required: ["image_search", "operations"],
  },
};

interface SearchReplace {
  search: string;
  replace: string;
}

interface RevisionResponse {
  image_search: string | null;
  operations: SearchReplace[];
}

export interface RevisionResult {
  html: string;
  imageOptions: string[];
  appliedImageUrl: string | null;
  appliedCount: number;
  totalOperations: number;
}

/**
 * A revision failure with a message that is safe to show the user directly.
 */
export class RevisionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RevisionError";
  }
}

/**
 * Find `search` inside `html`. Falls back to a whitespace-tolerant match, since
 * the model frequently reproduces an HTML snippet with different indentation or
 * line breaks than the original. Returns the exact substring that matched.
 */
function findMatch(html: string, search: string): string | null {
  if (html.includes(search)) return search;

  const parts = search.trim().split(/\s+/);
  if (parts.length < 2) return null;

  const pattern = parts
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+");

  const match = html.match(new RegExp(pattern));
  return match ? match[0] : null;
}

export async function reviseVariation(
  existingHtml: string,
  userPrompt: string,
  profile?: BusinessProfile | null,
  pageContent?: string | null
): Promise<RevisionResult> {
  // Build business context block so the AI can reference real data
  let contextBlock = "";
  if (profile) {
    contextBlock += `\n\nBUSINESS CONTEXT (use this for accurate content):\n- Business Name: ${profile.businessName}\n- Industry: ${profile.industry}\n- What They Do: ${profile.whatTheyDo}\n- Target Customer: ${profile.targetCustomer}\n- Key Selling Points: ${profile.keySellingPoints.join(", ")}\n- Brand Tone: ${profile.brandTone}\n- Location: ${profile.location}`;
  }
  if (pageContent) {
    contextBlock += `\n\nORIGINAL PAGE CONTENT (real business data — use for accurate details like hours, services, menu items, reviews, phone, address):\n${pageContent.slice(0, 3000)}`;
  }

  // Extract existing images from the HTML so the AI knows what's available to reuse
  let existingImagesBlock = "";
  const imgTagRegex = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi;
  const seenUrls = new Set<string>();
  const imageEntries: string[] = [];
  let imgMatch;
  while ((imgMatch = imgTagRegex.exec(existingHtml)) !== null) {
    const url = imgMatch[1];
    if (!seenUrls.has(url)) {
      seenUrls.add(url);
      // Try to extract alt text for context
      const altMatch = imgMatch[0].match(/alt=["']([^"']*)["']/i);
      const alt = altMatch?.[1] || "";
      imageEntries.push(`- ${alt ? `"${alt}"` : "(no alt)"}: ${url}`);
    }
  }
  if (imageEntries.length > 0) {
    existingImagesBlock = `\n\nEXISTING IMAGES IN THE PAGE (reuse these when the user refers to something already on the site — especially logos and brand images):\n${imageEntries.join("\n")}`;
  }

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 16000,
    system: REVISION_SYSTEM_PROMPT,
    tools: [REVISION_TOOL],
    tool_choice: { type: "tool", name: "apply_revisions" },
    messages: [
      {
        role: "user",
        content: `Here is the current HTML document:\n\n${existingHtml}\n\n---${contextBlock}${existingImagesBlock}\n\n---\n\nRevision request: ${userPrompt}`,
      },
    ],
  });

  // A truncated response leaves the tool input as incomplete JSON, which the API
  // returns as a partial (often empty) object. Catch it before it looks like the
  // model simply had nothing to say.
  if (message.stop_reason === "max_tokens") {
    throw new RevisionError(
      "That change was too large to generate in one pass — try asking for one smaller change at a time."
    );
  }

  const toolBlock = message.content.find((block) => block.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error("No tool use response from Claude");
  }

  const revision = toolBlock.input as RevisionResponse;

  const operations = revision.operations;
  if (!Array.isArray(operations) || operations.length === 0) {
    throw new RevisionError(
      "The revision couldn't be applied — try rephrasing your request."
    );
  }

  // If the revision needs a stock image, fetch candidates from Pexels
  let stockImageUrl: string | null = null;
  let imageOptions: string[] = [];
  if (revision.image_search) {
    const { searchPexels } = await import("@/lib/pexels");
    const urls = await searchPexels([revision.image_search], 5);
    imageOptions = urls;
    stockImageUrl = urls[0] ?? null;
  }

  // Apply each search-and-replace operation
  let html = existingHtml;
  let appliedCount = 0;

  for (const op of operations) {
    if (typeof op.search !== "string" || typeof op.replace !== "string") {
      continue;
    }

    // Substitute the stock image placeholder if we have one
    let replaceStr = op.replace;
    if (stockImageUrl && replaceStr.includes("{{STOCK_IMAGE_URL}}")) {
      replaceStr = replaceStr.replace(/\{\{STOCK_IMAGE_URL\}\}/g, stockImageUrl);
    }

    const matched = findMatch(html, op.search);
    if (matched) {
      // Function replacer: a plain string would let `$&`, `$1`, `` $` `` etc. in
      // the replacement be interpreted as substitution patterns.
      html = html.replace(matched, () => replaceStr);
      appliedCount++;
    } else if (op.search.includes("<img") || op.replace.includes("{{STOCK_IMAGE_URL}}") || (stockImageUrl && op.replace.includes(stockImageUrl))) {
      // Fallback for image operations: the AI often copies <img> tags inexactly
      // Try to find the img tag by extracting the src URL from the search string
      const srcMatch = op.search.match(/src=["']([^"']+)["']/);
      if (srcMatch) {
        const srcUrl = srcMatch[1];
        // Find the full <img ...> or <img ... /> tag containing this src
        const escapedSrc = srcUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const imgRegex = new RegExp(`<img[^>]*src=["']${escapedSrc}["'][^>]*/?>`, "i");
        const imgMatch = html.match(imgRegex);
        if (imgMatch) {
          html = html.replace(imgMatch[0], () => replaceStr);
          appliedCount++;
        }
      }
    }
  }

  if (appliedCount === 0) {
    throw new RevisionError(
      "The revision couldn't be applied — try rephrasing your request."
    );
  }

  return {
    html,
    imageOptions,
    appliedImageUrl: stockImageUrl,
    appliedCount,
    totalOperations: operations.length,
  };
}

// ── Cold Email Generation ──

export interface ColdEmail {
  subject: string;
  body: string;
}

export async function generateColdEmail(
  profile: BusinessProfile,
  previewUrl: string,
  devName: string,
  isNewSite: boolean = false
): Promise<ColdEmail> {
  const situationContext = isNewSite
    ? `This business currently has NO website — only a Google Maps listing. I proactively built them a complete, professional website they can view right now at the preview link. This is a cold outreach — they did not ask for this. The goal is to impress them with the initiative and quality, and convert them into a paying client.`
    : `This business has an existing website that looks outdated or could be significantly improved. I proactively built them a free redesign preview showing exactly what their site COULD look like with a modern upgrade. They can view the before/after at the preview link. This is a cold outreach — they did not ask for this. The goal is to make the contrast between their current site and the preview so compelling that they want to move forward.`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: `You write short, genuine cold emails for a web developer who builds things for businesses before reaching out. You write like a real person dashing off a quick note — not a marketer, not a salesperson, not an AI.

You always respond with valid JSON only — no explanation, no markdown, no code fences.

THE SITUATION: ${isNewSite
  ? "This business has NO website — just a Google Maps listing. The developer built them a complete website from scratch, unprompted. This is a gift, not a pitch. The email should convey: 'I noticed you don't have a site, so I made you one — take a look.'"
  : "This business has a website that looks dated or underperforms. The developer built a free redesign mockup showing what it could look like. The email should convey: 'Your site caught my eye, I mocked up a fresher version — take a look.'"}

TONE:
- Write like you're texting a friendly acquaintance, not drafting marketing copy.
- Casual, warm, zero pressure. Think DM energy, not email blast energy.
- Confident but understated — you did something cool for them, no need to oversell it.
- The preview link does ALL the selling. The email just needs to get them to click it.

FORMAT:
- Subject: 3-6 words, lowercase-friendly, specific to their business. No clickbait, no questions, no exclamation marks.
- Body: 2-4 sentences. That's it. Shorter is better.
  - Open with something specific about THEIR business — one detail that proves you actually looked at what they do. Don't be generic.
  - ${isNewSite ? "Mention you noticed they don't have a website and you put one together for them." : "Mention you thought their site could use a refresh and you mocked something up."}
  - Drop the preview link inline, casually. Not "Click here to view" — just weave it in.
  - Close with zero ask. No "let's hop on a call", no "I'd love to discuss". Just something like "no strings" or "lmk what you think" or "hope it's useful". The softer the better.
- Sign off with just "${devName}". Nothing else — no title, no company, no links.

RULES:
- NEVER use these words: revolutionize, transform, elevate, cutting-edge, leverage, synergy, game-changer, unlock, supercharge, excited, thrilled, passionate, craft, crafted, delighted, reach out, touch base, circle back.
- NEVER use "I'd love to" — it's in every AI-generated email and people recognize it instantly.
- ${isNewSite ? 'NEVER say "redesign" — this is a brand new website, not a redesign.' : 'You can say "redesign", "refresh", "new look", "mockup", or "update".'}
- No exclamation marks in the subject. Maximum one in the entire body.
- Do NOT start with "Hey [Business Name]" — either use "Hey" alone, "Hi [first name if known]", or skip the greeting entirely.
- Do NOT include "[Your Name]" or any placeholder.
- Vary your approach each time — different openers, different angles, different closes.
- Read the email back. If it sounds like it could be from a LinkedIn automation tool, rewrite it.`,
    messages: [
      {
        role: "user",
        content: `Write a cold email for this situation:

I'm ${devName}, a web developer/designer. ${situationContext}

Business: ${profile.businessName}
Business Type: ${profile.businessType === "digital" ? "Digital/SaaS product" : "Local/physical business"}
Industry: ${profile.industry}
What they do: ${profile.whatTheyDo}
Target customers: ${profile.targetCustomer}
Key selling points: ${profile.keySellingPoints?.join(", ") || "N/A"}
Location: ${profile.location}
${profile.businessType === "digital" ? "\nNote: This is a digital/SaaS business. Do NOT reference their physical location, hours, or storefront. Instead reference their product, online presence, market position, and conversion optimization opportunities." : ""}

Preview link: ${previewUrl}

Return a JSON object with "subject" and "body" keys. The body should be plain text (no HTML), with line breaks as \\n. Sign off with just "${devName}".`,
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  let jsonStr = textBlock.text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(jsonStr);
  return {
    subject: parsed.subject || `Quick idea for ${profile.businessName}`,
    body: parsed.body || "",
  };
}
