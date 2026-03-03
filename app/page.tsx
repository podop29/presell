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

/* ───── Main component ───── */
export default function Home() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  function handleAnalyze() {
    setError("");
    if (!url) { setError("Please enter a website URL."); return; }
    router.push(`/create?url=${encodeURIComponent(url)}`);
  }

  return (
    <div className="min-h-screen">
      {/* ═══════ NAV ═══════ */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-sm font-semibold tracking-tight text-white">
            presell<span className="text-accent">.</span>
          </span>
          <div className="flex items-center gap-6">
            <a href="#how" className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors hidden sm:block">How it works</a>
            <a href="#features" className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors hidden sm:block">Features</a>
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
            <span className="text-xs font-medium text-accent">AI-powered website redesigns</span>
          </div>

          <h1 className="animate-fade-in-up delay-100 text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.05]">
            <span className="text-white">Turn ugly websites</span>
            <br />
            <span className="text-gradient">into signed clients</span>
          </h1>

          <p className="animate-fade-in-up delay-200 mt-6 text-lg sm:text-xl text-neutral-400 max-w-2xl mx-auto leading-relaxed">
            Paste any website URL. Get a stunning redesign in minutes. Send it as a preview link to land the deal — before you write a line of code.
          </p>

          {/* Stats row */}
          <div className="animate-fade-in-up delay-300 mt-10 flex items-center justify-center gap-8 sm:gap-12">
            {[
              ["2 min", "Average redesign time"],
              ["3 styles", "AI-tailored per site"],
              ["1 link", "To close the deal"],
            ].map(([stat, label]) => (
              <div key={stat} className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-white">{stat}</div>
                <div className="text-xs text-neutral-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* ─── URL INPUT ─── */}
          <div className="animate-fade-in-up delay-400 mt-14 max-w-xl mx-auto">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/30 via-accent/10 to-accent/30 rounded-2xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative flex items-center bg-surface border border-[var(--border)] rounded-xl overflow-hidden">
                <div className="pl-4 text-neutral-600">
                  <Globe className="w-5 h-5" />
                </div>
                <input
                  type="url"
                  placeholder="https://their-website.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                  className="flex-1 px-4 py-4 bg-transparent text-white text-base placeholder:text-neutral-600 focus:outline-none font-mono"
                />
                <button
                  onClick={handleAnalyze}
                  className="m-1.5 px-5 py-2.5 bg-accent hover:bg-accent-light text-black font-semibold text-sm rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-accent/20 flex items-center gap-2 shrink-0"
                >
                  <span>Analyze</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <p className="mt-3 text-xs text-neutral-600 text-center">
              Paste any live website URL and we&apos;ll do the rest
            </p>

            {error && (
              <div className="mt-4 p-3 bg-red-500/5 border border-red-500/20 rounded-xl text-red-400 text-xs">
                {error}
              </div>
            )}
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
                title: "Paste their URL",
                desc: "Enter any live website. Our AI scrapes the content, analyzes the business, and identifies what makes them tick.",
              },
              {
                icon: <Sparkles className="w-5 h-5" />,
                step: "02",
                title: "Pick a style",
                desc: "Choose from 3 AI-tailored design directions — each one custom-fit to their industry, brand, and audience.",
              },
              {
                icon: <Send className="w-5 h-5" />,
                step: "03",
                title: "Send the preview",
                desc: "Get a shareable link with a side-by-side before/after. The client sees the redesign and your contact info.",
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

      {/* ═══════ FEATURES ═══════ */}
      <section id="features" className="relative py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-medium text-accent uppercase tracking-wider mb-3">Features</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Everything you need to close</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                icon: <Zap className="w-4 h-4" />,
                title: "AI business analysis",
                desc: "Understands their industry, customers, and brand tone automatically.",
              },
              {
                icon: <Sparkles className="w-4 h-4" />,
                title: "Custom style directions",
                desc: "3 unique design styles tailored to each business — never generic templates.",
              },
              {
                icon: <Globe className="w-4 h-4" />,
                title: "Stock image integration",
                desc: "Pulls relevant professional photos from Pexels to elevate the redesign.",
              },
              {
                icon: <Send className="w-4 h-4" />,
                title: "Shareable preview link",
                desc: "One URL with before/after comparison and your contact info built in.",
              },
              {
                icon: <Check className="w-4 h-4" />,
                title: "Real content, not Lorem Ipsum",
                desc: "Uses the actual business copy, images, and details from their site.",
              },
              {
                icon: <Zap className="w-4 h-4" />,
                title: "30-day hosted previews",
                desc: "Links stay live for a month — plenty of time to follow up and close.",
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

      {/* ═══════ CTA ═══════ */}
      <section className="relative py-24 px-6 border-t border-white/5 noise-bg overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[500px] h-[300px] bg-accent/5 rounded-full blur-[100px]" />
        </div>
        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Stop cold pitching.<br />Start preselling.
          </h2>
          <p className="text-neutral-500 mb-8 max-w-lg mx-auto">
            Show potential clients what their website could look like — and let the design sell your services for you.
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-accent hover:bg-accent-light text-black font-semibold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-accent/20"
          >
            <span>Get Started</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm font-semibold tracking-tight text-neutral-600">
            presell<span className="text-accent/50">.</span>
          </span>
          <p className="text-xs text-neutral-700">
            Built for freelancers and agencies who let their work do the talking.
          </p>
        </div>
      </footer>
    </div>
  );
}
