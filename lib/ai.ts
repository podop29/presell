import Anthropic from "@anthropic-ai/sdk";
import type { ScrapedData, BusinessProfile } from "@/types";

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

// Pass 1 — Business Analysis
export async function analyzeBusinessContent(
  url: string,
  data: ScrapedData
): Promise<BusinessProfile> {
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system:
        "You are a sharp brand strategist. Analyze website content and extract key business information. Always respond with valid JSON only — no explanation, no markdown, no code fences.",
      messages: [
        {
          role: "user",
          content: `Analyze this website content and return a JSON object with exactly these fields:
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

Website Title: ${data.title}
Website URL: ${url}
Meta Description: ${data.description}
Page Content: ${data.content.slice(0, 3000)}`,
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return DEFAULT_PROFILE;
    }

    let jsonStr = textBlock.text.trim();
    // Strip markdown code fences if present
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonStr);
    return {
      businessName: parsed.businessName || DEFAULT_PROFILE.businessName,
      industry: parsed.industry || DEFAULT_PROFILE.industry,
      whatTheyDo: parsed.whatTheyDo || DEFAULT_PROFILE.whatTheyDo,
      targetCustomer: parsed.targetCustomer || DEFAULT_PROFILE.targetCustomer,
      keySellingPoints:
        Array.isArray(parsed.keySellingPoints) && parsed.keySellingPoints.length > 0
          ? parsed.keySellingPoints
          : DEFAULT_PROFILE.keySellingPoints,
      brandTone: parsed.brandTone || DEFAULT_PROFILE.brandTone,
      primaryColors: parsed.primaryColors || DEFAULT_PROFILE.primaryColors,
      location: parsed.location || DEFAULT_PROFILE.location,
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

const VARIATION_SYSTEM_PROMPT =
  "You are an expert web designer and frontend developer. You create stunning, modern website redesigns using HTML and Tailwind CSS via CDN. You only return complete, valid HTML — no explanation, no markdown, no code fences. The HTML must start with <!DOCTYPE html>.";

interface VariationConfig {
  styleName: string;
  styleBrief: string;
}

const VARIATIONS: VariationConfig[] = [
  {
    styleName: "Clean & Minimal",
    styleBrief:
      "Pure white background, generous whitespace, light gray accent sections, subtle thin borders, professional sans-serif font (use Inter). Cards have very light shadows. CTA button is solid black with white text. The design should feel like a premium boutique or modern consultancy.",
  },
  {
    styleName: "Bold & Modern",
    styleBrief:
      "High contrast design with a vivid accent color (choose based on industry — blue for tech/finance, green for health/food, orange for trades/construction, purple for creative). Large oversized hero text, bold section headers, full-bleed colored sections. Font should feel strong (use Plus Jakarta Sans). CTA button uses the accent color. The design should feel energetic and confident.",
  },
  {
    styleName: "Dark & Sleek",
    styleBrief:
      "Near-black background (#0f0f0f), light text, bright single accent color (electric blue #3b82f6 or emerald #10b981 — pick what fits the industry). Cards have subtle borders and a slight glow effect. Font should feel premium (use Outfit). CTA button uses the accent color with a glow shadow. The design should feel like a high-end SaaS or luxury service brand.",
  },
];

function buildVariationPrompt(
  profile: BusinessProfile,
  imageUrls: string[],
  config: VariationConfig
): string {
  const images =
    imageUrls.length > 0
      ? imageUrls.slice(0, 10).join("\n")
      : "(no images found)";

  return `Redesign this website as a beautiful, modern, single-page HTML file.

Business Profile:
- Business Name: ${profile.businessName}
- Industry: ${profile.industry}
- What They Do: ${profile.whatTheyDo}
- Target Customer: ${profile.targetCustomer}
- Key Selling Points: ${profile.keySellingPoints.join(", ")}
- Brand Tone: ${profile.brandTone}
- Location: ${profile.location}

Design Style: ${config.styleName}
Style Direction: ${config.styleBrief}

Original Images (use these URLs directly in img tags):
${images}

Page Structure Requirements — include ALL of these sections in this order:
1. Sticky navigation bar with business name/logo on the left and 3-4 nav links on the right
2. Full-width hero section with a rewritten compelling headline, subheadline describing what they do, and a prominent CTA button
3. Services or features section — 3 cards in a responsive grid
4. About or trust section with a paragraph of text and an image
5. Social proof section — 2-3 realistic testimonials with names and roles (invent these if none exist on the original site)
6. Contact section with any available phone/email/address, plus a simple contact CTA button
7. Footer with business name, nav links, and copyright

Design Rules:
- Load Tailwind CSS via CDN only: <script src='https://cdn.tailwindcss.com'></script>
- Load a Google Font via @import in a <style> tag (pick one that fits the style)
- Use the real content from the business profile — never use Lorem Ipsum
- Use the original image URLs in img tags wherever they fit naturally
- Alternate section background colors for visual rhythm
- Every section must have generous padding (py-16 or more)
- The design must be fully mobile responsive
- Buttons must have hover states
- Return ONLY the complete HTML document starting with <!DOCTYPE html> — nothing else`;
}

function extractHtml(text: string): string {
  let html = text.trim();
  if (html.startsWith("```")) {
    html = html.replace(/^```(?:html)?\n?/, "").replace(/\n?```$/, "");
  }
  return html;
}

// Pass 2 — Generate 3 Variations in Parallel
export async function generateVariations(
  profile: BusinessProfile,
  imageUrls: string[]
): Promise<{ a: string; b: string; c: string }> {
  const results = await Promise.all(
    VARIATIONS.map(async (config) => {
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        system: VARIATION_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: buildVariationPrompt(profile, imageUrls, config),
          },
        ],
      });

      const textBlock = message.content.find((block) => block.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        throw new Error("No text response from Claude");
      }

      return extractHtml(textBlock.text);
    })
  );

  return { a: results[0], b: results[1], c: results[2] };
}
