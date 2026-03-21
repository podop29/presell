import { getAllPosts } from "@/lib/blog";

const HOMEPAGE_CONTENT = `## What is PitchKit?

Paste any website URL to generate an AI website redesign — or drop a Google Maps link to build a brand new site. Send it as a shareable preview to land your next web design client.

No credit card required — start with free credits.

## The Problem

Cold outreach for web design doesn't work when you have nothing to show.

- **Cold emails get ignored.** "I can build you a website" sounds like every other pitch in their inbox. Without proof, there's no reply.
- **Portfolios don't convert.** Your past work looks great — but it's someone else's brand. Prospects can't picture what you'd build for them.
- **Proposals take hours.** Spending 3 hours on a custom mockup for a prospect who might ghost you? Not a sustainable strategy.

## How It Works

1. **Paste a link.** Drop a website URL to redesign an existing site, or a Google Maps link to build a new one.
2. **Pick a direction.** Choose from 3 styles tailored to the business. Refine with AI revisions or edit text directly.
3. **Send and close.** Get a shareable preview link and an auto-generated cold email — ready to send.

## Features

- **AI business analysis** — Understands their industry, customers, and brand tone automatically.
- **Google Maps to website** — No website? Build one from their Maps listing, photos, and reviews.
- **3 style directions** — Three unique designs tailored to the business — never generic templates.
- **Real content, not lorem ipsum** — Uses their actual copy, images, and details.
- **Shareable preview links** — One URL with your contact info built in. Send it and let the work talk.
- **Auto-generated cold email** — A ready-to-send outreach email personalized to the prospect.
- **AI revisions + text editing** — Refine with AI revisions or edit text directly before sending.
- **30-day hosted previews** — Links stay live for a month. Plenty of time to follow up.

## Who It's For

### Freelancers
- Prospect local businesses — redesign their site or build one from their Google Maps listing
- Skip the free consultation — let the preview do the talking
- Stand out from every other "I build websites" DM in their inbox

### Agencies
- Scale outbound without burning designer hours — target businesses with or without websites
- Send personalized previews to dozens of prospects per week
- Arm your sales team with auto-generated cold emails and shareable preview links

## FAQ

**What does the prospect actually see?**
They get a clean, shareable preview page with the redesigned (or brand new) website, your name, contact info, and a way to reach out. No login required on their end.

**Do I need to know how to code?**
Not at all. PitchKit generates full websites from a URL or Google Maps link — no coding, no Figma, no templates. If you can paste a link, you can use PitchKit.

**What's the difference between a URL and a Google Maps link?**
Paste a website URL to generate a modern redesign of their existing site. Paste a Google Maps link for businesses with no website — PitchKit will build them one from scratch using their business info, photos, and reviews.

**How long do preview links stay live?**
Every preview is hosted for 30 days. That gives you plenty of time to follow up, send reminders, and close the deal.

**How much does it cost?**
You get free credits to start. Each generation costs one credit. No subscriptions, no monthly fees — just pay for what you use.

**Can I customize the design before sending it?**
You choose from 3 AI-generated style directions, each tailored to the prospect's brand. After generating, you can refine the design with AI-powered revisions or edit text directly.`;

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://pitchkit.co";
  const posts = getAllPosts();

  const sections = posts.map((post) => {
    return [
      `# ${post.title}`,
      "",
      `> ${post.description}`,
      "",
      `Date: ${post.date}`,
      `Author: ${post.author}`,
      `Tags: ${post.tags.join(", ")}`,
      `URL: ${baseUrl}/blog/${post.slug}`,
      "",
      post.content,
    ].join("\n");
  });

  const body = [
    "# PitchKit — AI Website Redesign Tool for Freelancers & Agencies",
    "",
    "> Generate AI-powered website redesigns and send shareable preview links to land web design clients. The cold outreach tool built for freelancers and agencies.",
    "",
    `URL: ${baseUrl}`,
    "",
    "---",
    "",
    HOMEPAGE_CONTENT,
    "",
    "---",
    "",
    "# Blog",
    "",
    sections.join("\n\n---\n\n"),
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
