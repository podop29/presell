import Anthropic from "@anthropic-ai/sdk";
import type { ScrapedData } from "@/types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function generateRedesign(
  url: string,
  data: ScrapedData
): Promise<string> {
  const imageList =
    data.imageUrls.length > 0
      ? data.imageUrls.map((u) => `  - ${u}`).join("\n")
      : "  (no images found)";

  const userPrompt = `Redesign the following website as a beautiful, modern, single-page HTML file using Tailwind CSS loaded from CDN.

Website Info:
- Title: ${data.title}
- URL: ${url}
- Description: ${data.description}
- Content: ${data.content.slice(0, 3000)}
- Images available at these URLs:
${imageList}

Requirements:
- Use Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
- Keep ALL the original content and information — just redesign the visual presentation
- Use the original images where possible (reference them by their full URL)
- Modern, clean design with good typography and whitespace
- Mobile responsive
- Include a hero section, clear navigation, and well-organized content sections
- Use a professional color scheme — default to blue/slate if no brand colors are obvious
- Return ONLY the complete HTML document, nothing else`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    system:
      "You are an expert web designer and frontend developer. You create stunning, modern website redesigns using HTML and Tailwind CSS (via CDN). Your redesigns are clean, professional, mobile-responsive, and conversion-focused. You only return complete, valid HTML — no explanation, no markdown, no code fences. Just raw HTML.",
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  let html = textBlock.text.trim();

  // Strip markdown code fences if Claude wrapped the response
  if (html.startsWith("```")) {
    html = html.replace(/^```(?:html)?\n?/, "").replace(/\n?```$/, "");
  }

  return html;
}
