"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import AuthButton from "@/components/auth-button";
import type { BusinessProfile, StyleSuggestion, ClassifiedImage } from "@/types";

type Phase = "analyzing" | "pick-style" | "generating" | "done";

function extractColors(text: string): string[] {
  const matches = text.match(/#[0-9a-fA-F]{6}\b/g);
  if (!matches) return [];
  return Array.from(new Set(matches)).slice(0, 5);
}

/* ───── tiny icon components ───── */
function ChevronRight({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
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

/* ───── Stepped Progress Component ───── */
interface StepConfig {
  label: string;
}

// Intervals before advancing to the next step (ms).
// Spread across ~90s total so no single step hogs the wait.
const STEP_INTERVALS = [6000, 12000, 18000, 25000, 30000];

function SteppedProgress({ steps, done, subtitle }: { steps: StepConfig[]; done: boolean; subtitle: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [barWidth, setBarWidth] = useState(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Advance steps on timers (simulated). Never advances past second-to-last unless done.
  useEffect(() => {
    if (done) return;
    const timers = timersRef.current;
    const maxSimulated = steps.length - 2; // hold with one pending step still visible
    let current = 0;

    function scheduleNext() {
      if (current >= maxSimulated) return;
      const delay = STEP_INTERVALS[current] ?? STEP_INTERVALS[STEP_INTERVALS.length - 1];
      const timer = setTimeout(() => {
        current++;
        setActiveIndex(current);
        scheduleNext();
      }, delay);
      timers.push(timer);
    }

    scheduleNext();
    return () => timers.forEach(clearTimeout);
  }, [done, steps.length]);

  // Progress bar: smoothly advances per step, fills the gap between steps slowly
  useEffect(() => {
    if (done) {
      setBarWidth(100);
      setActiveIndex(steps.length);
      return;
    }
    // Base progress = percentage of completed steps
    const stepPercent = ((activeIndex) / steps.length) * 100;
    // Add a slow creep within the current step segment
    const segmentSize = 100 / steps.length;
    setBarWidth(stepPercent + segmentSize * 0.3);
  }, [activeIndex, done, steps.length]);

  return (
    <div className="animate-fade-in py-8">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-white">
            {done ? "Complete" : steps[Math.min(activeIndex, steps.length - 1)].label}
          </p>
          <span className="text-xs font-mono text-neutral-600">
            {Math.min(Math.round(barWidth), 100)}%
          </span>
        </div>
        <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent to-accent-light rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </div>

      {/* Steps list */}
      <div className="space-y-1">
        {steps.map((step, i) => {
          const isComplete = done ? true : i < activeIndex;
          const isActive = !done && i === activeIndex;
          const isPending = !done && i > activeIndex;

          return (
            <div
              key={step.label}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-500 ${
                isActive
                  ? "bg-accent/5 border border-accent/20"
                  : isComplete
                    ? "border border-transparent"
                    : "border border-transparent opacity-40"
              }`}
            >
              {/* Icon */}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                isComplete
                  ? "bg-accent/15"
                  : isActive
                    ? "bg-accent/10"
                    : "bg-neutral-800"
              }`}>
                {isComplete ? (
                  <Check className="w-3.5 h-3.5 text-accent" />
                ) : isActive ? (
                  <Spinner className="w-3.5 h-3.5 text-accent" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
                )}
              </div>

              {/* Label */}
              <span className={`text-sm transition-colors duration-300 ${
                isComplete ? "text-neutral-400" : isActive ? "text-white font-medium" : "text-neutral-600"
              }`}>
                {step.label}
              </span>

              {/* Completed checkmark text */}
              {isComplete && !isPending && (
                <span className="ml-auto text-[11px] text-accent/60 font-medium">Done</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Subtitle */}
      <p className="text-xs text-neutral-600 text-center mt-6">{subtitle}</p>
    </div>
  );
}

const ANALYZE_STEPS_WEBSITE: StepConfig[] = [
  { label: "Scraping website content" },
  { label: "Analyzing business profile" },
  { label: "Identifying brand & audience" },
  { label: "Generating design styles" },
  { label: "Preparing image assets" },
];

const ANALYZE_STEPS_MAPS: StepConfig[] = [
  { label: "Fetching business details" },
  { label: "Analyzing business profile" },
  { label: "Crafting page structure" },
  { label: "Generating design styles" },
  { label: "Preparing image assets" },
];

const GENERATE_STEPS: StepConfig[] = [
  { label: "Preparing content structure" },
  { label: "Mapping page layout" },
  { label: "Selecting imagery" },
  { label: "Building redesign" },
  { label: "Finalizing preview" },
];

/* ───── Main component ───── */
function CreatePageInner() {
  const searchParams = useSearchParams();
  const url = searchParams.get("url") || "";
  const mapsUrl = searchParams.get("mapsUrl") || "";
  const source: "website" | "google-maps" = mapsUrl ? "google-maps" : "website";
  const hasStarted = useRef(false);

  const [devName, setDevName] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("pitchkit_devName") || "";
    return "";
  });
  const [devEmail, setDevEmail] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("pitchkit_devEmail") || "";
    return "";
  });
  const [devMessage, setDevMessage] = useState("");
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<Phase>("analyzing");

  // Persist name & email to localStorage
  useEffect(() => { if (devName) localStorage.setItem("pitchkit_devName", devName); }, [devName]);
  useEffect(() => { if (devEmail) localStorage.setItem("pitchkit_devEmail", devEmail); }, [devEmail]);

  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [styles, setStyles] = useState<StyleSuggestion[]>([]);
  const [pageStructure, setPageStructure] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [stockImageUrls, setStockImageUrls] = useState<string[]>([]);
  const [classifiedImages, setClassifiedImages] = useState<ClassifiedImage[]>([]);
  const [pageContent, setPageContent] = useState<string>("");
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [customInstructions, setCustomInstructions] = useState("");
  const [showCustomInstructions, setShowCustomInstructions] = useState(false);

  const [previewUrl, setPreviewUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [insufficientCredits, setInsufficientCredits] = useState(false);

  // Track when analysis/generation finishes so progress can complete before phase transition
  const [analysisDone, setAnalysisDone] = useState(false);
  const [generationDone, setGenerationDone] = useState(false);

  /* Validate URL param */
  const isValidUrl = (() => {
    if (source === "google-maps") {
      return !!mapsUrl;
    }
    if (!url) return false;
    try { new URL(url); return true; } catch { return false; }
  })();

  // For Google Maps, show business name once analysis completes; fall back to URL while loading
  const displayLabel = source === "google-maps"
    ? (profile?.businessName || mapsUrl)
    : url;

  // Delayed phase transition after progress completes
  const transitionToPickStyle = useCallback(() => {
    setTimeout(() => setPhase("pick-style"), 600);
  }, []);

  const transitionToDone = useCallback(() => {
    setTimeout(() => setPhase("done"), 600);
  }, []);

  /* Auto-start analysis on mount */
  useEffect(() => {
    if (!isValidUrl || hasStarted.current) return;
    hasStarted.current = true;

    async function analyze() {
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            source === "google-maps"
              ? { mapsUrl, source: "google-maps" }
              : { url, source: "website" }
          ),
        });
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 402 && data.insufficientCredits) {
            setInsufficientCredits(true);
          }
          setError(data.error || "Something went wrong.");
          return;
        }
        setProfile(data.profile);
        setStyles(data.styles);
        setPageStructure(data.pageStructure);
        setImageUrls(data.imageUrls);
        setStockImageUrls(data.stockImageUrls || []);
        setClassifiedImages(data.classifiedImages || []);
        setPageContent(data.pageContent || "");
        setSelectedIndex(0);
        setAnalysisDone(true);
        transitionToPickStyle();
      } catch {
        setError("Network error. Please try again.");
      }
    }

    analyze();
  }, [url, mapsUrl, source, isValidUrl, transitionToPickStyle]);

  async function handleGenerate() {
    setError("");
    setInsufficientCredits(false);
    if (!devName || !devEmail) { setError("Please fill in your name and email."); return; }
    setGenerationDone(false);
    setPhase("generating");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: source === "google-maps" ? mapsUrl : url,
          devName, devEmail, devMessage, profile,
          selectedStyle: styles[selectedIndex],
          pageStructure, imageUrls, stockImageUrls, pageContent,
          classifiedImages: classifiedImages.length > 0 ? classifiedImages : undefined,
          customInstructions: customInstructions.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402 && data.insufficientCredits) {
          setInsufficientCredits(true);
          setPhase("pick-style");
          return;
        }
        setError(data.error || "Something went wrong.");
        setPhase("pick-style");
        return;
      }
      setPreviewUrl(data.previewUrl);
      setGenerationDone(true);
      transitionToDone();
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
            pitchkit<span className="text-accent">.</span>
          </Link>
          <AuthButton />
        </div>
      </nav>

      {/* ═══════ CONTENT ═══════ */}
      <section className="relative pt-32 pb-20 px-6 noise-bg overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-accent/8 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-xl mx-auto">
          {/* Missing or invalid URL */}
          {!isValidUrl && (
            <div className="text-center py-12 animate-fade-in">
              <p className="text-white font-medium mb-2">No valid URL provided</p>
              <p className="text-sm text-neutral-500 mb-6">Enter a website URL on the homepage to get started.</p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-light text-black font-semibold text-sm rounded-lg transition-all duration-200"
              >
                &larr; Go to homepage
              </Link>
            </div>
          )}

          {/* URL being analyzed */}
          {isValidUrl && (<>
          <div className="mb-8 text-center">
            <p className="text-xs text-neutral-600 mb-1">
              {source === "google-maps" ? "Creating a website for" : "Redesigning"}
            </p>
            <p className={`text-sm truncate ${source === "google-maps" && profile ? "font-medium text-white" : "font-mono text-neutral-400"}`}>{displayLabel}</p>
          </div>

          {/* Phase: Analyzing */}
          {phase === "analyzing" && !error && (
            <SteppedProgress
              steps={source === "google-maps" ? ANALYZE_STEPS_MAPS : ANALYZE_STEPS_WEBSITE}
              done={analysisDone}
              subtitle="This usually takes 1-2 minutes"
            />
          )}

          {/* Phase: Generating */}
          {phase === "generating" && !error && (
            <SteppedProgress
              steps={GENERATE_STEPS}
              done={generationDone}
              subtitle="Building your custom redesign — almost there"
            />
          )}

          {/* Phase: Pick Style + Details */}
          {phase === "pick-style" && (
            <div className="text-left animate-fade-in">
              {/* Analyzed badge */}
              {profile && (
                <div className="animate-fade-in-up flex items-center gap-3 px-4 py-3 mb-8 rounded-xl bg-accent/5 border border-accent/20">
                  <div className="w-7 h-7 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 text-accent" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-medium text-sm leading-tight">{profile.businessName}</p>
                    <p className="text-[11px] text-neutral-500 truncate">{profile.whatTheyDo}</p>
                  </div>
                </div>
              )}

              {/* ── STEP 1: Style picker ── */}
              <div className="animate-fade-in-up delay-100 mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-6 h-6 rounded-full bg-accent/15 flex items-center justify-center text-[11px] font-bold text-accent shrink-0">1</span>
                  <h3 className="text-sm font-semibold text-white">Choose a design direction</h3>
                </div>

                <div className="space-y-2.5">
                  {styles.map((style, i) => {
                    const colors = extractColors(style.styleBrief);
                    const isSelected = selectedIndex === i;
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedIndex(i)}
                        className={`w-full text-left rounded-xl border transition-all duration-200 overflow-hidden group ${
                          isSelected
                            ? "border-accent/40 shadow-lg shadow-accent/5 bg-[#131313]"
                            : "border-[var(--border)] bg-surface hover:border-[var(--border-light)] hover:bg-[#131313]"
                        }`}
                      >
                        {/* Color bar at top */}
                        {colors.length > 0 && (
                          <div className="h-1 w-full flex">
                            {colors.map((color) => (
                              <div key={color} className="flex-1" style={{ backgroundColor: color }} />
                            ))}
                          </div>
                        )}
                        <div className="p-4">
                          <div className="flex items-center gap-3">
                            {/* Radio indicator */}
                            <div className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${
                              isSelected ? "border-accent bg-accent/10" : "border-neutral-700 group-hover:border-neutral-500"
                            }`}>
                              {isSelected && <div className="w-2 h-2 rounded-full bg-accent" />}
                            </div>
                            <p className={`font-medium text-sm transition-colors ${isSelected ? "text-white" : "text-neutral-300 group-hover:text-white"}`}>
                              {style.styleName}
                            </p>
                          </div>
                          <p className={`text-xs mt-2 ml-[30px] leading-relaxed line-clamp-2 transition-colors ${isSelected ? "text-neutral-400" : "text-neutral-600"}`}>
                            {style.styleBrief}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Optional custom instructions */}
              <div className="animate-fade-in-up delay-150 mb-6">
                <button
                  type="button"
                  onClick={() => setShowCustomInstructions(prev => !prev)}
                  className="flex items-center gap-2 text-[12px] text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showCustomInstructions ? "rotate-90" : ""}`} />
                  <span>Add custom instructions</span>
                  <span className="text-neutral-700">— optional</span>
                </button>
                {showCustomInstructions && (
                  <div className="mt-3 ml-5">
                    <textarea
                      placeholder='e.g. "Use a dark theme", "Include a photo gallery section", "Make the hero section bold and minimal"'
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                      rows={3}
                      className="w-full px-3.5 py-2.5 bg-surface border border-[var(--border)] rounded-lg text-sm text-white placeholder:text-neutral-700 focus:outline-none focus:border-accent/40 focus:bg-[#131313] transition-all resize-none"
                      autoFocus
                    />
                    <p className="text-[11px] text-neutral-700 mt-1 ml-1">
                      Extra context or preferences for the AI when generating the site.
                    </p>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-[var(--border-light)] to-transparent mb-8" />

              {/* ── STEP 2: Your details ── */}
              <div className="animate-fade-in-up delay-200 mb-6">
                <div className="flex items-center gap-3 mb-1.5">
                  <span className="w-6 h-6 rounded-full bg-accent/15 flex items-center justify-center text-[11px] font-bold text-accent shrink-0">2</span>
                  <h3 className="text-sm font-semibold text-white">Your details</h3>
                </div>
                <p className="text-[12px] text-neutral-600 ml-9 mb-5">
                  Shown on the preview page so your prospect can contact you.
                </p>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-500 mb-1.5 ml-1">Name</label>
                      <input
                        type="text"
                        placeholder="Jane Smith"
                        value={devName}
                        onChange={(e) => setDevName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-surface border border-[var(--border)] rounded-lg text-sm text-white placeholder:text-neutral-700 focus:outline-none focus:border-accent/40 focus:bg-[#131313] transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-500 mb-1.5 ml-1">Email</label>
                      <input
                        type="email"
                        placeholder="jane@studio.com"
                        value={devEmail}
                        onChange={(e) => setDevEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-surface border border-[var(--border)] rounded-lg text-sm text-white placeholder:text-neutral-700 focus:outline-none focus:border-accent/40 focus:bg-[#131313] transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-neutral-500 mb-1.5 ml-1">
                      Personal note <span className="text-neutral-700">— optional</span>
                    </label>
                    <textarea
                      placeholder="e.g. &quot;Hey, I noticed your site could use a refresh — here's what I'd do.&quot;"
                      value={devMessage}
                      onChange={(e) => setDevMessage(e.target.value)}
                      rows={2}
                      className="w-full px-3.5 py-2.5 bg-surface border border-[var(--border)] rounded-lg text-sm text-white placeholder:text-neutral-700 focus:outline-none focus:border-accent/40 focus:bg-[#131313] transition-all resize-none"
                    />
                    <p className="text-[11px] text-neutral-700 mt-1 ml-1">
                      This appears on the preview page to make your outreach feel personal.
                    </p>
                  </div>
                </div>
              </div>

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                className="animate-fade-in-up delay-300 w-full py-3.5 bg-accent hover:bg-accent-light text-black font-semibold text-sm rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-accent/25 flex items-center justify-center gap-2 group"
              >
                <Sparkles className="w-4 h-4 transition-transform group-hover:rotate-12" />
                <span>Generate Redesign</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </button>

              <Link
                href="/"
                className="inline-block mt-5 text-xs text-neutral-600 hover:text-neutral-400 transition-colors"
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

              <p className="text-[12px] text-neutral-500 mt-3 text-center leading-relaxed">
                Not perfect? You can edit text, swap images, and ask AI to revise — just click the pencil icon on the preview page.
              </p>

              <Link
                href="/"
                className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors inline-block"
              >
                Generate another
              </Link>
            </div>
          )}

          {insufficientCredits && (
            <div className="mt-4 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl text-center">
              <p className="text-sm font-medium text-amber-400">Out of credits</p>
              <p className="text-xs text-neutral-500 mt-1">
                You need at least 1 credit to generate a preview.
              </p>
              <Link
                href="/credits"
                className="inline-flex items-center gap-2 mt-3 px-5 py-2 bg-accent hover:bg-accent-light text-black font-semibold text-sm rounded-lg transition-all duration-200"
              >
                Buy Credits
              </Link>
            </div>
          )}

          {error && !insufficientCredits && (
            <div className="mt-4 p-3 bg-red-500/5 border border-red-500/20 rounded-xl text-red-400 text-xs text-center">
              <p>{error}</p>
              <Link href="/" className="inline-block mt-2 text-neutral-500 hover:text-neutral-300 underline underline-offset-2">
                &larr; Go back and try again
              </Link>
            </div>
          )}
          </>)}
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
