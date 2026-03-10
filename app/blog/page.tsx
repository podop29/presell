import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/blog";
import AuthButton from "@/components/auth-button";

export const metadata: Metadata = {
  title: "Blog — PitchKit | Web Design Tips, Cold Outreach & Freelancing",
  description:
    "Actionable tips on landing web design clients, cold outreach strategies, freelance pricing, and using AI tools to grow your web design business.",
  keywords: [
    "web design blog",
    "freelance web design tips",
    "cold outreach for web designers",
    "website redesign tips",
    "freelancer client acquisition",
    "web design business",
  ],
  openGraph: {
    type: "website",
    title: "Blog — PitchKit",
    description:
      "Actionable tips on landing web design clients, cold outreach, and growing your freelance business.",
  },
  alternates: {
    canonical: "/blog",
  },
};

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogPage() {
  const posts = getAllPosts();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "PitchKit Blog",
    description:
      "Tips on landing web design clients, cold outreach, and freelancing.",
    url: `${process.env.NEXT_PUBLIC_BASE_URL || "https://pitchkit.co"}/blog`,
    publisher: {
      "@type": "Organization",
      name: "PitchKit",
    },
  };

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Nav */}
      <nav
        aria-label="Main navigation"
        className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl"
      >
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm font-semibold tracking-tight text-white"
          >
            pitchkit<span className="text-accent">.</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/blog"
              className="text-xs text-neutral-300 hover:text-white transition-colors"
            >
              Blog
            </Link>
            <AuthButton />
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-14">
            <p className="text-xs font-medium text-accent uppercase tracking-wider mb-3">
              Blog
            </p>
            <h1 className="text-3xl sm:text-5xl font-bold text-white tracking-tight">
              Insights for freelancers & agencies
            </h1>
            <p className="mt-4 text-neutral-400 text-lg max-w-xl">
              Strategies for landing web design clients, cold outreach that
              works, and tips to grow your business.
            </p>
          </div>

          {/* Posts */}
          <div className="space-y-0 divide-y divide-white/5">
            {posts.map((post) => (
              <article key={post.slug} className="py-8 first:pt-0">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <time
                    dateTime={post.date}
                    className="text-xs text-neutral-600"
                  >
                    {formatDate(post.date)}
                  </time>
                  {post.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] uppercase tracking-wider text-accent/70 bg-accent/5 border border-accent/10 px-2 py-0.5 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <Link href={`/blog/${post.slug}`} className="group block">
                  <h2 className="text-lg sm:text-xl font-semibold text-white group-hover:text-accent transition-colors leading-snug">
                    {post.title}
                  </h2>
                  <p className="mt-2 text-sm text-neutral-500 leading-relaxed line-clamp-2">
                    {post.description}
                  </p>
                  <span className="inline-block mt-3 text-xs font-medium text-accent group-hover:underline">
                    Read article
                  </span>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link
            href="/"
            className="text-sm font-semibold tracking-tight text-neutral-600"
          >
            pitchkit<span className="text-accent/50">.</span>
          </Link>
          <p className="text-xs text-neutral-700">
            Built for freelancers and agencies who let their work do the
            talking.
          </p>
        </div>
      </footer>
    </div>
  );
}
