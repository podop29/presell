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
    styleName: "Clean & Minimal",
    styleBrief:
      "White background, generous whitespace, light gray sections, Inter font, black CTA buttons, subtle shadows, premium minimalist feel.",
  },
  {
    styleName: "Bold & Modern",
    styleBrief:
      "High contrast, vivid blue accent, oversized hero text, Plus Jakarta Sans font, gradient CTAs, energetic and confident feel.",
  },
  {
    styleName: "Dark & Sleek",
    styleBrief:
      "Near-black background, light text, electric blue accent with glow effects, Outfit font, premium futuristic feel.",
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
      system: `You are a sharp brand strategist and creative director. You analyze websites and propose redesign directions.

You always respond with valid JSON only — no explanation, no markdown, no code fences.`,
      messages: [
        {
          role: "user",
          content: `Analyze this website and return a JSON object with three top-level keys: "profile", "styles", and "pageStructure".

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

"styles" must be an array of exactly 3 objects. Each object has:
{
  "styleName": "string — a short, catchy name for this design direction (3-5 words, like 'Warm & Inviting' or 'Sleek Tech Forward')",
  "styleBrief": "string — a detailed 150-250 word design brief covering: color palette (specific hex codes), typography (specific Google Font name), overall mood, hero section approach, card/component style, CTA button style, and what real-world brand or website aesthetic this should channel"
}

Rules for generating the 3 styles:
- Each style must feel dramatically different from the others — vary color palette, mood, typography, and layout approach
- Tailor every style to this specific business and industry — a law firm should never get the same styles as a surf shop
- One style should lean sophisticated/premium, one should feel energetic/bold, and one should be a creative wildcard that feels unexpected but appropriate
- Reference specific colors (hex codes), specific Google Fonts by name, and specific design techniques (gradients, glassmorphism, large typography, etc.)
- The briefs should be opinionated and specific, not vague — say "use #1e3a5f navy with #f4a261 warm amber accents" not "use professional colors"

Website Title: ${data.title}
Website URL: ${url}
Meta Description: ${data.description}
Page Content: ${data.content.slice(0, 3000)}`,
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { profile: DEFAULT_PROFILE, styles: DEFAULT_STYLES, pageStructure: DEFAULT_PAGE_STRUCTURE };
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

    return { profile, styles, pageStructure };
  } catch {
    return { profile: DEFAULT_PROFILE, styles: DEFAULT_STYLES, pageStructure: DEFAULT_PAGE_STRUCTURE };
  }
}

const VARIATION_SYSTEM_PROMPT = `You are a world-class web designer who has won multiple Awwwards and CSS Design Awards. You create breathtaking, visually stunning website redesigns that make clients say "wow" instantly. Your designs rival the best agency work — think Apple, Stripe, Linear, and Vercel-level quality.

You use HTML and Tailwind CSS via CDN. You only return complete, valid HTML — no explanation, no markdown, no code fences. The HTML must start with <!DOCTYPE html>.

Your design signatures:
- Dramatic visual hierarchy with oversized hero text (text-5xl to text-7xl) and delicate body text
- Smooth CSS transitions and hover animations on every interactive element
- Tailwind CSS extended with a <script> block to add custom animations (fadeIn, slideUp, float) via tailwind.config
- Strategic use of gradients, not flat single colors
- Cards that feel elevated with layered shadows, border highlights, and hover transforms
- Testimonial sections that feel premium — not generic quote blocks
- CTAs that demand attention with size, color contrast, and hover effects
- Images styled with rounded corners, subtle shadows, and overflow-hidden containers
- Sections that breathe with py-20 to py-32 padding, never cramped
- A sticky nav that has a backdrop-blur glass effect
- Footer that feels intentionally designed, not an afterthought

CRITICAL RULE — NO EMPTY ELEMENTS:
Every single HTML element you generate MUST contain real, visible content. Never output an empty card, empty paragraph, empty heading, empty testimonial, or any element that would appear blank on screen. If you create 3 cards, all 3 must have full content. If you create 3 testimonials, all 3 must have a quote, a name, and a role. Before finishing, mentally scan every element and verify it has text content inside it.`;

function buildVariationPrompt(
  profile: BusinessProfile,
  imageUrls: string[],
  style: StyleSuggestion,
  pageStructure: string[]
): string {
  const images =
    imageUrls.length > 0
      ? imageUrls.slice(0, 10).join("\n")
      : "(no images found)";

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

Original Images (use these URLs directly in img tags — make them look stunning):
${images}

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
- Add subtle CSS animations for the hero content (fade-in-up on load using @keyframes in a <style> tag)
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
  style: StyleSuggestion,
  pageStructure: string[]
): Promise<string> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    system: VARIATION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildVariationPrompt(profile, imageUrls, style, pageStructure),
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  return extractHtml(textBlock.text);
}
