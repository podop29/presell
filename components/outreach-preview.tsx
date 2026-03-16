"use client";

import { useRef, useCallback } from "react";

/**
 * Two-part section:
 *  Left  — a realistic Gmail-style email mockup showing the cold email
 *  Right — the preview page the prospect lands on when they click the link
 */

export default function OutreachPreview() {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);

  const syncScroll = useCallback((source: "left" | "right") => {
    if (isSyncing.current) return;
    isSyncing.current = true;

    const from = source === "left" ? leftRef.current : rightRef.current;
    const to = source === "left" ? rightRef.current : leftRef.current;
    if (from && to) {
      const pct = from.scrollTop / (from.scrollHeight - from.clientHeight || 1);
      to.scrollTop = pct * (to.scrollHeight - to.clientHeight);
    }

    requestAnimationFrame(() => {
      isSyncing.current = false;
    });
  }, []);

  return (
    <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto">
      {/* ───── EMAIL ───── */}
      <div className="flex flex-col">
        <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-3 text-center">
          The cold email
        </p>
        <div className="flex-1 rounded-xl border border-white/10 overflow-hidden bg-[#1a1a1a]">
          <BrowserChrome url="mail.google.com" />
          <div
            ref={leftRef}
            onScroll={() => syncScroll("left")}
            className="h-[480px] overflow-y-auto overscroll-contain scrollbar-thin"
          >
            <EmailMockup />
          </div>
        </div>
      </div>

      {/* ───── PREVIEW PAGE ───── */}
      <div className="flex flex-col">
        <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider mb-3 text-center">
          What they see when they click
        </p>
        <div className="flex-1 rounded-xl border border-white/10 overflow-hidden bg-[#1a1a1a]">
          <BrowserChrome url="mypreviewsite.link/preview/sunrise-bakery" />
          <div
            ref={rightRef}
            onScroll={() => syncScroll("right")}
            className="h-[480px] overflow-y-auto overscroll-contain scrollbar-thin"
          >
            <PreviewPageMockup />
          </div>
        </div>
      </div>
    </div>
  );
}

