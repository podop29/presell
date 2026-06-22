"use client";

/**
 * Real examples gallery.
 *
 * Each card shows a live, scaled-down iframe of an *actual* redesign generated
 * with PitchKit (served clean via /api/preview/[slug]/html), and links to the
 * real preview page the prospect would see. These are genuine outputs, not
 * mockups — the strongest proof the product works.
 *
 * The iframe renders the site at a fixed desktop width (BASE_WIDTH) and is
 * scaled down to exactly fit each card, so the whole hero is visible rather
 * than a zoomed-in crop. Scale is measured per card via ResizeObserver.
 *
 * To curate: edit EXAMPLES below. Slugs map to live previews in the DB.
 */

import { useEffect, useRef, useState } from "react";

const BASE_WIDTH = 1280; // virtual desktop width the redesign renders at
const THUMB_H = 240; // visible thumbnail height in px

type Example = {
  slug: string;
  name: string;
  category: string;
  source?: "url" | "maps";
};

const EXAMPLES: Example[] = [
  { slug: "fwQZOlN7", name: "Khoury Chiropractic", category: "Chiropractic", source: "url" },
  { slug: "ZzmKUNqs", name: "Laséa Salon", category: "Beauty Salon", source: "url" },
  { slug: "lHvFfiJL", name: "Swishdle", category: "Sports Trivia App", source: "url" },
  { slug: "G8uoC40j", name: "Qtonix", category: "Marketing Agency", source: "url" },
  { slug: "GaLlDV_G", name: "CBM Multi-Speciality Hospital", category: "Healthcare", source: "maps" },
  { slug: "yrNP06js", name: "Lee's Lawn Maintenance", category: "Landscaping", source: "url" },
];

function ExternalLink({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function Thumbnail({ ex }: { ex: Example }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / BASE_WIDTH);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="relative overflow-hidden bg-white border-b border-[var(--border)]"
      style={{ height: THUMB_H }}
    >
      {scale > 0 && (
        <iframe
          src={`/api/preview/${ex.slug}/html`}
          title={`${ex.name} redesign preview`}
          loading="lazy"
          tabIndex={-1}
          aria-hidden="true"
          scrolling="no"
          className="pointer-events-none select-none"
          style={{
            width: `${BASE_WIDTH}px`,
            height: `${THUMB_H / scale}px`,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            border: 0,
          }}
        />
      )}

      {/* Hover veil + CTA */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent text-black text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
        View live preview
        <ExternalLink />
      </span>
      {ex.source === "maps" && (
        <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur text-white text-[10px] font-medium">
          Built from Google Maps
        </span>
      )}
    </div>
  );
}

function ExampleCard({ ex }: { ex: Example }) {
  return (
    <a
      href={`/preview/${ex.slug}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-2xl border border-[var(--border)] bg-surface overflow-hidden transition-colors hover:border-accent/40"
    >
      <Thumbnail ex={ex} />

      {/* Label */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">{ex.name}</p>
          <p className="text-xs text-neutral-500">{ex.category}</p>
        </div>
        <span className="text-neutral-600 group-hover:text-accent transition-colors shrink-0">
          <ExternalLink className="w-4 h-4" />
        </span>
      </div>
    </a>
  );
}

export default function ExamplesGallery() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
      {EXAMPLES.map((ex) => (
        <ExampleCard key={ex.slug} ex={ex} />
      ))}
    </div>
  );
}
