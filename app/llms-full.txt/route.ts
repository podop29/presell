import { getAllPosts } from "@/lib/blog";

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
    "# PitchKit — Blog",
    "",
    "> AI-powered website redesign tool for freelancers and agencies.",
    "",
    "---",
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