function BrowserChrome({ url }: { url: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2 bg-[#222] border-b border-white/5">
      <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
      <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
      <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
      <span className="ml-3 flex-1 text-[10px] text-neutral-500 bg-[#1a1a1a] rounded px-2 py-0.5 truncate">
        {url}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────
   GMAIL-STYLE EMAIL MOCKUP
   ───────────────────────────────────────────── */
function EmailMockup() {
  return (
    <div style={{ fontFamily: "'Google Sans', Roboto, Arial, sans-serif", background: "#fff", color: "#202124", minHeight: "100%" }}>
      {/* Gmail toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "8px 14px",
          borderBottom: "1px solid #e8eaed",
          background: "#f6f8fc",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5f6368" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5f6368" strokeWidth="2">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
        <div style={{ flex: 1 }} />
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5f6368" strokeWidth="2">
          <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
        </svg>
      </div>

      {/* Email content */}
      <div style={{ padding: "20px 16px" }}>
        {/* Subject */}
        <div style={{ fontSize: 18, fontWeight: 400, color: "#202124", marginBottom: 16 }}>
          Quick idea for Sunrise Bakery
        </div>

        {/* Sender info */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 20 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            A
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#202124" }}>Alex Rivera</span>
              <span style={{ fontSize: 12, color: "#5f6368" }}>&lt;alex@riveradesign.co&gt;</span>
            </div>
            <div style={{ fontSize: 12, color: "#5f6368", marginTop: 1 }}>
              to me
            </div>
          </div>
          <div style={{ fontSize: 11, color: "#5f6368", whiteSpace: "nowrap" }}>
            10:32 AM
          </div>
        </div>

        {/* Email body */}
        <div style={{ fontSize: 13.5, color: "#202124", lineHeight: 1.7 }}>
          <p style={{ margin: "0 0 14px" }}>
            Hi there,
          </p>
          <p style={{ margin: "0 0 14px" }}>
            I came across Sunrise Bakery on Google Maps — the reviews are fantastic and
            it&apos;s clear you&apos;ve built something people love. I noticed you don&apos;t
            have a website yet, so I went ahead and built one for you as a quick concept.
          </p>
          <p style={{ margin: "0 0 14px" }}>
            I pulled in your photos, reviews, hours, and menu details from your listing. You
            can check it out here:
          </p>
          <p style={{ margin: "0 0 14px" }}>
            <span
              style={{
                color: "#1a73e8",
                textDecoration: "underline",
                cursor: "pointer",
                wordBreak: "break-all",
              }}
            >
              mypreviewsite.link/preview/sunrise-bakery
            </span>
          </p>
          <p style={{ margin: "0 0 14px" }}>
            No strings attached — just wanted to show you what&apos;s possible. If you like
            it and want to take it further, I&apos;d be happy to chat.
          </p>
          <p style={{ margin: "0 0 4px" }}>
            Best,
          </p>
          <p style={{ margin: 0 }}>
            Alex
          </p>
        </div>
      </div>

      {/* Gmail reply bar */}
      <div style={{ margin: "20px 16px 0", borderTop: "1px solid #e8eaed", paddingTop: 16 }}>
        <div
          style={{
            border: "1px solid #e8eaed",
            borderRadius: 20,
            padding: "10px 16px",
            fontSize: 13,
            color: "#5f6368",
            cursor: "text",
          }}
        >
          Click here to <span style={{ color: "#1a73e8", fontWeight: 500 }}>Reply</span>
        </div>
      </div>

      {/* Visual indicator — prospect clicks the link */}
      <div
        style={{
          margin: "24px 16px 20px",
          padding: "12px 16px",
          background: "#f0f9ff",
          border: "1px solid #bae6fd",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "#0ea5e9",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#0c4a6e" }}>
            They click the preview link
          </div>
          <div style={{ fontSize: 11, color: "#0369a1" }}>
            And land on a page built just for their business →
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PREVIEW PAGE MOCKUP — what the prospect sees
   ───────────────────────────────────────────── */

const px = (id: number, w: number, h: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}&h=${h}&fit=crop`;

function PreviewPageMockup() {
  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", background: "#0a0a0a", minHeight: "100%", display: "flex", flexDirection: "column" }}>
      {/* Preview top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 14px",
          background: "rgba(17,17,17,0.95)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div style={{ fontSize: 11, color: "#888" }}>
          sunrisebakery.com
        </div>
        {/* Style tabs */}
        <div style={{ display: "flex", gap: 2, background: "rgba(255,255,255,0.05)", borderRadius: 6, padding: 2 }}>
          {["Original", "Style A", "Style B", "Style C"].map((tab, i) => (
            <div
              key={tab}
              style={{
                padding: "3px 8px",
                borderRadius: 4,
                fontSize: 10,
                fontWeight: 500,
                color: i === 1 ? "#fff" : "#666",
                background: i === 1 ? "rgba(255,255,255,0.1)" : "transparent",
              }}
            >
              {tab}
            </div>
          ))}
        </div>
      </div>

      {/* Website iframe area — simplified bakery site */}
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: "#fffdf8", color: "#1a1a1a" }}>
          {/* Site nav */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 16px",
              background: "#fff",
              borderBottom: "1px solid #f0ebe0",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: "#92400e",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                S
              </div>
              <span style={{ fontWeight: 600, fontSize: 12, color: "#292524" }}>
                Sunrise Bakery
              </span>
            </div>
            <div style={{ display: "flex", gap: 12, fontSize: 10, color: "#78716c", alignItems: "center" }}>
              <span>Menu</span>
              <span>About</span>
              <span
                style={{
                  background: "#92400e",
                  color: "#fff",
                  padding: "4px 10px",
                  borderRadius: 5,
                  fontSize: 10,
                  fontWeight: 600,
                }}
              >
                Order
              </span>
            </div>
          </div>

          {/* Hero image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={px(29696186, 600, 260)}
            alt=""
            style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }}
          />

          {/* Content area */}
          <div style={{ padding: "20px 16px" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#292524", letterSpacing: "-0.02em", marginBottom: 6, lineHeight: 1.2 }}>
              Baked fresh,<br />
              <span style={{ color: "#92400e" }}>every morning.</span>
            </div>
            <p style={{ fontSize: 11, color: "#78716c", lineHeight: 1.6, marginBottom: 16 }}>
              Artisan breads, handmade pastries, and craft coffee on NE Alberta.
            </p>

            {/* Quick stats */}
            <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
              {[["4.6 ★", "284 reviews"], ["Open", "until 6 PM"]].map(([v, l]) => (
                <div key={l}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#292524" }}>{v}</div>
                  <div style={{ fontSize: 9, color: "#a8a29e" }}>{l}</div>
                </div>
              ))}
            </div>

            {/* Product cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { name: "Sourdough Loaf", img: px(30632198, 300, 180) },
                { name: "Butter Croissant", img: px(6537669, 300, 180) },
              ].map((item) => (
                <div
                  key={item.name}
                  style={{
                    borderRadius: 8,
                    border: "1px solid #f0ebe0",
                    overflow: "hidden",
                    background: "#fff",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.img} alt="" style={{ width: "100%", height: 50, objectFit: "cover", display: "block" }} />
                  <div style={{ padding: "8px 10px", fontSize: 11, fontWeight: 600, color: "#292524" }}>
                    {item.name}
                  </div>
                </div>
              ))}
            </div>

            {/* Review snippet */}
            <div
              style={{
                marginTop: 16,
                padding: "12px",
                background: "#faf8f3",
                borderRadius: 8,
                border: "1px solid #f0ebe0",
              }}
            >
              <div style={{ color: "#f59e0b", fontSize: 10, letterSpacing: -1, marginBottom: 4 }}>★★★★★</div>
              <p style={{ fontSize: 10, color: "#57534e", lineHeight: 1.5, margin: 0, fontStyle: "italic" }}>
                &ldquo;Best sourdough in Portland, hands down. The croissants are
                flaky and buttery.&rdquo;
              </p>
              <div style={{ fontSize: 9, color: "#a8a29e", marginTop: 4 }}>— Megan W.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA bar — the freelancer's branding */}
      <div
        style={{
          position: "sticky",
          bottom: 0,
          padding: "10px 14px",
          background: "rgba(17,17,17,0.97)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            A
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#e5e5e5" }}>Alex Rivera</div>
            <div style={{ fontSize: 9, color: "#666" }}>Rivera Design Co.</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 9, color: "#555", maxWidth: 120, textAlign: "right", lineHeight: 1.3 }}>
            Built this for you — let me know what you think!
          </div>
          <div
            style={{
              background: "#f59e0b",
              color: "#000",
              padding: "6px 14px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            Get in Touch
          </div>
        </div>
      </div>
    </div>
  );
}
