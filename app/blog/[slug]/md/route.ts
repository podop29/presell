import { getPostBySlug, getAllSlugs } from "@/lib/blog";

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return new Response("Not found", { status: 404 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://pitchkit.co";

  const body = [
    `# ${post.title}`,
    "",
    `> ${post.description}`,
    "",
    `Date: ${post.date}`,
    `Author: ${post.author}`,
    `Tags: ${post.tags.join(", ")}`,
    `URL: ${baseUrl}/blog/${slug}`,
    "",
    "---",
    "",
    post.content,
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
