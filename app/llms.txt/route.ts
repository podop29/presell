import { getAllPosts } from "@/lib/blog";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://pitchkit.co";
  const posts = getAllPosts();

  const lines = [
    "# PitchKit",
    "",
    "> AI-powered website redesign tool for freelancers and agencies. Generate redesign previews and send shareable links to land web design clients through cold outreach.",
    "",
    "## Pages",
    "",
    `- [Homepage](${baseUrl}/md): Product overview, features, how it works, FAQ`,
    "",
    "## Blog Posts",
    "",
    ...posts.map(
      (post) =>
        `- [${post.title}](${baseUrl}/blog/${post.slug}/md): ${post.description}`
    ),
    "",
    `## Full Content`,
    "",
    `- [All content (full text)](${baseUrl}/llms-full.txt)`,
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
