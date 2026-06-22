import type { Metadata } from "next";
import AuthButton from "@/components/auth-button";
import UrlInput from "@/components/url-input";
import FaqAccordion from "@/components/faq-accordion";
import ExamplesGallery from "@/components/examples-gallery";
import LiveCounter from "@/components/live-counter";

/* ───── SEO metadata ───── */
export const metadata: Metadata = {
  title: "PitchKit — AI Website Redesign Tool for Freelancers & Agencies",
  description:
    "Generate AI-powered website redesigns and send shareable preview links to land web design clients. The cold outreach tool built for freelancers and agencies.",
  keywords: [
    "AI website redesign",
    "freelancer cold outreach",
    "web design client acquisition",
    "website redesign tool",
    "cold email for web designers",
    "AI website generator",
    "presale website mockup",
    "freelance web design outreach",
    "agency lead generation",
    "Google Maps to website",
  ],
  openGraph: {
    type: "website",
    title: "PitchKit — AI Website Redesign Tool for Freelancers & Agencies",
    description:
      "Generate AI-powered website redesigns and send shareable preview links to land web design clients.",
    images: ["/opengraph-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "PitchKit — AI Website Redesign Tool for Freelancers & Agencies",
    description:
      "Generate AI-powered website redesigns and send shareable preview links to land web design clients.",
    images: ["/opengraph-image.png"],
  },
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
};

/* ───── FAQ data ───── */
const faqs = [
  {
    q: "What does the prospect actually see?",
    a: "They get a clean, shareable preview page with the redesigned (or brand new) website, your name, contact info, and a way to reach out. No login required on their end.",
  },
  {
    q: "Do I need to know how to code?",
    a: "Not at all. PitchKit generates full websites from a URL or Google Maps link — no coding, no Figma, no templates. If you can paste a link, you can use PitchKit.",
  },
  {
    q: "What's the difference between a URL and a Google Maps link?",
    a: "Paste a website URL to generate a modern redesign of their existing site. Paste a Google Maps link for businesses with no website — PitchKit will build them one from scratch using their business info, photos, and reviews.",
  },
  {
    q: "How long do preview links stay live?",
    a: "Every preview is hosted for 30 days. That gives you plenty of time to follow up, send reminders, and close the deal.",
  },
  {
    q: "How much does it cost?",
    a: "You start with a free credit. After that, each generation costs one credit and credits are sold in packs — no subscriptions, no monthly fees. You only pay for what you use.",
  },
  {
    q: "Can I customize the design before sending it?",
    a: "You choose from 3 AI-generated style directions, each tailored to the prospect's brand. After generating, you can refine the design with AI-powered revisions or edit text directly.",
  },
];

/* ───── Pricing data (source of truth: app/credits/page.tsx) ───── */
const packs = [
  { credits: 6, price: 3, label: "Try it" },
  { credits: 20, price: 12, label: "Starter" },
  { credits: 50, price: 25, label: "Popular", featured: true },
  { credits: 100, price: 39, label: "Pro" },
];

/* ───── JSON-LD structured data ───── */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "PitchKit",
  applicationCategory: "BusinessApplication",
  description:
    "AI website redesign tool for freelancers and agencies. Generate stunning website redesigns and send shareable preview links to land web design clients.",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Start with a free credit",
  },
};

