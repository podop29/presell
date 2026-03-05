import { ImageResponse } from "next/og";

export const alt = "PitchKit — AI Website Redesign Tool for Freelancers & Agencies";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0a0a",
          backgroundImage:
            "radial-gradient(circle at 50% 40%, rgba(234,179,8,0.08) 0%, transparent 60%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 32,
          }}
        >
          <span
            style={{
              fontSize: 48,
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "-0.02em",
            }}
          >
            pitchkit
          </span>
          <span
            style={{
              fontSize: 48,
              fontWeight: 700,
              color: "#eab308",
            }}
          >
            .
          </span>
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: "#ffffff",
            textAlign: "center",
            lineHeight: 1.15,
            maxWidth: 900,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <span>Show the website.</span>
          <span style={{ color: "#eab308" }}>Close the client.</span>
        </div>
        <div
          style={{
            marginTop: 32,
            fontSize: 22,
            color: "#a3a3a3",
            textAlign: "center",
            maxWidth: 700,
          }}
        >
          AI website redesign tool for freelancers & agencies
        </div>
      </div>
    ),
    { ...size }
  );
}
