"use client";

import { useState } from "react";

type TabKey = "original" | "redesign";

interface PreviewClientProps {
  slug: string;
  originalUrl: string;
  styleName: string;
  devName: string;
  devEmail: string;
  devMessage: string | null;
}

export default function PreviewClient({
  slug,
  originalUrl,
  styleName,
  devName,
  devEmail,
  devMessage,
}: PreviewClientProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("redesign");
  const [iframeLoading, setIframeLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch(`/api/preview/${slug}/html`);
      if (!res.ok) return;
      const html = await res.text();
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug}-redesign.html`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: "original", label: "Original Site" },
    { key: "redesign", label: styleName },
  ];

  const iframeSrc =
    activeTab === "original" ? originalUrl : `/api/preview/${slug}/html`;

  const showCta = devName && devEmail;

  return (
    <div className="h-screen flex flex-col bg-zinc-950">
      {/* Top Bar */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-6 py-3 flex items-center justify-between shrink-0">
        <span className="text-sm font-semibold text-white tracking-tight">
          Presell
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 rounded-md transition-colors disabled:opacity-50"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {exporting ? "Exporting..." : "Export HTML"}
          </button>
          <span className="text-xs text-zinc-500">Powered by Presell</span>
        </div>
      </header>

      {/* Tab Bar */}
      <nav className="bg-zinc-900 border-b border-zinc-800 px-4 flex shrink-0">
        {tabs.map((tab) => (
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
          src={iframeSrc}
          className="w-full h-full absolute inset-0 border-0"
          title={tabs.find((t) => t.key === activeTab)?.label || "Preview"}
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
