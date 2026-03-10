import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostBySlug, getAllSlugs } from "@/lib/blog";
import AuthButton from "@/components/auth-button";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};

  return {
    title: `${post.title} — PitchKit Blog`,
    description: post.description,
    keywords: post.tags,
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      publishedTime: post.date,
      authors: [post.author],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
    alternates: {
      canonical: `/blog/${slug}`,
    },
  };
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: {
      "@type": "Person",
      name: post.author,
    },
    publisher: {
      "@type": "Organization",
      name: "PitchKit",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${process.env.NEXT_PUBLIC_BASE_URL || "https://pitchkit.co"}/blog/${slug}`,
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
        <article className="max-w-2xl mx-auto">
          {/* Breadcrumb */}
          <nav className="mb-8" aria-label="Breadcrumb">
            <Link
              href="/blog"
              className="text-xs text-neutral-600 hover:text-accent transition-colors"
            >
              &larr; Back to blog
            </Link>
          </nav>

          {/* Header */}
          <header className="mb-10">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <time dateTime={post.date} className="text-xs text-neutral-600">
                {formatDate(post.date)}
              </time>
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] uppercase tracking-wider text-accent/70 bg-accent/5 border border-accent/10 px-2 py-0.5 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold text-white tracking-tight leading-tight">
              {post.title}
            </h1>
            <p className="mt-4 text-neutral-400 text-lg leading-relaxed">
              {post.description}
            </p>
          </header>

          {/* Content */}
          <div
            className="prose prose-invert prose-neutral max-w-none
              prose-headings:font-semibold prose-headings:tracking-tight
              prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:text-white
              prose-h3:text-lg prose-h3:mt-8 prose-h3:mb-3 prose-h3:text-white
              prose-p:text-neutral-400 prose-p:leading-relaxed
              prose-strong:text-white prose-strong:font-semibold
              prose-a:text-accent prose-a:no-underline hover:prose-a:underline
              prose-blockquote:border-accent/30 prose-blockquote:text-neutral-500 prose-blockquote:not-italic
              prose-li:text-neutral-400
              prose-ul:space-y-1
              prose-ol:space-y-1
              prose-hr:border-white/5"
            dangerouslySetInnerHTML={{ __html: post.contentHtml }}
          />

          {/* CTA */}
          <div className="mt-16 p-6 sm:p-8 rounded-2xl border border-white/5 bg-surface text-center">
            <h3 className="text-lg font-semibold text-white mb-2">
              Ready to land your next client?
            </h3>
            <p className="text-sm text-neutral-500 mb-6 max-w-md mx-auto">
              Generate AI-powered website redesigns and send shareable preview
              links. Start with free credits.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-black text-sm font-semibold hover:bg-accent/90 transition-colors"
            >
              Try PitchKit free
            </Link>
          </div>
        </article>
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
