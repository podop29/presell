"use client";

import { useState, useMemo, useEffect, useRef } from "react";

interface Variation {
  key: string;
  label: string;
  src: string;
}

interface PreviewClientProps {
  slug: string;
  originalUrl: string;
  devName: string;
  devEmail: string;
  devMessage: string | null;
  variations: Variation[];
  isOwner: boolean;
  companyName?: string;
  logoUrl?: string;
}

export default function PreviewClient({
  slug,
  originalUrl,
  devName,
  devEmail,
  devMessage,
  variations,
  isOwner,
  companyName,
  logoUrl,
}: PreviewClientProps) {
  const [activeView, setActiveView] = useState<string>(
    variations[0]?.key ?? "original"
  );
  const [iframeLoading, setIframeLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [reviseOpen, setReviseOpen] = useState(false);
  const [revisePrompt, setRevisePrompt] = useState("");
  const [revising, setRevising] = useState(false);
  const [reviseError, setReviseError] = useState<string | null>(null);
  const [iframeVersion, setIframeVersion] = useState(0);
  const [pendingRevisionHtml, setPendingRevisionHtml] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const pendingBlobUrl = useRef<string | null>(null);

  const domain = useMemo(() => {
    try {
      return new URL(originalUrl).hostname.replace(/^www\./, "");
    } catch {
      return originalUrl;
    }
  }, [originalUrl]);

  const displayName = companyName || devName;
  const initial = displayName.charAt(0).toUpperCase();

  function revokePendingBlob() {
    if (pendingBlobUrl.current) {
      URL.revokeObjectURL(pendingBlobUrl.current);
      pendingBlobUrl.current = null;
    }
  }

  useEffect(() => {
    return () => revokePendingBlob();
  }, []);

  const tabs: { key: string; label: string }[] = [
    { key: "original", label: "Current" },
    ...variations.map((v) => ({ key: v.key, label: v.label })),
  ];

  const activeVariation = variations.find((v) => v.key === activeView);

  const baseSrc =
    activeView === "original"
      ? originalUrl
      : activeVariation?.src ?? originalUrl;
  const iframeSrc =
    activeView !== "original" && iframeVersion > 0
      ? `${baseSrc}?v=${iframeVersion}`
      : baseSrc;

  async function handleExport() {
    if (activeView === "original") return;
    setExporting(true);
    try {
      const src = activeVariation?.src ?? `/api/preview/${slug}/html`;
      const res = await fetch(src);
      if (!res.ok) return;
      const html = await res.text();
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug}-${activeView}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  function switchView(key: string) {
    if (key === activeView || pendingRevisionHtml) return;
    setIframeLoading(true);
    setActiveView(key);
    if (key === "original") {
      setReviseOpen(false);
      setReviseError(null);
    }
  }

  async function handleRevise(e: React.FormEvent) {
    e.preventDefault();
    if (!revisePrompt.trim() || revising || pendingRevisionHtml) return;
    setRevising(true);
    setReviseError(null);
    try {
      const res = await fetch(`/api/preview/${slug}/revise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variationKey: activeView,
          prompt: revisePrompt.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReviseError(data.error || "Revision failed.");
        return;
      }
      revokePendingBlob();
      const blobUrl = URL.createObjectURL(
        new Blob([data.revisedHtml], { type: "text/html" })
      );
      pendingBlobUrl.current = blobUrl;
      setPendingRevisionHtml(data.revisedHtml);
      setRevisePrompt("");
    } catch {
      setReviseError("Network error. Please try again.");
    } finally {
      setRevising(false);
    }
  }

  async function handleAcceptRevision() {
    if (!pendingRevisionHtml || accepting) return;
    setAccepting(true);
    setReviseError(null);
    try {
      const res = await fetch(`/api/preview/${slug}/accept-revision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variationKey: activeView,
          html: pendingRevisionHtml,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReviseError(data.error || "Failed to save revision.");
        return;
      }
      revokePendingBlob();
      setPendingRevisionHtml(null);
      setIframeLoading(true);
      setIframeVersion((v) => v + 1);
      setReviseOpen(false);
    } catch {
      setReviseError("Network error. Please try again.");
    } finally {
      setAccepting(false);
    }
  }

  function handleDiscardRevision() {
    revokePendingBlob();
    setPendingRevisionHtml(null);
    setReviseError(null);
  }

  const showCta = devName && devEmail;

  return (
    <div className="h-screen flex flex-col bg-zinc-950 overflow-hidden">
      {/* ── Top bar ── */}
      <header className="relative z-30 shrink-0 h-12 flex items-center justify-between px-4 bg-black/60 backdrop-blur-xl border-b border-white/10">
        {/* Left — domain */}
        <span className="text-xs text-zinc-400 font-medium tracking-wide shrink-0">
          {domain}
        </span>

        {/* Center — segmented control */}
        <nav className="absolute left-1/2 -translate-x-1/2 flex items-center bg-white/[0.06] rounded-full p-0.5 border border-white/[0.08]">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => switchView(tab.key)}
              disabled={!!pendingRevisionHtml}
              className={`px-3.5 py-1 text-xs font-medium rounded-full transition-all whitespace-nowrap ${
                activeView === tab.key
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-400 hover:text-white"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Right — revise + export (owner only) */}
        {isOwner ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setReviseOpen((o) => !o);
                setReviseError(null);
              }}
              disabled={activeView === "original"}
              title={
                activeView === "original"
                  ? "Switch to a redesign to revise"
                  : "Revise this design"
              }
              className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400 ${
                reviseOpen
                  ? "bg-white/15 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
            </button>
            <button
              onClick={handleExport}
              disabled={exporting || activeView === "original"}
              title={
                activeView === "original"
                  ? "Switch to a redesign to export"
                  : "Download HTML"
              }
              className="flex items-center justify-center w-8 h-8 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400"
            >
              {exporting ? (
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              )}
            </button>
          </div>
        ) : (
          <div className="w-8" />
        )}
      </header>

      {/* ── Revision bar (owner only) ── */}
      {isOwner && reviseOpen && activeView !== "original" && (
        <div className="relative z-20 shrink-0 bg-black/60 backdrop-blur-xl border-b border-white/10 px-4 py-2.5">
          {pendingRevisionHtml ? (
            <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
              <p className="text-sm text-zinc-300">
                Review the changes below
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDiscardRevision}
                  disabled={accepting}
                  className="px-4 py-1.5 text-sm font-medium text-zinc-400 hover:text-white rounded-lg border border-white/10 hover:border-white/20 transition-colors disabled:opacity-40"
                >
                  Discard
                </button>
                <button
                  onClick={handleAcceptRevision}
                  disabled={accepting}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-40 flex items-center gap-2"
                >
                  {accepting && (
                    <svg
                      className="w-3.5 h-3.5 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                  )}
                  Accept
                </button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleRevise}
              className="max-w-3xl mx-auto flex items-center gap-2"
            >
              <input
                type="text"
                value={revisePrompt}
                onChange={(e) => setRevisePrompt(e.target.value)}
                placeholder="Describe what to change..."
                maxLength={2000}
                disabled={revising}
                className="flex-1 bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-white/20 transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={revising || !revisePrompt.trim()}
                className="shrink-0 px-4 py-1.5 bg-white hover:bg-neutral-200 text-zinc-900 text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:hover:bg-white flex items-center gap-2"
              >
                {revising && (
                  <svg
                    className="w-3.5 h-3.5 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                )}
                Revise
              </button>
            </form>
          )}
          {reviseError && (
            <p className="max-w-3xl mx-auto mt-1.5 text-xs text-red-400">
              {reviseError}
            </p>
          )}
        </div>
      )}

      {/* ── Iframe(s) ── */}
      {pendingRevisionHtml ? (
        <div className="flex-1 flex relative">
          {/* Before */}
          <div className="w-1/2 relative border-r border-white/10">
            <span className="absolute top-3 left-3 z-20 px-2 py-0.5 bg-black/70 backdrop-blur text-[11px] font-medium text-zinc-400 rounded">
              Before
            </span>
            <iframe
              key={`before-${activeView}-${iframeVersion}`}
              src={iframeSrc}
              className="w-full h-full absolute inset-0 border-0"
              title="Before"
              onLoad={() => setIframeLoading(false)}
            />
          </div>
          {/* After */}
          <div className="w-1/2 relative">
            <span className="absolute top-3 left-3 z-20 px-2 py-0.5 bg-black/70 backdrop-blur text-[11px] font-medium text-emerald-400 rounded">
              After
            </span>
            <iframe
              key={`after-${activeView}`}
              src={pendingBlobUrl.current ?? ""}
              className="w-full h-full absolute inset-0 border-0"
              title="After"
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 relative">
          {iframeLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 z-10">
              <svg
                className="w-6 h-6 text-zinc-500 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            </div>
          )}
          <iframe
            key={`${activeView}-${iframeVersion}`}
            src={iframeSrc}
            className="w-full h-full absolute inset-0 border-0"
            title={tabs.find((t) => t.key === activeView)?.label || "Preview"}
            sandbox={
              activeView === "original"
                ? "allow-scripts allow-same-origin"
                : undefined
            }
            onLoad={() => setIframeLoading(false)}
          />
        </div>
      )}

      {/* ── Bottom CTA bar ── */}
      {showCta && (
        <footer className="relative z-30 shrink-0 bg-black/60 backdrop-blur-xl border-t border-white/10 px-4 sm:px-6 py-3">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            {/* Left — logo/avatar + dev info */}
            <div className="flex items-center gap-3 shrink-0">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt={displayName}
                  className="w-9 h-9 rounded-lg object-contain shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                  {initial}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {displayName}
                </p>
                <p className="text-xs text-zinc-400 truncate">{devEmail}</p>
              </div>
            </div>

            {/* Center — dev message (hidden on mobile) */}
            {devMessage && (
              <p className="hidden md:block text-sm text-zinc-400 truncate flex-1 text-center px-4">
                {devMessage}
              </p>
            )}

            {/* Right — CTA button */}
            <a
              href={`mailto:${devEmail}?subject=Website Redesign&body=Hi ${encodeURIComponent(displayName)}, I saw the redesign preview and I'm interested in learning more.`}
              className="shrink-0 px-5 py-2 bg-white hover:bg-neutral-200 text-zinc-900 text-sm font-semibold rounded-lg transition-colors"
            >
              Get in Touch
            </a>
          </div>
        </footer>
      )}
    </div>
  );
}
