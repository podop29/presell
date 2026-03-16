"use client";

import { useRef, useCallback } from "react";

const px = (id: number, w: number, h: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}&h=${h}&fit=crop`;

const img = {
  // Storefront — charming bakery with breads in window
  storefront: px(3639541, 500, 300),
  // Pastry display case
  display: px(14363849, 400, 300),
  // Cozy bakery interior with pastries on shelves
  interior: px(29380150, 400, 300),
  // Croissants close-up
  croissants: px(6537669, 400, 250),
  // Artisan sourdough bread
  sourdough: px(30632198, 400, 250),
  // Latte art
  latte: px(171346, 400, 250),
  // Coffee drinks on tray
  coffeeTray: px(31736001, 400, 250),
  // Hero — bakery showcase with pastries
  heroSite: px(29696186, 600, 400),
};

export default function MapsToSite() {
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
      {/* ───── GOOGLE MAPS LISTING ───── */}
      <div className="flex flex-col">
        <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-3 text-center">
          Google Maps listing
        </p>
        <div className="flex-1 rounded-xl border border-white/10 overflow-hidden bg-[#1a1a1a]">
          <BrowserChrome url="google.com/maps/place/Sunrise+Bakery" />
          <div
            ref={leftRef}
            onScroll={() => syncScroll("left")}
            className="h-[480px] overflow-y-auto overscroll-contain scrollbar-thin"
          >
            <MapsListing />
          </div>
        </div>
      </div>

      {/* ───── GENERATED SITE ───── */}
      <div className="flex flex-col">
        <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider mb-3 text-center">
          PitchKit generated site
        </p>
        <div className="flex-1 rounded-xl border border-white/10 overflow-hidden bg-[#1a1a1a]">
          <BrowserChrome url="pitchkit.pro/preview/sunrise-bakery" />
          <div
            ref={rightRef}
            onScroll={() => syncScroll("right")}
            className="h-[480px] overflow-y-auto overscroll-contain scrollbar-thin"
          >
            <GeneratedSite />
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
   GOOGLE MAPS LISTING — realistic Maps panel
   ───────────────────────────────────────────── */
function MapsListing() {
  return (
    <div style={{ fontFamily: "'Google Sans', Roboto, Arial, sans-serif", background: "#fff", color: "#202124", minHeight: "100%" }}>
      {/* Map area */}
      <div
        style={{
          height: 130,
          background: "#e8f0e4",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Simplified map grid */}
        <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
          {/* Roads */}
          <line x1="0" y1="40" x2="100%" y2="40" stroke="#fff" strokeWidth="4" />
          <line x1="0" y1="90" x2="100%" y2="90" stroke="#fff" strokeWidth="3" />
          <line x1="80" y1="0" x2="80" y2="100%" stroke="#fff" strokeWidth="4" />
          <line x1="200" y1="0" x2="200" y2="100%" stroke="#fff" strokeWidth="3" />
          <line x1="300" y1="0" x2="350" y2="100%" stroke="#fff" strokeWidth="3" />
          <line x1="0" y1="115" x2="100%" y2="115" stroke="#fff" strokeWidth="2" />
          <line x1="140" y1="0" x2="140" y2="100%" stroke="#fff" strokeWidth="2" />
          {/* Buildings */}
          <rect x="90" y="48" width="40" height="35" rx="2" fill="#d4ddd0" />
          <rect x="210" y="10" width="80" height="25" rx="2" fill="#d4ddd0" />
          <rect x="210" y="48" width="35" height="35" rx="2" fill="#d4ddd0" />
          <rect x="310" y="48" width="30" height="35" rx="2" fill="#d4ddd0" />
          <rect x="20" y="95" width="50" height="15" rx="2" fill="#d4ddd0" />
          <rect x="150" y="95" width="40" height="15" rx="2" fill="#d4ddd0" />
        </svg>
        {/* Map pin */}
        <div
          style={{
            position: "absolute",
            top: 38,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              background: "#ea4335",
              borderRadius: "50% 50% 50% 0",
              transform: "rotate(-45deg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 6px rgba(0,0,0,.3)",
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                background: "#fff",
                borderRadius: "50%",
                transform: "rotate(45deg)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Business info panel */}
      <div style={{ padding: "16px" }}>
        {/* Name + category */}
        <div style={{ fontSize: 20, fontWeight: 500, color: "#202124", marginBottom: 2 }}>
          Sunrise Bakery &amp; Cafe
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#202124" }}>4.6</span>
          <span style={{ color: "#f4b400", fontSize: 13, letterSpacing: -1 }}>★★★★★</span>
          <span style={{ fontSize: 13, color: "#70757a" }}>(284)</span>
          <span style={{ fontSize: 13, color: "#70757a" }}>&middot;</span>
          <span style={{ fontSize: 13, color: "#70757a" }}>Bakery</span>
        </div>
        <div style={{ fontSize: 13, color: "#70757a", marginBottom: 4 }}>$$  &middot;  Open &middot; Closes 6 PM</div>
        <div style={{ fontSize: 13, color: "#70757a", marginBottom: 12 }}>
          2847 NE Alberta St, Portland, OR 97211
        </div>

        {/* Action buttons row */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          {[
            { icon: "↗", label: "Directions", color: "#1a73e8" },
            { icon: "📞", label: "Call", color: "#1a73e8" },
            { icon: "⬆", label: "Share", color: "#1a73e8" },
            { icon: "🌐", label: "Website", color: "#70757a" },
          ].map((btn) => (
            <div key={btn.label} style={{ textAlign: "center", flex: 1 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: btn.label === "Website" ? "#f1f3f4" : "#e8f0fe",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 4px",
                  fontSize: 14,
                }}
              >
                {btn.icon}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: btn.label === "Website" ? "#70757a" : "#1a73e8",
                  fontWeight: 500,
                  textDecoration: btn.label === "Website" ? "line-through" : "none",
                }}
              >
                {btn.label}
              </div>
            </div>
          ))}
        </div>

        {/* No website notice */}
        <div
          style={{
            background: "#fef7e0",
            border: "1px solid #fdd835",
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 12,
            color: "#5f6368",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 16 }}>⚠️</span>
          <span>No website listed for this business</span>
        </div>

        {/* Photos strip */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#202124", marginBottom: 8 }}>Photos</div>
          <div style={{ display: "flex", gap: 4, overflow: "hidden", borderRadius: 8 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.storefront} alt="" style={{ width: "45%", height: 80, objectFit: "cover" }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.display} alt="" style={{ width: "28%", height: 80, objectFit: "cover" }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.interior} alt="" style={{ width: "27%", height: 80, objectFit: "cover", position: "relative" }} />
          </div>
          <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.croissants} alt="" style={{ width: "33%", height: 60, objectFit: "cover", borderRadius: 4 }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.latte} alt="" style={{ width: "33%", height: 60, objectFit: "cover", borderRadius: 4 }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.sourdough} alt="" style={{ width: "34%", height: 60, objectFit: "cover", borderRadius: 4 }} />
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "#e8eaed", marginBottom: 16 }} />

        {/* Hours */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#202124", marginBottom: 6 }}>Hours</div>
          {[
            ["Monday", "6 AM–6 PM"],
            ["Tuesday", "6 AM–6 PM"],
            ["Wednesday", "6 AM–6 PM"],
            ["Thursday", "6 AM–6 PM"],
            ["Friday", "6 AM–7 PM"],
            ["Saturday", "7 AM–7 PM"],
            ["Sunday", "7 AM–4 PM"],
          ].map(([day, hrs]) => (
            <div
              key={day}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                color: "#3c4043",
                padding: "3px 0",
              }}
            >
              <span>{day}</span>
              <span style={{ color: "#70757a" }}>{hrs}</span>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "#e8eaed", marginBottom: 16 }} />

        {/* Reviews */}
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#202124", marginBottom: 8 }}>Reviews</div>
          {[
            {
              name: "Megan W.",
              time: "3 months ago",
              stars: 5,
              text: "Best sourdough in Portland, hands down. The croissants are flaky and buttery. Love the cozy atmosphere too.",
            },
            {
              name: "David R.",
              time: "5 months ago",
              stars: 5,
              text: "We come here every Saturday morning. The pastries are always fresh, the coffee is great, and the staff is so friendly.",
            },
            {
              name: "Lisa T.",
              time: "7 months ago",
              stars: 4,
              text: "Wonderful bakery. The sourdough loaves are incredible. Only wish they had more seating during busy hours.",
            },
          ].map((review) => (
            <div
              key={review.name}
              style={{
                marginBottom: 14,
                paddingBottom: 14,
                borderBottom: "1px solid #e8eaed",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "#e8eaed",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 500,
                    color: "#5f6368",
                  }}
                >
                  {review.name[0]}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "#202124" }}>{review.name}</div>
                  <div style={{ fontSize: 11, color: "#70757a" }}>{review.time}</div>
                </div>
              </div>
              <div style={{ color: "#f4b400", fontSize: 12, letterSpacing: -1, marginBottom: 4 }}>
                {"★".repeat(review.stars)}{"☆".repeat(5 - review.stars)}
              </div>
              <div style={{ fontSize: 12, color: "#3c4043", lineHeight: 1.5 }}>
                {review.text}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   GENERATED SITE — built from Maps data
   ───────────────────────────────────────────── */
function GeneratedSite() {
  return (
    <div style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", background: "#fffdf8", color: "#1a1a1a", minHeight: "100%" }}>
      {/* Nav */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 20px",
          background: "#fff",
          borderBottom: "1px solid #f0ebe0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "#92400e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            S
          </div>
          <span style={{ fontWeight: 600, fontSize: 14, color: "#292524", letterSpacing: "-0.01em" }}>
            Sunrise Bakery
          </span>
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 11, color: "#78716c", alignItems: "center" }}>
          <span>Menu</span>
          <span>About</span>
          <span>Visit</span>
          <span
            style={{
              background: "#92400e",
              color: "#fff",
              padding: "5px 14px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            Order Online
          </span>
        </div>
      </div>

      {/* Hero — full width image with overlay */}
      <div style={{ position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img.heroSite}
          alt=""
          style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.1) 60%)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: "20px",
          }}
        >
          <div
            style={{
              display: "inline-block",
              fontSize: 9,
              fontWeight: 600,
              color: "#fef3c7",
              background: "rgba(146,64,14,0.7)",
              borderRadius: 20,
              padding: "3px 10px",
              marginBottom: 8,
              letterSpacing: 0.5,
              width: "fit-content",
            }}
          >
            PORTLAND&apos;S FAVORITE SINCE 2012
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              lineHeight: 1.15,
              color: "#fff",
              letterSpacing: "-0.02em",
              marginBottom: 4,
            }}
          >
            Baked fresh,<br />every morning.
          </div>
          <p style={{ fontSize: 12, color: "#d6d3d1", lineHeight: 1.5, marginBottom: 14, maxWidth: 280 }}>
            Artisan breads, handmade pastries, and craft coffee on NE Alberta.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <span
              style={{
                background: "#92400e",
                color: "#fff",
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              View Menu
            </span>
            <span
              style={{
                background: "rgba(255,255,255,0.15)",
                backdropFilter: "blur(4px)",
                color: "#fff",
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 600,
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              Get Directions
            </span>
          </div>
        </div>
      </div>

      {/* Quick info bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 24,
          padding: "14px 20px",
          background: "#fff",
          borderBottom: "1px solid #f0ebe0",
        }}
      >
        {[
          ["4.6 ★", "284 reviews"],
          ["Open today", "until 6 PM"],
          ["NE Alberta", "Portland, OR"],
        ].map(([val, label]) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#292524" }}>{val}</div>
            <div style={{ fontSize: 10, color: "#a8a29e" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Popular items */}
      <div style={{ padding: "24px 20px" }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: "#92400e", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
          Popular
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: "#292524", marginBottom: 14, letterSpacing: "-0.01em" }}>
          Our bestsellers
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { name: "Sourdough Loaf", desc: "Naturally leavened, stone-baked", photo: img.sourdough },
            { name: "Butter Croissant", desc: "36-hour laminated dough", photo: img.croissants },
            { name: "Craft Latte", desc: "Locally roasted, house-made oat milk", photo: img.latte },
            { name: "Pastry Box", desc: "Chef's selection of 6 pastries", photo: img.coffeeTray },
          ].map((item) => (
            <div
              key={item.name}
              style={{
                borderRadius: 10,
                border: "1px solid #f0ebe0",
                overflow: "hidden",
                background: "#fff",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.photo} alt="" style={{ width: "100%", height: 60, objectFit: "cover", display: "block" }} />
              <div style={{ padding: "10px 12px" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#292524", marginBottom: 2 }}>
                  {item.name}
                </div>
                <div style={{ fontSize: 10, color: "#a8a29e", lineHeight: 1.4 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* About — image + text */}
      <div
        style={{
          display: "flex",
          margin: "0 20px 20px",
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid #f0ebe0",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img.interior}
          alt=""
          style={{ width: "40%", objectFit: "cover", display: "block", minHeight: 120 }}
        />
        <div style={{ flex: 1, padding: "16px", background: "#fff" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#292524", marginBottom: 6 }}>
            A neighborhood staple
          </div>
          <p style={{ fontSize: 10, color: "#78716c", lineHeight: 1.6, margin: 0 }}>
            Since 2012, Sunrise Bakery has been a cornerstone of the Alberta Arts District.
            Every loaf is shaped by hand, every pastry made from scratch, and every cup of
            coffee poured with care.
          </p>
        </div>
      </div>

      {/* Reviews from Maps */}
      <div style={{ padding: "20px", background: "#faf8f3", borderTop: "1px solid #f0ebe0" }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: "#92400e", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
          Reviews
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#292524", marginBottom: 12, letterSpacing: "-0.01em" }}>
          What our customers say
        </div>
        {[
          {
            text: "Best sourdough in Portland, hands down. The croissants are flaky and buttery. Love the cozy atmosphere too.",
            name: "Megan W.",
          },
          {
            text: "We come here every Saturday morning. The pastries are always fresh, the coffee is great, and the staff is so friendly.",
            name: "David R.",
          },
        ].map((r) => (
          <div
            key={r.name}
            style={{
              background: "#fff",
              borderRadius: 10,
              padding: "14px",
              border: "1px solid #f0ebe0",
              marginBottom: 10,
            }}
          >
            <div style={{ display: "flex", gap: 2, marginBottom: 6 }}>
              {"★★★★★".split("").map((s, i) => (
                <span key={i} style={{ color: "#f59e0b", fontSize: 11 }}>{s}</span>
              ))}
            </div>
            <p style={{ fontSize: 11, color: "#57534e", lineHeight: 1.6, margin: 0 }}>
              &ldquo;{r.text}&rdquo;
            </p>
            <div style={{ marginTop: 8, fontSize: 10, color: "#a8a29e" }}>{r.name}</div>
          </div>
        ))}
      </div>

      {/* Visit us / map-like section */}
      <div style={{ padding: "20px", borderTop: "1px solid #f0ebe0" }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: "#92400e", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
          Visit us
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#292524", marginBottom: 12 }}>
          Find us on Alberta
        </div>
        {/* Simplified map block */}
        <div
          style={{
            height: 80,
            borderRadius: 10,
            background: "#e8f0e4",
            position: "relative",
            overflow: "hidden",
            marginBottom: 12,
            border: "1px solid #d4ddd0",
          }}
        >
          <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
            <line x1="0" y1="40" x2="100%" y2="40" stroke="#fff" strokeWidth="3" />
            <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#fff" strokeWidth="3" />
            <rect x="30%" y="50" width="15%" height="20" rx="2" fill="#d4ddd0" />
            <rect x="55%" y="12" width="20%" height="22" rx="2" fill="#d4ddd0" />
          </svg>
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -70%)",
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                background: "#92400e",
                borderRadius: "50% 50% 50% 0",
                transform: "rotate(-45deg)",
                boxShadow: "0 2px 4px rgba(0,0,0,.2)",
              }}
            />
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#57534e" }}>
          <div>
            <div style={{ fontWeight: 600, color: "#292524", marginBottom: 2 }}>2847 NE Alberta St</div>
            <div>Portland, OR 97211</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 600, color: "#292524", marginBottom: 2 }}>Open today</div>
            <div>6 AM – 6 PM</div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: "28px 20px", background: "#92400e", textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 6, letterSpacing: "-0.01em" }}>
          Start your morning right
        </div>
        <p style={{ fontSize: 12, color: "#fde68a", marginBottom: 16 }}>
          Fresh pastries, artisan bread, and craft coffee — every day.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
          <span
            style={{
              display: "inline-block",
              background: "#fff",
              color: "#92400e",
              padding: "9px 22px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            View Full Menu
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
            Get Directions
          </span>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "16px 20px",
          background: "#fff",
          borderTop: "1px solid #f0ebe0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: 10, color: "#a8a29e" }}>
          &copy; 2026 Sunrise Bakery &amp; Cafe &middot; Portland, OR
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 10, color: "#a8a29e" }}>
          <span>Instagram</span>
          <span>Contact</span>
        </div>
      </div>
    </div>
  );
}
