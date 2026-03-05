"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthButton from "@/components/auth-button";

/* ───── tiny icon components ───── */
function ArrowRight({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
function Sparkles({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
    </svg>
  );
}
function Globe({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  );
}
function Zap({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
function Send({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
function Check({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function Mail({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7l-10 7L2 7" />
    </svg>
  );
}
function Clock({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function ChevronDown({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
function FileText({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}
function User({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4-4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function Building({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" /><line x1="9" y1="6" x2="9" y2="6.01" /><line x1="15" y1="6" x2="15" y2="6.01" /><line x1="9" y1="10" x2="9" y2="10.01" /><line x1="15" y1="10" x2="15" y2="10.01" /><line x1="9" y1="14" x2="9" y2="14.01" /><line x1="15" y1="14" x2="15" y2="14.01" /><line x1="9" y1="18" x2="15" y2="18" />
    </svg>
  );
}

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
    a: "You get free credits to start. Each generation costs one credit. No subscriptions, no monthly fees — just pay for what you use.",
  },
  {
    q: "Can I customize the design before sending it?",
    a: "You choose from 3 AI-generated style directions, each tailored to the prospect's brand. After generating, you can refine the design with AI-powered revisions or edit text directly.",
  },
];

/* ───── Main component ───── */
function MapPin({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function isGoogleMapsUrl(input: string): boolean {
  const lower = input.toLowerCase();
  return (
    lower.includes("google.com/maps") ||
    lower.includes("maps.google.") ||
    lower.includes("maps.app.goo.gl") ||
    lower.includes("goo.gl/maps")
  );
}

export default function Home() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const isMaps = isGoogleMapsUrl(url);

  function handleAnalyze() {
    setError("");
    if (!url) { setError("Please enter a URL."); return; }
    if (isMaps) {
      router.push(`/create?mapsUrl=${encodeURIComponent(url)}`);
    } else {
      router.push(`/create?url=${encodeURIComponent(url)}`);
    }
  }

  /* reusable URL input block — stored as JSX, not a component,
     so React doesn't remount (and lose focus) on every keystroke */
  const urlInput = (
    <>
      <div className="relative group max-w-xl mx-auto">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/30 via-accent/10 to-accent/30 rounded-2xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative flex items-center bg-surface border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="pl-4 text-neutral-600 transition-colors duration-200">
            {isMaps ? <MapPin className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
          </div>
          <input
            type="url"
            placeholder="Website URL or Google Maps link"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            className="flex-1 px-4 py-4 bg-transparent text-white text-base placeholder:text-neutral-600 focus:outline-none font-mono"
          />
          <button
            onClick={handleAnalyze}
            className="m-1.5 px-5 py-2.5 bg-accent hover:bg-accent-light text-black font-semibold text-sm rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-accent/20 flex items-center gap-2 shrink-0"
          >
            <span>{isMaps ? "Create" : "Analyze"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {isMaps && (
        <p className="mt-2 max-w-xl mx-auto text-xs text-accent/60 flex items-center justify-center gap-1.5">
          <MapPin className="w-3 h-3" />
          Google Maps link detected — we&apos;ll create a new website
        </p>
      )}
      {error && (
        <div className="mt-4 max-w-xl mx-auto p-3 bg-red-500/5 border border-red-500/20 rounded-xl text-red-400 text-xs">
          {error}
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen">
      {/* ═══════ NAV ═══════ */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-sm font-semibold tracking-tight text-white">
            pitchkit<span className="text-accent">.</span>
          </span>
          <div className="flex items-center gap-6">
            <a href="#how" className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors hidden sm:block">How it works</a>
            <a href="#features" className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors hidden sm:block">Features</a>
            <a href="#faq" className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors hidden sm:block">FAQ</a>
            <AuthButton />
          </div>
        </div>
      </nav>

      {/* ═══════ HERO ═══════ */}
      <section className="relative pt-32 pb-20 px-6 noise-bg overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-accent/8 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-40 left-1/4 w-[300px] h-[300px] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none animate-float" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="animate-fade-in-up inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/20 bg-accent/5 mb-8">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span className="text-xs font-medium text-accent">The presale tool for web professionals</span>
          </div>

          <h1 className="animate-fade-in-up delay-100 text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.05]">
            <span className="text-white">Show the website.</span>
            <br />
            <span className="text-gradient">Close the client.</span>
          </h1>

          <p className="animate-fade-in-up delay-200 mt-6 text-lg sm:text-xl text-neutral-400 max-w-2xl mx-auto leading-relaxed">
            Paste any website URL to generate a stunning redesign — or drop a Google Maps
            link to build a brand new site from scratch. Send it as a shareable preview to land the deal.
          </p>

          {/* ─── URL INPUT ─── */}
          <div className="animate-fade-in-up delay-300 mt-12">
            {urlInput}
            <p className="mt-3 text-xs text-neutral-600 text-center">
              No credit card required — start with free credits
            </p>
          </div>
        </div>
      </section>

      

      {/* ═══════ HOW IT WORKS ═══════ */}
      <section id="how" className="relative py-24 px-6 border-t border-white/5 noise-bg">
        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-medium text-accent uppercase tracking-wider mb-3">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Three steps to your next client</h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                icon: <Globe className="w-5 h-5" />,
                step: "01",
                title: "Paste a link",
                desc: "Drop a website URL to redesign an existing site, or a Google Maps link to build a new one. Our AI analyzes the business, content, and photos automatically.",
              },
              {
                icon: <Sparkles className="w-5 h-5" />,
                step: "02",
                title: "Pick a design direction",
                desc: "Choose from 3 AI-generated styles, each tailored to the business. Refine with AI revisions or edit text directly until it's perfect.",
              },
              {
                icon: <Send className="w-5 h-5" />,
                step: "03",
                title: "Send and close",
                desc: "Get a shareable preview link with your contact info and an auto-generated cold email — ready to send and start the conversation.",
              },
            ].map((item, i) => (
              <div
                key={item.step}
                className={`group relative p-6 rounded-2xl border border-[var(--border)] bg-surface hover:border-[var(--border-light)] transition-all duration-300 hover:-translate-y-1 animate-fade-in-up delay-${(i + 1) * 100}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent/15 transition-colors">
                    {item.icon}
                  </div>
                  <span className="text-xs font-mono text-neutral-700">{item.step}</span>
                </div>
                <h3 className="text-white font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ PROBLEM ═══════ */}
      <section className="relative py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-medium text-accent uppercase tracking-wider mb-3">The problem</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Cold outreach doesn&apos;t work<br className="hidden sm:block" /> when you have nothing to show
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                icon: <Mail className="w-5 h-5" />,
                title: "Cold emails get ignored",
                desc: "\"I can build you a website\" sounds like every other pitch in their inbox. Without proof, there's no reply.",
              },
              {
                icon: <FileText className="w-5 h-5" />,
                title: "Portfolios don't convert",
                desc: "Your past work looks great — but it's someone else's brand. Prospects can't picture what you'd build for them.",
              },
              {
                icon: <Clock className="w-5 h-5" />,
                title: "Proposals take hours",
                desc: "Spending 3 hours on a custom mockup for a prospect who might ghost you? Not a sustainable strategy.",
              },
            ].map((item) => (
              <div key={item.title} className="relative p-6 rounded-2xl border border-[var(--border)] bg-surface">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 mb-4">
                  {item.icon}
                </div>
                <h3 className="text-white font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <p className="text-center mt-12 text-neutral-400 text-lg">
            What if you could <span className="text-white font-medium">show them the result</span> before doing any work?
          </p>
        </div>
      </section>

      {/* ═══════ FEATURES ═══════ */}
      <section id="features" className="relative py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-medium text-accent uppercase tracking-wider mb-3">Features</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Everything you need to close</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: <Zap className="w-4 h-4" />,
                title: "AI business analysis",
                desc: "Understands their industry, customers, and brand tone — whether from their website or Google Maps listing.",
              },
              {
                icon: <MapPin className="w-4 h-4" />,
                title: "Google Maps to website",
                desc: "Businesses with no website? Paste their Maps link and PitchKit builds a complete site from their listing, photos, and reviews.",
              },
              {
                icon: <Sparkles className="w-4 h-4" />,
                title: "3 style directions",
                desc: "Choose from 3 unique design directions tailored to the business — never generic templates.",
              },
              {
                icon: <Check className="w-4 h-4" />,
                title: "Real content, not lorem ipsum",
                desc: "Uses their actual copy, images, and details — so the preview feels like a real project.",
              },
              {
                icon: <Send className="w-4 h-4" />,
                title: "Shareable preview links",
                desc: "One URL with your contact info built right in. Send it and let the work speak for itself.",
              },
              {
                icon: <Mail className="w-4 h-4" />,
                title: "Auto-generated cold email",
                desc: "Get a ready-to-send outreach email personalized to the prospect and their business.",
              },
              {
                icon: <Globe className="w-4 h-4" />,
                title: "AI revisions + text editing",
                desc: "Refine the design with AI-powered revisions or edit text directly — get it perfect before sending.",
              },
              {
                icon: <Clock className="w-4 h-4" />,
                title: "30-day hosted previews",
                desc: "Links stay live for a month. Plenty of time to follow up and close.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-4 p-5 rounded-xl border border-[var(--border)] bg-surface/50 hover:border-[var(--border-light)] transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0 mt-0.5">
                  {item.icon}
                </div>
                <div>
                  <h3 className="text-white font-medium text-sm">{item.title}</h3>
                  <p className="text-xs text-neutral-500 mt-1 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ WHO IT'S FOR ═══════ */}
      <section className="relative py-24 px-6 border-t border-white/5 noise-bg">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-medium text-accent uppercase tracking-wider mb-3">Who it&apos;s for</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Built for people who sell websites</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {/* Freelancers */}
            <div className="p-8 rounded-2xl border border-[var(--border)] bg-surface">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-5">
                <User className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Freelancers</h3>
              <ul className="space-y-3">
                {[
                  "Prospect local businesses — redesign their site or build one from their Google Maps listing",
                  "Skip the free consultation — let the preview do the talking",
                  "Stand out from every other \"I build websites\" DM in their inbox",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-neutral-400">
                    <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Agencies */}
            <div className="p-8 rounded-2xl border border-[var(--border)] bg-surface">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-5">
                <Building className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Agencies</h3>
              <ul className="space-y-3">
                {[
                  "Scale outbound without burning designer hours — target businesses with or without websites",
                  "Send personalized previews to dozens of prospects per week",
                  "Arm your sales team with auto-generated cold emails and shareable preview links",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-neutral-400">
                    <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ FAQ ═══════ */}
      <section id="faq" className="relative py-24 px-6 border-t border-white/5">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-medium text-accent uppercase tracking-wider mb-3">FAQ</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Common questions</h2>
          </div>

          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-[var(--border)] rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <span className="text-sm font-medium text-white pr-4">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-neutral-500 shrink-0 transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 -mt-1">
                    <p className="text-sm text-neutral-400 leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ BOTTOM CTA ═══════ */}
      <section className="relative py-24 px-6 border-t border-white/5 noise-bg overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[500px] h-[300px] bg-accent/5 rounded-full blur-[100px]" />
        </div>
        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Stop pitching. Start showing.
          </h2>
          <p className="text-neutral-500 mb-10 max-w-lg mx-auto">
            Your next client is one preview away. Paste their URL or Google Maps link and let the work speak for itself.
          </p>
          {urlInput}
          <p className="mt-3 text-xs text-neutral-600 text-center">
            No credit card required — start with free credits
          </p>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm font-semibold tracking-tight text-neutral-600">
            pitchkit<span className="text-accent/50">.</span>
          </span>
          <p className="text-xs text-neutral-700">
            Built for freelancers and agencies who let their work do the talking.
          </p>
        </div>
      </footer>
    </div>
  );
}
