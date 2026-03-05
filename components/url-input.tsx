"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function ArrowRight({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
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

function isPitchKitUrl(input: string): boolean {
  const lower = input.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
  return lower === "pitchkit.dev" || lower === "pitchkit.co";
}

export default function UrlInput() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const isMaps = isGoogleMapsUrl(url);

  function handleAnalyze() {
    setError("");
    setToast("");
    if (!url) { setError("Please enter a URL."); return; }
    if (isPitchKitUrl(url)) {
      setToast("Nice try — we already know we're good-looking.");
      return;
    }
    if (isMaps) {
      router.push(`/create?mapsUrl=${encodeURIComponent(url)}`);
    } else {
      router.push(`/create?url=${encodeURIComponent(url)}`);
    }
  }

  return (
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
      {toast && (
        <div className="mt-4 max-w-xl mx-auto p-3 bg-accent/5 border border-accent/20 rounded-xl text-accent text-xs flex items-center gap-2">
          <span>😏</span>
          {toast}
        </div>
      )}
    </>
  );
}
