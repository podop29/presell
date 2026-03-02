"use client";

import { useState } from "react";

type TabKey = "original" | "a" | "b" | "c";

interface Tab {
  key: TabKey;
  label: string;
}

const TABS: Tab[] = [
  { key: "original", label: "Original Site" },
  { key: "a", label: "Variation A — Clean & Minimal" },
  { key: "b", label: "Variation B — Bold & Modern" },
  { key: "c", label: "Variation C — Dark & Sleek" },
];

interface PreviewClientProps {
  slug: string;
  originalUrl: string;
  devName: string;
  devEmail: string;
  devMessage: string | null;
  hasVariations: boolean;
}

export default function PreviewClient({
  slug,
  originalUrl,
  devName,
  devEmail,
  devMessage,
}: PreviewClientProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("a");
  const [iframeLoading, setIframeLoading] = useState(true);

  function getIframeSrc(tab: TabKey): string {
    if (tab === "original") return originalUrl;
    return `/api/preview/${slug}/variation-${tab}`;
  }

  const showCta = devName && devEmail;

  return (
    <div className="h-screen flex flex-col bg-zinc-950">
      {/* Top Bar */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-6 py-3 flex items-center justify-between shrink-0">
        <span className="text-sm font-semibold text-white tracking-tight">
          Presell
        </span>
        <span className="text-xs text-zinc-500">Powered by Presell</span>
      </header>

      {/* Tab Bar */}
      <nav className="bg-zinc-900 border-b border-zinc-800 px-4 flex shrink-0 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setIframeLoading(true);
              setActiveTab(tab.key);
            }}
            className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
              activeTab === tab.key
                ? "text-white border-white bg-zinc-800/50"
                : "text-zinc-500 border-transparent hover:text-zinc-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Main Content — iframe */}
      <div className="flex-1 relative">
        {iframeLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 z-10">
            <svg className="w-6 h-6 text-zinc-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}
        <iframe
          key={activeTab}
          src={getIframeSrc(activeTab)}
          className="w-full h-full absolute inset-0 border-0"
          title={TABS.find((t) => t.key === activeTab)?.label || "Preview"}
          sandbox={activeTab === "original" ? "allow-scripts allow-same-origin" : undefined}
          onLoad={() => setIframeLoading(false)}
        />
      </div>

      {/* Bottom CTA Strip */}
      {showCta && (
        <footer className="bg-zinc-800 border-t border-zinc-700 px-6 py-4 shrink-0">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-6">
            <div className="shrink-0">
              <p className="text-sm font-medium text-white">{devName}</p>
              <p className="text-xs text-zinc-400">{devEmail}</p>
            </div>
            {devMessage && (
              <p className="text-sm text-zinc-300 truncate flex-1 text-center hidden sm:block">
                {devMessage}
              </p>
            )}
            <a
              href={`mailto:${devEmail}?subject=Website Redesign&body=Hi ${devName}, I saw the redesign preview and I'm interested in learning more.`}
              className="shrink-0 px-5 py-2.5 bg-white hover:bg-neutral-200 text-zinc-900 text-sm font-medium rounded-lg transition-colors"
            >
              Get in Touch
            </a>
          </div>
        </footer>
      )}
    </div>
  );
}