/* ───── Page component ───── */
export default function Home() {
  return (
    <div className="min-h-screen">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ═══════ NAV ═══════ */}
      <nav aria-label="Main navigation" className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-sm font-semibold tracking-tight text-white">
            pitchkit<span className="text-accent">.</span>
          </span>
          <div className="flex items-center gap-6">
            <a href="#demo" className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors hidden sm:block">See it work</a>
            <a href="#how" className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors hidden sm:block">How it works</a>
            <a href="#pricing" className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors hidden sm:block">Pricing</a>
            <a href="#faq" className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors hidden sm:block">FAQ</a>
            <a href="/blog" className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors hidden sm:block">Blog</a>
            <AuthButton />
          </div>
        </div>
      </nav>

      <main>
        {/* ═══════ HERO ═══════ */}
        <section className="relative pt-28 sm:pt-36 pb-16 sm:pb-20 px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-[1.07] text-white">
              Win web design clients by
              <br className="hidden sm:block" /> showing them the work first
            </h1>

            <p className="mt-6 text-base sm:text-lg text-neutral-400 max-w-xl mx-auto leading-relaxed">
              PitchKit turns any website URL — or Google Maps listing — into a
              polished redesign you can send as a link. Cold outreach that opens
              with proof instead of a promise.
            </p>

            <div className="mt-10">
              <UrlInput />
              <LiveCounter />
            </div>
          </div>
        </section>

        {/* ═══════ REAL EXAMPLES ═══════ */}
        <section id="demo" className="relative py-16 sm:py-24 px-4 sm:px-6 border-t border-white/5">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-4xl font-bold text-white">Real redesigns, made with PitchKit</h2>
              <p className="mt-4 text-neutral-500 max-w-2xl mx-auto text-sm sm:text-base">
                Every one of these started as a single link. Click any to open the
                live preview — exactly what the prospect would see.
              </p>
            </div>
            <ExamplesGallery />
          </div>
        </section>

        {/* ═══════ HOW IT WORKS ═══════ */}
        <section id="how" className="relative py-16 sm:py-24 px-4 sm:px-6 border-t border-white/5">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-2xl sm:text-4xl font-bold text-white">Three steps to your next client</h2>
              <p className="mt-4 text-neutral-500 max-w-xl mx-auto text-sm sm:text-base">
                From a link to a ready-to-send pitch in under a minute.
              </p>
            </div>

            <div className="space-y-10 sm:space-y-0 sm:flex sm:items-start sm:gap-0">
              {[
                {
                  num: "1",
                  title: "Paste a link",
                  desc: "Drop a website URL to redesign an existing site, or a Google Maps link to build a new one from scratch.",
                },
                {
                  num: "2",
                  title: "Pick a direction",
                  desc: "Choose from 3 styles tailored to the business. Refine with AI revisions or edit the text directly.",
                },
                {
                  num: "3",
                  title: "Send and close",
                  desc: "Get a shareable preview link and a personalized cold email — branded with your name and ready to send.",
                },
              ].map((item, i) => (
                <div key={item.num} className="flex-1 relative text-center px-4">
                  {i < 2 && (
                    <div className="hidden sm:block absolute top-5 left-[calc(50%+28px)] w-[calc(100%-56px)] h-px bg-[var(--border)]" />
                  )}
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-accent/30 text-accent text-sm font-semibold mb-4">
                    {item.num}
                  </span>
                  <h3 className="text-white font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-neutral-500 leading-relaxed max-w-[240px] mx-auto">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ PRICING ═══════ */}
        <section id="pricing" className="relative py-16 sm:py-24 px-4 sm:px-6 border-t border-white/5">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-4xl font-bold text-white">Pay only for what you send</h2>
              <p className="mt-4 text-neutral-500 max-w-xl mx-auto text-sm sm:text-base">
                Start with a free credit — no card required. One credit generates one
                preview. No subscriptions, no monthly fees.
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {packs.map((pack) => (
                <div
                  key={pack.credits}
                  className={`relative p-6 rounded-2xl border bg-surface flex flex-col ${
                    pack.featured ? "border-accent/40" : "border-[var(--border)]"
                  }`}
                >
                  {pack.featured && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-accent text-black text-[10px] font-semibold uppercase tracking-wide">
                      Most popular
                    </span>
                  )}
                  <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">{pack.label}</p>
                  <p className="mt-3 text-3xl font-bold text-white">${pack.price}</p>
                  <p className="mt-1 text-sm text-neutral-400">{pack.credits} credits</p>
                  <p className="mt-1 text-xs text-neutral-600">{pack.credits} previews</p>
                </div>
              ))}
            </div>

            <p className="text-center mt-8 text-sm text-neutral-500">
              <a href="/signup" className="text-accent hover:text-accent-light transition-colors font-medium">
                Create a free account
              </a>{" "}
              and your first credit is on us.
            </p>
          </div>
        </section>

        {/* ═══════ FAQ ═══════ */}
        <section id="faq" className="relative py-16 sm:py-24 px-4 sm:px-6 border-t border-white/5">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-2xl sm:text-4xl font-bold text-white">Frequently asked questions</h2>
            </div>

            <FaqAccordion faqs={faqs} />
          </div>
        </section>

        {/* ═══════ BOTTOM CTA ═══════ */}
        <section className="relative py-16 sm:py-24 px-4 sm:px-6 border-t border-white/5">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl sm:text-4xl font-bold text-white mb-4">
              Your next client is one link away
            </h2>
            <p className="text-neutral-500 mb-10 max-w-lg mx-auto">
              Paste their website URL or Google Maps link and let the work do the pitching.
            </p>
            <UrlInput />
            <LiveCounter />
          </div>
        </section>
      </main>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm font-semibold tracking-tight text-neutral-600">
            pitchkit<span className="text-accent/50">.</span>
          </span>
          <div className="flex items-center gap-4">
            <a href="/blog" className="text-xs text-neutral-700 hover:text-neutral-500 transition-colors">Blog</a>
            <a href="mailto:stevangrubac@lakeview-webdev.com" className="text-xs text-neutral-700 hover:text-neutral-500 transition-colors">Support</a>
            <p className="text-xs text-neutral-700">
              Built for freelancers and agencies who let their work do the talking.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
