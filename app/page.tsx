"use client";

import { useState } from "react";
import Link from "next/link";
import type { BusinessProfile, StyleSuggestion } from "@/types";

type Phase = "input" | "analyzing" | "pick-style" | "generating" | "done";

function extractColors(text: string): string[] {
  const matches = text.match(/#[0-9a-fA-F]{6}\b/g);
  if (!matches) return [];
  // Deduplicate and limit to 5
  return Array.from(new Set(matches)).slice(0, 5);
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [devName, setDevName] = useState("");
  const [devEmail, setDevEmail] = useState("");
  const [devMessage, setDevMessage] = useState("");
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<Phase>("input");

  // Analysis results
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [styles, setStyles] = useState<StyleSuggestion[]>([]);
  const [pageStructure, setPageStructure] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [stockImageUrls, setStockImageUrls] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  // Final result
  const [previewUrl, setPreviewUrl] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleAnalyze() {
    setError("");
    if (!url) {
      setError("Please enter a website URL.");
      return;
    }

    setPhase("analyzing");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setPhase("input");
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
      setPhase("input");
    }
  }

  async function handleGenerate() {
    setError("");
    if (!devName || !devEmail) {
      setError("Please fill in your name and email.");
      return;
    }

    setPhase("generating");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          devName,
          devEmail,
          devMessage,
          profile,
          selectedStyle: styles[selectedIndex],
          pageStructure,
          imageUrls,
          stockImageUrls,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setPhase("pick-style");
        return;
      }

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

  function handleReset() {
    setUrl("");
    setDevName("");
    setDevEmail("");
    setDevMessage("");
    setPreviewUrl("");
    setError("");
    setProfile(null);
    setStyles([]);
    setPageStructure([]);
    setImageUrls([]);
    setStockImageUrls([]);
    setSelectedIndex(0);
    setPhase("input");
  }

  const isLoading = phase === "analyzing" || phase === "generating";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Presell
          </h1>
          <p className="text-lg text-neutral-400">
            Turn any bad website into your next client.
          </p>
        </div>

        {/* Phase 1: URL Input */}
        {(phase === "input" || phase === "analyzing") && (
          <div className="space-y-4">
            <input
              type="url"
              placeholder="https://their-website.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-4 bg-neutral-900 border border-neutral-800 rounded-lg text-white text-lg placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            />
            <button
              onClick={handleAnalyze}
              disabled={isLoading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-semibold text-lg rounded-lg transition-colors"
            >
              {phase === "analyzing" ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Analyzing website...
                </span>
              ) : (
                "Analyze Website"
              )}
            </button>
          </div>
        )}

        {/* Phase 2: Pick a Style */}
        {(phase === "pick-style" || phase === "generating") && (
          <div className="space-y-6">
            {profile && (
              <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg">
                <p className="text-sm text-neutral-400">Analyzed</p>
                <p className="text-white font-medium">{profile.businessName}</p>
                <p className="text-sm text-neutral-500">{profile.whatTheyDo}</p>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-neutral-400 mb-3">
                Choose a design direction
              </p>
              <div className="space-y-3">
                {styles.map((style, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedIndex(i)}
                    disabled={phase === "generating"}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      selectedIndex === i
                        ? "bg-blue-600/10 border-blue-500 ring-1 ring-blue-500"
                        : "bg-neutral-900 border-neutral-800 hover:border-neutral-700"
                    } disabled:opacity-50`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className={`font-semibold ${selectedIndex === i ? "text-blue-400" : "text-white"}`}>
                        {style.styleName}
                      </p>
                      {extractColors(style.styleBrief).length > 0 && (
                        <div className="flex gap-1.5 shrink-0">
                          {extractColors(style.styleBrief).map((color) => (
                            <span
                              key={color}
                              className="w-5 h-5 rounded-full ring-1 ring-white/10"
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-neutral-400 mt-1 line-clamp-2">
                      {style.styleBrief}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Your Name"
                  value={devName}
                  onChange={(e) => setDevName(e.target.value)}
                  disabled={phase === "generating"}
                  className="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-lg text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                />
                <input
                  type="email"
                  placeholder="Your Email"
                  value={devEmail}
                  onChange={(e) => setDevEmail(e.target.value)}
                  disabled={phase === "generating"}
                  className="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-lg text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                />
              </div>
              <textarea
                placeholder="I noticed your website could use some love — here's what it could look like."
                value={devMessage}
                onChange={(e) => setDevMessage(e.target.value)}
                disabled={phase === "generating"}
                rows={3}
                className="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-lg text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 resize-none"
              />
              <button
                onClick={handleGenerate}
                disabled={phase === "generating"}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-semibold text-lg rounded-lg transition-colors"
              >
                {phase === "generating" ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Generating redesign...
                  </span>
                ) : (
                  "Generate Redesign"
                )}
              </button>
            </div>

            <button
              onClick={handleReset}
              disabled={phase === "generating"}
              className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors disabled:opacity-50"
            >
              &larr; Start over with a different URL
            </button>
          </div>
        )}

        {/* Phase 3: Done */}
        {phase === "done" && previewUrl && (
          <div className="space-y-5 p-6 bg-neutral-900 border border-neutral-800 rounded-lg">
            <p className="text-lg font-semibold text-white text-center">
              Your preview is ready!
            </p>

            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2.5 bg-black rounded-lg text-sm font-mono text-neutral-300 truncate">
                {previewUrl}
              </code>
              <button
                onClick={handleCopy}
                className="px-5 py-2.5 bg-white hover:bg-neutral-200 text-black text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
              >
                {copied ? "Copied!" : "Copy Link"}
              </button>
            </div>

            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-center"
            >
              View Preview
            </a>

            <div className="text-center">
              <button
                onClick={handleReset}
                className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                Generate Another
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="text-center pt-4">
          <Link
            href="/dashboard"
            className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            View Dashboard &rarr;
          </Link>
        </div>
      </div>
    </main>
  );
}
