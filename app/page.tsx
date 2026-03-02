"use client";

import { useState } from "react";
import Link from "next/link";

const STEPS = [
  "Scraping website...",
  "Analyzing business content...",
  "Generating 3 variations in parallel...",
  "Saving your preview...",
  "Done!",
];

export default function Home() {
  const [url, setUrl] = useState("");
  const [devName, setDevName] = useState("");
  const [devEmail, setDevEmail] = useState("");
  const [devMessage, setDevMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setError("");
    setPreviewUrl("");
    setCopied(false);

    if (!url || !devName || !devEmail) {
      setError("Please fill in the URL, your name, and your email.");
      return;
    }

    setLoading(true);
    setStepIndex(0);

    // Progress through steps on a timer
    const stepTimings = [5000, 8000, 25000, 5000];
    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < STEPS.length - 1) {
        setStepIndex(currentStep);
      } else {
        clearInterval(interval);
      }
    }, stepTimings[currentStep] || 8000);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, devName, devEmail, devMessage }),
      });

      const data = await res.json();
      clearInterval(interval);

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      setStepIndex(STEPS.length - 1);
      setPreviewUrl(data.previewUrl);
    } catch {
      clearInterval(interval);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
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
    setStepIndex(0);
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Presell
          </h1>
          <p className="text-lg text-neutral-400">
            Turn any bad website into your next client.
          </p>
        </div>

        {!previewUrl && (
          <div className="space-y-4">
            <div>
              <input
                type="url"
                placeholder="https://their-website.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-4 bg-neutral-900 border border-neutral-800 rounded-lg text-white text-lg placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Your Name"
                value={devName}
                onChange={(e) => setDevName(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-lg text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              />
              <input
                type="email"
                placeholder="Your Email"
                value={devEmail}
                onChange={(e) => setDevEmail(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-lg text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              />
            </div>

            <textarea
              placeholder="I noticed your website could use some love — here's what it could look like."
              value={devMessage}
              onChange={(e) => setDevMessage(e.target.value)}
              disabled={loading}
              rows={3}
              className="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-lg text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 resize-none"
            />

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-semibold text-lg rounded-lg transition-colors"
            >
              {loading ? "Generating..." : "Generate Redesign"}
            </button>
          </div>
        )}

        {loading && (
          <div className="space-y-1 p-5 bg-neutral-900 border border-neutral-800 rounded-lg">
            {STEPS.map((step, i) => (
              <div
                key={step}
                className={`flex items-center gap-3 py-1.5 text-sm transition-colors ${
                  i < stepIndex
                    ? "text-green-400"
                    : i === stepIndex
                    ? "text-blue-400"
                    : "text-neutral-600"
                }`}
              >
                {i < stepIndex ? (
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : i === stepIndex ? (
                  <svg className="w-4 h-4 shrink-0 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-700" />
                  </span>
                )}
                {step}
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {previewUrl && (
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
