"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import AuthButton from "@/components/auth-button";
import type { BusinessProfile } from "@/types";

type Phase = "working" | "done";

/* ───── tiny icon components ───── */
function ArrowRight({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
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

const STEP_INTERVALS = [6000, 12000, 18000, 25000, 30000];

function SteppedProgress({ steps, done, subtitle, currentStep }: { steps: StepConfig[]; done: boolean; subtitle: string; currentStep?: number }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [barWidth, setBarWidth] = useState(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (currentStep !== undefined && currentStep >= 0) {
      setActiveIndex(currentStep);
    }
  }, [currentStep]);

  useEffect(() => {
    if (done || currentStep !== undefined) return;
    const timers = timersRef.current;
    const maxSimulated = steps.length - 2;
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
  }, [done, steps.length, currentStep]);

  useEffect(() => {
    if (done) {
      setBarWidth(100);
      setActiveIndex(steps.length);
      return;
    }
    const stepPercent = ((activeIndex) / steps.length) * 100;
    const segmentSize = 100 / steps.length;
    setBarWidth(stepPercent + segmentSize * 0.3);
  }, [activeIndex, done, steps.length]);

  return (
    <div className="animate-fade-in py-8">
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

              <span className={`text-sm transition-colors duration-300 ${
                isComplete ? "text-neutral-400" : isActive ? "text-white font-medium" : "text-neutral-600"
              }`}>
                {step.label}
              </span>

              {isComplete && !isPending && (
                <span className="ml-auto text-[11px] text-accent/60 font-medium">Done</span>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-neutral-600 text-center mt-6">{subtitle}</p>
    </div>
  );
}

// Combined steps for the entire analyze → generate flow
const STEPS_WEBSITE: StepConfig[] = [
  { label: "Scraping website content" },
  { label: "Analyzing business & brand" },
  { label: "Planning layout" },
  { label: "Building redesign" },
  { label: "Reviewing design" },
  { label: "Saving preview" },
];

const STEPS_MAPS: StepConfig[] = [
  { label: "Fetching business details" },
  { label: "Analyzing business & brand" },
  { label: "Planning layout" },
  { label: "Building redesign" },
  { label: "Reviewing design" },
  { label: "Saving preview" },
];

// Map SSE pipeline stages to step indices (offset by 2 for analyze steps)
const STAGE_TO_STEP: Record<string, number> = {
  blueprint: 2,
  generating: 3,
  "qa-screenshot": 4,
  "qa-review": 4,
  "qa-fix": 4,
  finalizing: 5,
};

/* ───── Main component ───── */
function CreatePageInner() {
  const searchParams = useSearchParams();
  const url = searchParams.get("url") || "";
  const mapsUrl = searchParams.get("mapsUrl") || "";
  const source: "website" | "google-maps" = mapsUrl ? "google-maps" : "website";
  const hasStarted = useRef(false);

  const [error, setError] = useState("");
  const [phase, setPhase] = useState<Phase>("working");

  const [profile, setProfile] = useState<BusinessProfile | null>(null);

  const [previewUrl, setPreviewUrl] = useState("");
  const [previewSlug, setPreviewSlug] = useState("");
  const [copied, setCopied] = useState(false);
  const [insufficientCredits, setInsufficientCredits] = useState(false);

  const [allDone, setAllDone] = useState(false);
  const [currentStep, setCurrentStep] = useState<number | undefined>(undefined);

  const isValidUrl = (() => {
    if (source === "google-maps") return !!mapsUrl;
    if (!url) return false;
    try { new URL(url); return true; } catch { return false; }
  })();

  const displayLabel = source === "google-maps"
    ? (profile?.businessName || mapsUrl)
    : url;

  const transitionToDone = useCallback(() => {
    setTimeout(() => setPhase("done"), 600);
  }, []);

  /* Run the full analyze → generate pipeline automatically */
  useEffect(() => {
    if (!isValidUrl || hasStarted.current) return;
    hasStarted.current = true;

    async function run() {
      // ── Step 1: Analyze ──
      let analyzeData;
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
        analyzeData = data;
        setProfile(data.profile);
        // Mark analysis complete — advance to step 2
        setCurrentStep(2);
      } catch {
        setError("Network error. Please try again.");
        return;
      }

      // ── Step 2: Generate (SSE) ──
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: source === "google-maps" ? mapsUrl : url,
            profile: analyzeData.profile,
            selectedStyle: analyzeData.styles[0],
            pageStructure: analyzeData.pageStructure,
            imageUrls: analyzeData.imageUrls,
            stockImageUrls: analyzeData.stockImageUrls || [],
            stockImages: analyzeData.stockImages || undefined,
            pageContent: analyzeData.pageContent || "",
            classifiedImages: analyzeData.classifiedImages?.length > 0 ? analyzeData.classifiedImages : undefined,
          }),
        });

        // Non-SSE error responses
        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("text/event-stream")) {
          const data = await res.json();
          if (res.status === 402 && data.insufficientCredits) {
            setInsufficientCredits(true);
          }
          setError(data.error || "Something went wrong.");
          return;
        }

        // Consume SSE stream
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === "progress") {
                const step = STAGE_TO_STEP[event.stage];
                if (step !== undefined) setCurrentStep(step);
              } else if (event.type === "complete") {
                setPreviewUrl(event.previewUrl);
                setPreviewSlug(event.slug);
                setAllDone(true);
                transitionToDone();
              } else if (event.type === "error") {
                setError(event.error || "Something went wrong.");
              }
            } catch {
              // Skip malformed events
            }
          }
        }

        // Check remaining buffer
        if (buffer.startsWith("data: ")) {
          try {
            const event = JSON.parse(buffer.slice(6));
            if (event.type === "complete") {
              setPreviewUrl(event.previewUrl);
              setPreviewSlug(event.slug);
              setAllDone(true);
              transitionToDone();
            } else if (event.type === "error") {
              setError(event.error || "Something went wrong.");
            }
          } catch {
            // ignore
          }
        }
      } catch {
        setError("Network error. Please try again.");
      }
    }

    run();
  }, [url, mapsUrl, source, isValidUrl, transitionToDone]);

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

          {/* Active flow */}
          {isValidUrl && (<>
          <div className="mb-8 text-center">
            <p className="text-xs text-neutral-600 mb-1">
              {source === "google-maps" ? "Creating a website for" : "Redesigning"}
            </p>
            <p className={`text-sm truncate ${source === "google-maps" && profile ? "font-medium text-white" : "font-mono text-neutral-400"}`}>{displayLabel}</p>
          </div>

          {/* Phase: Working (analyze + generate) */}
          {phase === "working" && !error && (
            <SteppedProgress
              steps={source === "google-maps" ? STEPS_MAPS : STEPS_WEBSITE}
              done={allDone}
              currentStep={currentStep}
              subtitle="This usually takes 2-3 minutes"
            />
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
                  className="px-4 py-2 bg-accent hover:bg-accent-light text-black text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
                >
                  {copied ? "Copied!" : "Share Preview"}
                </button>
              </div>

              <a
                href={`/preview/${previewSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 bg-white/10 hover:bg-white/15 text-white font-semibold text-sm rounded-xl transition-all duration-200 border border-white/10"
              >
                <span>Open Preview</span>
                <ArrowRight className="w-4 h-4" />
              </a>

              <p className="text-[12px] text-neutral-500 mt-3 text-center leading-relaxed">
                Add your contact details, edit text, swap images, and ask AI to revise — click the pencil icon on the preview page.
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
