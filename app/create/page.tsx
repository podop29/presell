"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { BusinessProfile, StyleSuggestion } from "@/types";

type Phase = "analyzing" | "pick-style" | "generating" | "done";

function extractColors(text: string): string[] {
  const matches = text.match(/#[0-9a-fA-F]{6}\b/g);
  if (!matches) return [];
  return Array.from(new Set(matches)).slice(0, 5);
}

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
function Check({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function Spinner({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

/* ───── Main component ───── */
function CreatePageInner() {
  const searchParams = useSearchParams();
  const url = searchParams.get("url") || "";
  const hasStarted = useRef(false);

  const [devName, setDevName] = useState("");
  const [devEmail, setDevEmail] = useState("");
  const [devMessage, setDevMessage] = useState("");
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<Phase>("analyzing");

  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [styles, setStyles] = useState<StyleSuggestion[]>([]);
  const [pageStructure, setPageStructure] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [stockImageUrls, setStockImageUrls] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const [previewUrl, setPreviewUrl] = useState("");
  const [copied, setCopied] = useState(false);

  /* Auto-start analysis on mount */
  useEffect(() => {
    if (!url || hasStarted.current) return;
    hasStarted.current = true;

    async function analyze() {
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Something went wrong.");
          return;
        }
        setProfile(data.profile);
        setStyles(data.styles);
        setPageStructure(data.pageStructure);
        setImageUrls(data.imageUrls);
        setStockImageUrls(data.stockImageUrls || []);
        setSelectedIndex(0);
        setPhase("pick-style");
      } catch {
        setError("Network error. Please try again.");
      }
    }

    analyze();
  }, [url]);

  async function handleGenerate() {
    setError("");
    if (!devName || !devEmail) { setError("Please fill in your name and email."); return; }
    setPhase("generating");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url, devName, devEmail, devMessage, profile,
          selectedStyle: styles[selectedIndex],
          pageStructure, imageUrls, stockImageUrls,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong."); setPhase("pick-style"); return; }
      setPreviewUrl(data.previewUrl);
      setPhase("done");
    } catch {
      setError("Network error. Please try again.");
      setPhase("pick-style");
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(previewUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen">
      {/* ═══════ NAV ═══════ */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold tracking-tight text-white">
            presell<span className="text-accent">.</span>
          </Link>
          <Link
            href="/dashboard"
            className="text-xs text-neutral-400 hover:text-white transition-colors px-3 py-1.5 rounded-md border border-white/10 hover:border-white/20"
          >
            Dashboard
          </Link>
        </div>
      </nav>

      {/* ═══════ CONTENT ═══════ */}
      <section className="relative pt-32 pb-20 px-6 noise-bg overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-accent/8 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-xl mx-auto">
          {/* URL being analyzed */}
          <div className="mb-8 text-center">
            <p className="text-xs text-neutral-600 mb-1">Redesigning</p>
            <p className="text-sm font-mono text-neutral-400 truncate">{url}</p>
          </div>

          {/* Phase: Analyzing */}
          {phase === "analyzing" && !error && (
            <div className="animate-fade-in flex flex-col items-center gap-4 py-12">
              <Spinner className="w-8 h-8 text-accent" />
              <div className="text-center">
                <p className="text-white font-medium">Analyzing website...</p>
                <p className="text-xs text-neutral-500 mt-1">Scraping content, identifying business details, and crafting styles</p>
              </div>
            </div>
          )}

          {/* Phase: Pick Style + Details */}
          {(phase === "pick-style" || phase === "generating") && (
            <div className="text-left space-y-5 animate-fade-in">
              {/* Analyzed badge */}
              {profile && (
                <div className="flex items-start gap-3 p-4 bg-surface rounded-xl border border-[var(--border)]">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-accent" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-medium text-sm">{profile.businessName}</p>
                    <p className="text-xs text-neutral-500 mt-0.5 truncate">{profile.whatTheyDo}</p>
                  </div>
                </div>
              )}

              {/* Style picker */}
              <div>
                <p className="text-xs font-medium text-neutral-500 mb-2 uppercase tracking-wider">
                  Choose a design direction
                </p>
                <div className="space-y-2">
                  {styles.map((style, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedIndex(i)}
                      disabled={phase === "generating"}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 group ${
                        selectedIndex === i
                          ? "bg-accent/5 border-accent/40 shadow-lg shadow-accent/5"
                          : "bg-surface border-[var(--border)] hover:border-[var(--border-light)]"
                      } disabled:opacity-50`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
                            selectedIndex === i ? "bg-accent" : "bg-neutral-700"
                          }`} />
                          <p className={`font-medium text-sm ${selectedIndex === i ? "text-accent" : "text-white"}`}>
                            {style.styleName}
                          </p>
                        </div>
                        {extractColors(style.styleBrief).length > 0 && (
                          <div className="flex -space-x-1 shrink-0">
                            {extractColors(style.styleBrief).map((color) => (
                              <span
                                key={color}
                                className="w-4 h-4 rounded-full ring-2 ring-[#111]"
                                style={{ backgroundColor: color }}
                                title={color}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500 mt-1.5 ml-5 line-clamp-2">
                        {style.styleBrief}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Contact fields */}
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Your name"
                    value={devName}
                    onChange={(e) => setDevName(e.target.value)}
                    disabled={phase === "generating"}
                    className="px-3.5 py-2.5 bg-surface border border-[var(--border)] rounded-lg text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-accent/40 transition-colors disabled:opacity-50"
                  />
                  <input
                    type="email"
                    placeholder="Your email"
                    value={devEmail}
                    onChange={(e) => setDevEmail(e.target.value)}
                    disabled={phase === "generating"}
                    className="px-3.5 py-2.5 bg-surface border border-[var(--border)] rounded-lg text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-accent/40 transition-colors disabled:opacity-50"
                  />
                </div>
                <textarea
                  placeholder="Message to the client (optional)"
                  value={devMessage}
                  onChange={(e) => setDevMessage(e.target.value)}
                  disabled={phase === "generating"}
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-surface border border-[var(--border)] rounded-lg text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-accent/40 transition-colors disabled:opacity-50 resize-none"
                />
                <button
                  onClick={handleGenerate}
                  disabled={phase === "generating"}
                  className="w-full py-3 bg-accent hover:bg-accent-light disabled:opacity-50 text-black font-semibold text-sm rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-accent/20 flex items-center justify-center gap-2"
                >
                  {phase === "generating" ? (
                    <>
                      <Spinner className="w-4 h-4" />
                      <span>Generating redesign...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate Redesign</span>
                    </>
                  )}
                </button>
              </div>

              <Link
                href="/"
                className={`text-xs text-neutral-600 hover:text-neutral-400 transition-colors ${phase === "generating" ? "pointer-events-none opacity-50" : ""}`}
              >
                &larr; Start over
              </Link>
            </div>
          )}

          {/* Phase: Done */}
          {phase === "done" && previewUrl && (
            <div className="animate-fade-in text-left space-y-4 p-5 bg-surface rounded-xl border border-accent/20 glow-amber">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Check className="w-4 h-4 text-accent" />
                </div>
                <p className="text-white font-medium">Your preview is ready</p>
              </div>

              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-black/50 rounded-lg text-xs font-mono text-neutral-400 truncate border border-white/5">
                  {previewUrl}
                </code>
                <button
                  onClick={handleCopy}
                  className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap border border-white/10"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>

              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 bg-accent hover:bg-accent-light text-black font-semibold text-sm rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-accent/20"
              >
                <span>Open Preview</span>
                <ArrowRight className="w-4 h-4" />
              </a>

              <Link
                href="/"
                className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors inline-block"
              >
                Generate another
              </Link>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-500/5 border border-red-500/20 rounded-xl text-red-400 text-xs text-center">
              <p>{error}</p>
              <Link href="/" className="inline-block mt-2 text-neutral-500 hover:text-neutral-300 underline underline-offset-2">
                &larr; Go back and try again
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function CreatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="w-8 h-8 text-accent" />
      </div>
    }>
      <CreatePageInner />
    </Suspense>
  );
}
