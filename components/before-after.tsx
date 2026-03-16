"use client";

import { useRef, useCallback } from "react";

/* Pexels image helper — uses their CDN resize params for fast loads */
const px = (id: number, w: number, h: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}&h=${h}&fit=crop`;

/* ── Image catalog ── */
const img = {
  // Plumber hands installing steel pipes — clean, professional
  heroGood: px(6419128, 600, 500),
  // Tools & faucet on blueprint — stock-y, dated feel
  heroBad: px(14953886, 600, 260),
  // Modern bathroom — sleek mosaic + glass shower
  bathroom: px(6934233, 400, 250),
  // Chrome kitchen faucet running water
  kitchen: px(34295401, 400, 250),
  // Hands adjusting boiler system
  boiler: px(7859953, 400, 250),
  // Plumber installing radiator pipe
  pipeWork: px(29226620, 400, 250),
  // White delivery van on city street
  van: px(11040957, 500, 300),
  // Water meter in concrete wall — gritty
  waterMeter: px(11658940, 250, 160),
  // Hand tools on dark surface
  tools: px(12105083, 250, 160),
  // Worker in PPE with wrench
  worker: px(8486928, 250, 160),
};

export default function BeforeAfter() {
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
      {/* ───── BAD SITE ───── */}
      <div className="flex flex-col">
        <p className="text-xs font-medium text-red-400 uppercase tracking-wider mb-3 text-center">
          Their current site
        </p>
        <div className="flex-1 rounded-xl border border-white/10 overflow-hidden bg-[#1a1a1a]">
          <BrowserChrome url="greenvalleyplumbing.com" />
          <div
            ref={leftRef}
            onScroll={() => syncScroll("left")}
            className="h-[480px] overflow-y-auto overscroll-contain scrollbar-thin"
          >
            <BadSite />
          </div>
        </div>
      </div>

      {/* ───── GOOD SITE ───── */}
      <div className="flex flex-col">
        <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider mb-3 text-center">
          PitchKit redesign
        </p>
        <div className="flex-1 rounded-xl border border-white/10 overflow-hidden bg-[#1a1a1a]">
          <BrowserChrome url="pitchkit.pro/preview/green-valley-plumbing" />
          <div
            ref={rightRef}
            onScroll={() => syncScroll("right")}
            className="h-[480px] overflow-y-auto overscroll-contain scrollbar-thin"
          >
            <GoodSite />
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
   BAD SITE
   ───────────────────────────────────────────── */
function BadSite() {
  return (
    <div style={{ fontFamily: "Arial, sans-serif", background: "#fff", color: "#333", minHeight: "100%" }}>
      {/* Top bar */}
      <div
        style={{
          background: "#1b5e20",
          color: "#fff",
          fontSize: 11,
          padding: "4px 14px",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>Serving Portland &amp; Surrounding Areas</span>
        <span style={{ fontWeight: "bold" }}>Call: (503) 555-0147</span>
      </div>

      {/* Header */}
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "3px solid #1b5e20",
          display: "flex",
          alignItems: "center",
          background: "#f5f5f5",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 36,
              height: 36,
              background: "#1b5e20",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 16,
              fontWeight: "bold",
            }}
          >
            GV
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: "bold", color: "#1b5e20", lineHeight: 1.1 }}>
              Green Valley Plumbing
            </div>
            <div style={{ fontSize: 9, color: "#888", fontStyle: "italic" }}>
              &quot;Your Local Plumbing Experts&quot;
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ display: "flex", background: "#2e7d32", padding: 0 }}>
        {["Home", "Services", "About Us", "Testimonials", "Service Area", "Contact"].map((item) => (
          <div
            key={item}
            style={{
              padding: "7px 11px",
              color: "#fff",
              fontSize: 11,
              borderRight: "1px solid #1b5e20",
            }}
          >
            {item}
          </div>
        ))}
      </div>

      {/* Hero banner with stock photo */}
      <div style={{ position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img.heroBad}
          alt=""
          style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              color: "#fff",
              fontSize: 20,
              fontWeight: "bold",
              textShadow: "2px 2px 4px rgba(0,0,0,.6)",
              textAlign: "center",
            }}
          >
            Quality Plumbing Services
          </div>
          <div style={{ color: "#cde6c0", fontSize: 12, marginTop: 4 }}>
            Licensed &amp; Insured - OR CCB #182456
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ padding: "16px 14px" }}>
        <h2 style={{ fontSize: 16, color: "#1b5e20", marginBottom: 8, fontFamily: "Georgia, serif" }}>
          Welcome to Green Valley Plumbing!
        </h2>

        {/* Float image left — classic old-site pattern */}
        <div style={{ float: "left", marginRight: 12, marginBottom: 8 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img.worker}
            alt=""
            style={{ width: 100, height: 75, objectFit: "cover", borderRadius: 2, border: "2px solid #ddd" }}
          />
          <div style={{ fontSize: 8, color: "#999", textAlign: "center", marginTop: 2 }}>
            Our team at work
          </div>
        </div>

        <p style={{ fontSize: 12, lineHeight: 1.7, color: "#555", marginBottom: 12 }}>
          Green Valley Plumbing has been providing quality plumbing services to the Portland metropolitan
          area since 2003. We are a family-owned and operated business committed to providing excellent
          customer service. Whether you need a simple faucet repair or a complete repipe of your home,
          we have the experience and expertise to get the job done right.
        </p>
        <p style={{ fontSize: 12, lineHeight: 1.7, color: "#555", marginBottom: 16, clear: "both" }}>
          We offer <b>free estimates</b> on all major work. Our plumbers are background-checked and drug-tested
          for your peace of mind. We stand behind all of our work with a 1-year warranty on parts and labor.
        </p>

        {/* Services */}
        <h3
          style={{
            fontSize: 14,
            color: "#1b5e20",
            borderBottom: "2px solid #1b5e20",
            paddingBottom: 4,
            marginBottom: 10,
            fontFamily: "Georgia, serif",
          }}
        >
          Our Services Include:
        </h3>
        <div style={{ display: "flex", gap: 20, fontSize: 12, color: "#444", marginBottom: 16 }}>
          <ul style={{ listStyleType: "square", paddingLeft: 16, margin: 0, lineHeight: 2 }}>
            <li>Drain Cleaning</li>
            <li>Leak Detection</li>
            <li>Water Heater Repair</li>
            <li>Faucet Installation</li>
            <li>Sewer Line Repair</li>
          </ul>
          <ul style={{ listStyleType: "square", paddingLeft: 16, margin: 0, lineHeight: 2 }}>
            <li>Toilet Repair</li>
            <li>Garbage Disposals</li>
            <li>Pipe Repair</li>
            <li>Water Filtration</li>
            <li>Emergency Service</li>
          </ul>
        </div>

        {/* Random image row — images just dropped in */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.waterMeter} alt="" style={{ flex: 1, height: 60, objectFit: "cover", borderRadius: 2, minWidth: 0 }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.tools} alt="" style={{ flex: 1, height: 60, objectFit: "cover", borderRadius: 2, minWidth: 0 }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.worker} alt="" style={{ flex: 1, height: 60, objectFit: "cover", borderRadius: 2, minWidth: 0 }} />
        </div>

        {/* Coupon */}
        <div
          style={{
            border: "2px dashed #c62828",
            borderRadius: 4,
            padding: "10px 14px",
            textAlign: "center",
            background: "#fff8e1",
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: "bold", color: "#c62828" }}>SPRING SPECIAL!</div>
          <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>
            $25 OFF Any Service Over $150 - Mention This Ad!
          </div>
          <div style={{ fontSize: 9, color: "#999", marginTop: 4 }}>
            Cannot be combined with other offers. Expires 04/30/2019.
          </div>
        </div>

        {/* Testimonial */}
        <div
          style={{
            background: "#f5f5f5",
            border: "1px solid #ddd",
            padding: "10px 14px",
            borderRadius: 2,
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 11, fontStyle: "italic", color: "#555", lineHeight: 1.6 }}>
            &quot;Mike came out the same day and fixed our leaking pipe. Very professional and fair price.
            Would recommend to anyone.&quot;
          </div>
          <div style={{ fontSize: 10, color: "#888", marginTop: 4 }}>- Robert S., Beaverton</div>
        </div>

        {/* Badges */}
        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 16 }}>
          {["BBB A+", "Angie's List", "Licensed"].map((badge) => (
            <div
              key={badge}
              style={{
                border: "1px solid #ccc",
                borderRadius: 2,
                padding: "6px 10px",
                fontSize: 9,
                color: "#666",
                background: "#fafafa",
                textAlign: "center",
              }}
            >
              {badge}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          background: "#333",
          color: "#aaa",
          padding: "12px 14px",
          fontSize: 10,
          lineHeight: 1.7,
        }}
      >
        <div>Green Valley Plumbing | 4821 SE Foster Rd, Portland OR 97206</div>
        <div>Phone: (503) 555-0147 | Email: info@greenvalleyplumbing.com</div>
        <div style={{ marginTop: 6, color: "#666", borderTop: "1px solid #444", paddingTop: 6 }}>
          &copy; 2016 Green Valley Plumbing. All rights reserved. | Website by Portland Web Solutions
        </div>
        <div style={{ color: "#555", fontSize: 9, marginTop: 2 }}>
          Last updated: March 14, 2019
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   GOOD SITE
   ───────────────────────────────────────────── */
function GoodSite() {
  return (
    <div style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", background: "#fff", color: "#1a1a1a", minHeight: "100%" }}>
      {/* Nav */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 20px",
          borderBottom: "1px solid #f0f0f0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "#166534",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            GV
          </div>
          <span style={{ fontWeight: 600, fontSize: 14, color: "#111", letterSpacing: "-0.01em" }}>
            Green Valley
          </span>
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 11, color: "#666", alignItems: "center" }}>
          <span>Services</span>
          <span>About</span>
          <span>Reviews</span>
          <span
            style={{
              background: "#166534",
              color: "#fff",
              padding: "5px 14px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            Get a Quote
          </span>
        </div>
      </div>

      {/* Hero — split layout with image */}
      <div style={{ display: "flex", background: "#fafdf7", borderBottom: "1px solid #f0f0f0" }}>
        <div style={{ flex: 1, padding: "32px 20px 28px" }}>
          <div
            style={{
              display: "inline-block",
              fontSize: 10,
              fontWeight: 600,
              color: "#166534",
              background: "#dcfce7",
              borderRadius: 20,
              padding: "3px 10px",
              marginBottom: 14,
              letterSpacing: 0.3,
            }}
          >
            Portland&apos;s trusted plumber since 2003
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              lineHeight: 1.15,
              color: "#0f172a",
              marginBottom: 10,
              letterSpacing: "-0.02em",
            }}
          >
            Plumbing problems?
            <br />
            <span style={{ color: "#166534" }}>Consider them solved.</span>
          </div>
          <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.65, marginBottom: 16 }}>
            Licensed, insured, and guaranteed. Same-day service with upfront pricing.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <span
              style={{
                background: "#166534",
                color: "#fff",
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              Book Online
            </span>
            <span
              style={{
                background: "#fff",
                color: "#166534",
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 600,
                border: "1px solid #bbf7d0",
              }}
            >
              (503) 555-0147
            </span>
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img.heroGood}
          alt=""
          style={{ width: "42%", objectFit: "cover", display: "block" }}
        />
      </div>

      {/* Social proof */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 28,
          padding: "14px 20px",
          borderBottom: "1px solid #f0f0f0",
        }}
      >
        {[
          ["20+", "Years in Portland"],
          ["4.8", "Google (312 reviews)"],
          ["Same day", "Available today"],
        ].map(([val, label]) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>{val}</div>
            <div style={{ fontSize: 10, color: "#94a3b8" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Services with images */}
      <div style={{ padding: "24px 20px" }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: "#166534", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
          Services
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", marginBottom: 14, letterSpacing: "-0.01em" }}>
          What we do best
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { name: "Drain Cleaning", desc: "Clogs & backups cleared fast", price: "From $99", photo: img.pipeWork },
            { name: "Water Heaters", desc: "Repair, replace & install", price: "From $150", photo: img.boiler },
            { name: "Leak Repair", desc: "Stop leaks before damage spreads", price: "From $85", photo: img.bathroom },
            { name: "Repiping", desc: "Full & partial pipe replacement", price: "Free estimate", photo: img.kitchen },
          ].map((s) => (
            <div
              key={s.name}
              style={{
                borderRadius: 10,
                border: "1px solid #f0f0f0",
                overflow: "hidden",
                background: "#fafafa",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.photo} alt="" style={{ width: "100%", height: 56, objectFit: "cover", display: "block" }} />
              <div style={{ padding: "10px 12px" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#1e293b", marginBottom: 2 }}>
                  {s.name}
                </div>
                <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 4, lineHeight: 1.4 }}>{s.desc}</div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#166534" }}>{s.price}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Why choose us — image + text */}
      <div
        style={{
          display: "flex",
          margin: "0 20px 20px",
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid #f0f0f0",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img.van}
          alt=""
          style={{ width: "40%", objectFit: "cover", display: "block", minHeight: 120 }}
        />
        <div style={{ flex: 1, padding: "16px", background: "#f8faf5" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
            Why Portland trusts us
          </div>
          {["Same-day emergency service", "Upfront, honest pricing", "1-year warranty on all work", "Background-checked team"].map(
            (item) => (
              <div
                key={item}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 10,
                  color: "#475569",
                  marginBottom: 5,
                }}
              >
                <span style={{ color: "#166534", fontSize: 12 }}>&#10003;</span>
                {item}
              </div>
            )
          )}
        </div>
      </div>

      {/* Reviews */}
      <div style={{ padding: "20px", background: "#f8faf5", borderTop: "1px solid #f0f0f0" }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: "#166534", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
          Reviews
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 12, letterSpacing: "-0.01em" }}>
          What our customers say
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            {
              text: "Had a burst pipe at 7am and they were here by 8:30. Fixed it quickly, cleaned up after themselves, and the price was exactly what they quoted.",
              name: "Robert S.",
              loc: "Beaverton, OR",
            },
            {
              text: "We've used Green Valley for years — water heater, kitchen faucet, bathroom reno. Always professional, always fair. Can't recommend enough.",
              name: "Jennifer M.",
              loc: "Portland, OR",
            },
          ].map((r) => (
            <div
              key={r.name}
              style={{
                background: "#fff",
                borderRadius: 10,
                padding: "14px",
                border: "1px solid #f0f0f0",
              }}
            >
              <div style={{ display: "flex", gap: 2, marginBottom: 6 }}>
                {"★★★★★".split("").map((s, i) => (
                  <span key={i} style={{ color: "#f59e0b", fontSize: 11 }}>
                    {s}
                  </span>
                ))}
              </div>
              <p style={{ fontSize: 11, color: "#475569", lineHeight: 1.6, margin: 0 }}>
                &ldquo;{r.text}&rdquo;
              </p>
              <div style={{ marginTop: 8, fontSize: 10, color: "#94a3b8" }}>
                {r.name} &middot; {r.loc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: "28px 20px", background: "#166534", textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 6, letterSpacing: "-0.01em" }}>
          Need a plumber today?
        </div>
        <p style={{ fontSize: 12, color: "#bbf7d0", marginBottom: 16 }}>
          Book online in 60 seconds or call for a free estimate.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
          <span
            style={{
              display: "inline-block",
              background: "#fff",
              color: "#166534",
              padding: "9px 22px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            Book Now
          </span>
          <span
            style={{
              display: "inline-block",
              background: "transparent",
              color: "#fff",
              padding: "9px 22px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              border: "1px solid rgba(255,255,255,.3)",
            }}
          >
            (503) 555-0147
          </span>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "16px 20px",
          borderTop: "1px solid #f0f0f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: 10, color: "#94a3b8" }}>
          &copy; 2026 Green Valley Plumbing &middot; Portland, OR
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 10, color: "#94a3b8" }}>
          <span>Privacy</span>
          <span>Terms</span>
        </div>
      </div>
    </div>
  );
}
