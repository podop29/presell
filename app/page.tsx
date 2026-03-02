"use client";

import { useState } from "react";
import Link from "next/link";

const STEPS = [
  "Scraping website...",
  "Analyzing content...",
  "Generating redesign...",
  "Building your preview...",
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

    const interval = setInterval(() => {
      setStepIndex((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 4000);

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

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1.5">
              {"Client's website URL"}
            </label>
            <input
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-lg text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1.5">
                Your Name
              </label>
              <input
                type="text"
                placeholder="Jane Smith"
                value={devName}
                onChange={(e) => setDevName(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-lg text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1.5">
                Your Email
              </label>
              <input
                type="email"
                placeholder="jane@dev.com"
                value={devEmail}
                onChange={(e) => setDevEmail(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-lg text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1.5">
              Custom Message{" "}
              <span className="text-neutral-600">(optional)</span>
            </label>
            <textarea
              placeholder="I'd love to help you modernize your website..."
              value={devMessage}
              onChange={(e) => setDevMessage(e.target.value)}
              disabled={loading}
              rows={3}
              className="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-lg text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 resize-none"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium rounded-lg transition-colors"
          >
            {loading ? "Generating..." : "Generate Redesign"}
          </button>
        </div>

        {loading && (
          <div className="space-y-2 p-4 bg-neutral-900 border border-neutral-800 rounded-lg">
            {STEPS.map((step, i) => (
              <div
                key={step}
                className={`flex items-center gap-2 text-sm ${
                  i <= stepIndex ? "text-blue-400" : "text-neutral-600"
                }`}
              >
                {i < stepIndex ? (
                  <span className="text-green-400">&#10003;</span>
                ) : i === stepIndex ? (
                  <span className="animate-pulse">&#9679;</span>
                ) : (
                  <span>&#9675;</span>
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
          <div className="space-y-3 p-4 bg-neutral-900 border border-neutral-800 rounded-lg">
            <p className="text-sm text-green-400 font-medium">
              Preview generated!
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-black rounded text-sm font-mono text-neutral-300 truncate">
                {previewUrl}
              </code>
              <button
                onClick={handleCopy}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors whitespace-nowrap"
              >
                {copied ? "Copied!" : "Copy Link"}
              </button>
            </div>
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm text-blue-400 hover:text-blue-300 underline"
            >
              Open preview &rarr;
            </a>
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
