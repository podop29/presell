import Anthropic from "@anthropic-ai/sdk";
import type {
  ScrapedData,
  BusinessProfile,
  StyleSuggestion,
  AnalysisResult,
} from "@/types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const DEFAULT_PROFILE: BusinessProfile = {
  businessName: "This Business",
  industry: "General",
  whatTheyDo: "Provides products and services to customers",
  targetCustomer: "General public",
  keySellingPoints: ["Quality service", "Experienced team", "Customer focused"],
  brandTone: "professional",
  primaryColors: "unknown",
  location: "unknown",
};

const DEFAULT_STYLES: [StyleSuggestion, StyleSuggestion, StyleSuggestion] = [
  {
    styleName: "Refined & Editorial",
    styleBrief:
      "Sophisticated editorial layout with Playfair Display for headlines and Source Sans 3 for body. Color palette: #1a1a2e deep navy with #e8d5b7 warm gold accents. Asymmetric hero with oversized typography, magazine-style section layouts, generous whitespace, subtle grain texture on light sections, elegant card borders, and muted hover transitions. Channel the refined aesthetic of a high-end architecture portfolio.",
  },
  {
    styleName: "Vivid & Energetic",
    styleBrief:
      "High-energy design with DM Sans bold headlines and Manrope body text. Color palette: #0f172a charcoal base with #f97316 vibrant orange and #06b6d4 cyan as sharp accents. Oversized hero text with gradient mesh background, diagonal section dividers, cards with bold colored left-borders and scale-up hover states, gradient CTA buttons with glow shadows. Channel the confident energy of Linear or Vercel.",
  },
  {
    styleName: "Warm & Organic",
    styleBrief:
      "Earthy, approachable design with Fraunces for display text and Nunito for body. Color palette: #faf7f2 warm cream base, #2d4a3e forest green primary, #c9a96e muted gold accent. Rounded corners (rounded-2xl) everywhere, soft layered shadows, textured section backgrounds with subtle noise overlay, hand-crafted feel with organic shapes and generous padding. Channel the warmth of a premium artisan brand.",
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

// Pass 1 — Business Analysis + Style Generation + Page Structure
export async function analyzeBusinessContent(
  url: string,
  data: ScrapedData
): Promise<AnalysisResult> {
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: `You are an elite brand strategist and creative director who creates distinctive, context-specific design directions. You avoid generic AI aesthetics and cookie-cutter suggestions. Every style you propose must feel intentionally crafted for the specific business.

You always respond with valid JSON only — no explanation, no markdown, no code fences.`,
      messages: [
        {
          role: "user",
          content: `Analyze this website and return a JSON object with four top-level keys: "profile", "styles", "pageStructure", and "imageSearchQueries".

"profile" must have exactly these fields:
{
  "businessName": "string",
  "industry": "string",
  "whatTheyDo": "string (one clear sentence)",
  "targetCustomer": "string",
  "keySellingPoints": ["string"] (3-5 points),
  "brandTone": "string (e.g. 'professional and trustworthy' or 'fun and casual')",
  "primaryColors": "string (describe any obvious brand colors, or 'unknown')",
  "location": "string (city/region if mentioned, or 'unknown')"
}

"pageStructure" must be an array of strings describing the sections that exist on the original website, in order. Look at the actual page content and identify what sections the site has. Examples:
- A restaurant might have: ["Navigation with logo", "Hero with restaurant name and tagline", "Menu highlights section with food categories", "Photo gallery of dishes", "About the chef / our story", "Customer reviews", "Hours and location with map", "Reservation CTA", "Footer with social links"]
- A law firm might have: ["Navigation with firm name", "Hero with firm tagline", "Practice areas grid", "Attorney profiles", "Case results / track record", "Client testimonials", "Contact form with office address", "Footer"]
- A plumber might have: ["Navigation with phone number", "Hero with emergency CTA", "Services list", "Service area map", "Before/after gallery", "Reviews from Google", "Pricing or free estimate CTA", "Footer with license number"]

Be specific about what content each section contains — don't just say "Hero section", say "Hero with bakery name, 'Fresh baked daily' tagline, and order online button". Include 6-10 sections.

"imageSearchQueries" must be an array of exactly 3 strings — search queries to find high-quality stock photos that would look great on this business's redesigned website. Be specific and descriptive:
- Query 1: A hero/banner image query (e.g. "luxury spa massage therapy interior warm lighting" or "modern auto repair shop professional mechanic")
- Query 2: A secondary/lifestyle image (e.g. "relaxed woman enjoying facial treatment" or "happy family in new car dealership")
- Query 3: A background/atmosphere image (e.g. "zen spa stones candles peaceful" or "clean modern office workspace")
Tailor these to the specific business and industry. Use descriptive keywords that will return professional, high-quality photos.

"styles" must be an array of exactly 3 objects. Each object has:
{
  "styleName": "string — a short, catchy name for this design direction (3-5 words, like 'Warm & Inviting' or 'Sleek Tech Forward')",
  "styleBrief": "string — a detailed 150-250 word design brief covering: color palette (specific hex codes), typography (specific Google Font name), overall mood, hero section approach, card/component style, CTA button style, and what real-world brand or website aesthetic this should channel"
}

Rules for generating the 3 styles:
- Each style must feel dramatically different from the others — vary color palette, mood, typography, layout approach, and overall aesthetic direction
- Tailor every style to this specific business and industry — a law firm should never get the same styles as a surf shop
- One style should lean sophisticated/editorial (think refined magazine layout), one should feel energetic/bold (think startup landing page), and one should be a creative wildcard that feels unexpected but perfectly appropriate for this specific business
- FONT SELECTION IS CRITICAL: choose distinctive, characterful Google Fonts — NEVER suggest Inter, Roboto, Arial, Open Sans, or other overused defaults. Pick fonts with personality: Playfair Display, Fraunces, DM Serif Display, Space Grotesk, Outfit, Sora, Manrope, Cabinet Grotesk, Satoshi, General Sans, Clash Display, etc. Each style MUST use a different display font.
- Reference specific colors (hex codes), specific Google Fonts by name, and specific design techniques (gradient meshes, grain textures, asymmetric layouts, diagonal dividers, overlapping elements, glassmorphism, etc.)
- Describe the atmosphere: what real-world brand or website aesthetic should this channel? (e.g. "Channel the editorial elegance of Cereal magazine" or "Channel the bold energy of Stripe's landing page")
- The briefs should be opinionated, vivid, and specific — say "use #1e3a5f navy with #f4a261 warm amber accents, grain-textured cream sections" not "use professional colors"
- ANTI-PATTERNS: Never suggest generic purple-on-white, safe blue corporate palettes, or any design direction that feels like generic AI output

Website Title: ${data.title}
Website URL: ${url}
Meta Description: ${data.description}
Page Content: ${data.content.slice(0, 3000)}`,
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { profile: DEFAULT_PROFILE, styles: DEFAULT_STYLES, pageStructure: DEFAULT_PAGE_STRUCTURE, imageSearchQueries: [] };
    }

    let jsonStr = textBlock.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonStr);

    const profile: BusinessProfile = {
      businessName: parsed.profile?.businessName || DEFAULT_PROFILE.businessName,
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
      parsed.styles.length === 3 &&
      parsed.styles.every(
        (s: Record<string, unknown>) =>
          typeof s.styleName === "string" && typeof s.styleBrief === "string"
      )
    ) {
      styles = parsed.styles.map((s: Record<string, string>) => ({
        styleName: s.styleName,
        styleBrief: s.styleBrief,
      })) as [StyleSuggestion, StyleSuggestion, StyleSuggestion];
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

    return { profile, styles, pageStructure, imageSearchQueries };
  } catch {
    return { profile: DEFAULT_PROFILE, styles: DEFAULT_STYLES, pageStructure: DEFAULT_PAGE_STRUCTURE, imageSearchQueries: [] };
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

Spatial Composition & Layout:
- Break the grid intentionally — asymmetry, overlap, diagonal flow, grid-breaking hero elements
- Generous negative space OR controlled density — match the aesthetic vision
- Sections breathe with py-20 to py-32 padding, never cramped
- Use max-w-7xl mx-auto containers but let hero elements break out
- Unexpected layouts that feel genuinely designed, not template-driven

Motion & Interaction:
- Orchestrated page load: staggered fade-in-up reveals using animation-delay create more delight than scattered animations
- Smooth CSS transitions (transition-all duration-300) on every interactive element
- Hover states that surprise: translate-y, shadow shifts, color transitions, scale changes on cards and buttons
- Extend Tailwind config inline with <script> to add custom keyframe animations via tailwind.config
- A sticky nav with backdrop-blur glass effect

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

ICONS — USE LUCIDE ICONS VIA CDN:
For all icons, use the Lucide icon library.

Setup — include BOTH of these in the HTML:
1. In <head>: <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
2. Right before </body>: <script>document.addEventListener('DOMContentLoaded', function() { lucide.createIcons(); });</script>

Usage: <i data-lucide="icon-name" class="w-6 h-6"></i>
Style with Tailwind classes for size and color: class="w-6 h-6 text-blue-500"

Common icon names: phone, mail, map-pin, star, check, check-circle, arrow-right, menu, x, heart, shield, clock, users, building-2, wrench, utensils, briefcase, globe, zap, award, trending-up, calendar, dollar-sign, thumbs-up, sparkles, home, camera, music, scissors, truck, leaf, sun, moon.

CRITICAL RULE — NO EMPTY ELEMENTS:
Every HTML element MUST contain real, visible content. Never output empty cards, paragraphs, headings, or testimonials. If you create 3 cards, all 3 must have full content. Before finishing, mentally scan every element and verify it has text content inside it.

Remember: you are capable of extraordinary creative work. Don't hold back — show what can truly be created when committing fully to a distinctive vision.`;

function buildVariationPrompt(
  profile: BusinessProfile,
  imageUrls: string[],
  stockImageUrls: string[],
  style: StyleSuggestion,
  pageStructure: string[]
): string {
  const originalImages =
    imageUrls.length > 0
      ? imageUrls.slice(0, 10).join("\n")
      : "(no images found on original site)";

  const stockImages =
    stockImageUrls.length > 0
      ? stockImageUrls.join("\n")
      : "(no stock images available)";

  const structureList = pageStructure
    .map((section, i) => `${i + 1}. ${section}`)
    .join("\n");

  return `You are redesigning a real business website. This will be shown to the business owner to convince them to hire a web developer. It MUST look dramatically better than their current site — so impressive they feel they need it immediately.

Business Profile:
- Business Name: ${profile.businessName}
- Industry: ${profile.industry}
- What They Do: ${profile.whatTheyDo}
- Target Customer: ${profile.targetCustomer}
- Key Selling Points: ${profile.keySellingPoints.join(", ")}
- Brand Tone: ${profile.brandTone}
- Location: ${profile.location}

Design Style: ${style.styleName}
Style Direction:
${style.styleBrief}

ORIGINAL IMAGES (from the business's current website — use these for authenticity):
${originalImages}

STOCK IMAGES (high-quality professional photos relevant to this business — use these to elevate the design):
${stockImages}

Image Usage Strategy:
- HERO SECTION: ALWAYS use a STOCK image for the hero/banner — stock images are guaranteed high-resolution (1880px wide) and landscape-oriented, perfect for hero backgrounds. Never use an original website image as the hero background — they are often too small or wrong aspect ratio.
- Use ORIGINAL images for: logos, team photos, real product shots, storefront photos — smaller placements where authenticity matters
- Use STOCK images for: hero backgrounds, section backgrounds, decorative lifestyle shots, about section imagery — anywhere you need a large, high-quality visual
- Original images may be low-resolution — only use them at small sizes (cards, thumbnails, team grids), never as full-width backgrounds
- Mix both sets naturally throughout the page — don't cluster all stock images in one place
- Every image must use object-cover, rounded corners, and proper aspect ratios
- If a section needs an image but neither set has a good fit, use a CSS gradient or textured background instead

ORIGINAL PAGE STRUCTURE — follow this structure closely:
The original website has these sections. Your redesign must include upgraded versions of each of these, in a similar order. Don't invent sections that don't relate to this business. Instead, take what they already have and make each section dramatically more beautiful and polished.

${structureList}

For each section above:
- Keep the same type of content (if they have a menu, redesign the menu — don't replace it with generic "services cards")
- Enhance it with better layout, typography, spacing, and visual hierarchy
- Add any obviously missing essentials (if they have no clear CTA, add one; if they have no footer, add a proper one)
- You may split a dense section into two cleaner sections, or combine thin sections — use your design judgment
- Rewrite headlines and copy to be more compelling, but keep the same meaning and facts

CONTENT COMPLETENESS — MANDATORY:
- Every card, testimonial, feature block, or repeated element MUST be fully populated with real text content
- If you create a grid of 3 cards, ALL 3 must have a heading, description, and any visual element — zero empty cards
- If you create testimonials, EVERY one must have: a realistic quote (2-3 sentences), a full name, a job title, and a company name
- If you create a stats section, EVERY stat must have a number and a label
- Do NOT create placeholder or skeleton elements — if you can't fill it, don't create it
- Before completing your response, verify: does every visible HTML element contain actual text content? If not, fix it.

Critical Design Rules:
- Load Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
- Use Lucide icons via <i data-lucide="name"> tags — NEVER use emoji characters as icons
- Extend Tailwind config inline with <script> to add custom keyframe animations (fadeInUp, fadeIn, etc.) via tailwind.config
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
- Add orchestrated page-load animations: staggered fade-in-up reveals with animation-delay on hero elements and section content
- Create visual depth: use background textures (subtle noise/grain via CSS), layered transparencies, and atmospheric gradients — not flat solid-color sections
- The design must feel like it was hand-crafted by a senior designer for this specific business, not generated from a template
- Return ONLY the complete HTML document starting with <!DOCTYPE html> — absolutely nothing else`;
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
  pageStructure: string[]
): Promise<string> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 12000,
    system: VARIATION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildVariationPrompt(profile, imageUrls, stockImageUrls, style, pageStructure),
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  return extractHtml(textBlock.text);
}
