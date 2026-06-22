"use client";

/**
 * Internal example picker (/admin/examples).
 *
 * Browse every generated preview as a live, scaled thumbnail (rendered via the
 * admin bypass endpoint so expired ones still show), click to select the best,
 * and copy the chosen slugs — ready to paste into examples-gallery.tsx.
 */

import { useEffect, useRef, useState } from "react";

const BASE_WIDTH = 1280;
const THUMB_H = 220;
const PAGE = 36;

export type Candidate = {
  slug: string;
  name: string;
  url: string;
  isMaps: boolean;
  expired: boolean;
};

function Thumb({ slug, name }: { slug: string; name: string }) {
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
    <div ref={ref} className="relative overflow-hidden bg-white" style={{ height: THUMB_H }}>
      {scale > 0 && (
        <iframe
          src={`/api/admin/preview-html/${slug}`}
          title={name}
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
    </div>
  );
}

export default function ExamplePicker({
  candidates,
  featured,
}: {
  candidates: Candidate[];
  featured: string[];
}) {
  const [selected, setSelected] = useState<string[]>(featured);
  const [visible, setVisible] = useState(PAGE);
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);

  const filtered = candidates.filter((c) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q) || c.url.toLowerCase().includes(q);
  });

  function toggle(slug: string) {
    setSelected((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }

  // Build the EXAMPLES snippet in selection order, pulling names from candidates.
  const bySlug = new Map(candidates.map((c) => [c.slug, c]));
  const snippet =
    "const EXAMPLES: Example[] = [\n" +
    selected
      .map((slug) => {
        const c = bySlug.get(slug);
        const name = c?.name ?? slug;
        const src = c?.isMaps ? "maps" : "url";
        return `  { slug: "${slug}", name: "${name}", category: "", source: "${src}" },`;
      })
      .join("\n") +
    "\n];";

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <main className="min-h-screen pb-40">
      <div className="max-w-6xl mx-auto px-6 pt-10">
        <h1 className="text-2xl font-bold text-white">Example picker</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {candidates.length} previews. Click any to select. Selected slugs are ready to paste into{" "}
          <code className="text-neutral-400">components/examples-gallery.tsx</code>, then run the pin script so they never expire.
        </p>

        <div className="mt-6 flex items-center gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by name, slug, or URL…"
            className="flex-1 max-w-md px-4 py-2.5 rounded-xl bg-surface border border-[var(--border)] text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-accent/40"
          />
          <span className="text-xs text-neutral-600">
            {filtered.length} shown · {selected.length} selected
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-6xl mx-auto px-6 mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.slice(0, visible).map((c) => {
          const isSel = selected.includes(c.slug);
          return (
            <button
              key={c.slug}
              onClick={() => toggle(c.slug)}
              className={`group text-left rounded-2xl border overflow-hidden transition-colors ${
                isSel ? "border-accent ring-2 ring-accent/40" : "border-[var(--border)] hover:border-accent/40"
              } bg-surface`}
            >
              <div className="relative">
                <Thumb slug={c.slug} name={c.name} />
                {isSel && (
                  <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-accent text-black text-xs font-bold flex items-center justify-center">
                    ✓
                  </span>
                )}
                {c.isMaps && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur text-white text-[10px] font-medium">
                    Maps
                  </span>
                )}
                {c.expired && (
                  <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-red-500/80 text-white text-[10px] font-medium">
                    expired
                  </span>
                )}
              </div>
              <div className="px-4 py-3 border-t border-[var(--border)]">
                <p className="text-sm font-semibold text-white truncate">{c.name}</p>
                <p className="text-xs text-neutral-600 font-mono mt-0.5">{c.slug}</p>
                <a
                  href={`/preview/${c.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-accent hover:text-accent-light mt-1 inline-block"
                >
                  open ↗
                </a>
              </div>
            </button>
          );
        })}
      </div>

      {visible < filtered.length && (
        <div className="text-center mt-10">
          <button
            onClick={() => setVisible((v) => v + PAGE)}
            className="px-5 py-2.5 rounded-xl border border-[var(--border)] bg-surface text-sm text-neutral-300 hover:border-accent/40 transition-colors"
          >
            Load more ({filtered.length - visible} left)
          </button>
        </div>
      )}

      {/* Selection bar */}
      {selected.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-50 border-t border-white/10 bg-[#0a0a0a]/95 backdrop-blur-xl">
          <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
            <p className="text-xs text-neutral-500 truncate">
              <span className="text-white font-semibold">{selected.length}</span> selected:{" "}
              <span className="font-mono text-neutral-400">{selected.join(", ")}</span>
            </p>
            <button
              onClick={copy}
              className="shrink-0 px-4 py-2 rounded-lg bg-accent text-black text-sm font-semibold hover:bg-accent-light transition-colors"
            >
              {copied ? "Copied!" : "Copy EXAMPLES snippet"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
