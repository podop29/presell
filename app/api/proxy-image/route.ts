import { NextRequest, NextResponse } from "next/server";
import { validateExternalUrl } from "@/lib/validate-url";

export const dynamic = "force-dynamic";

/**
 * Proxies external resources (images, CSS, JS, fonts) through our HTTPS
 * domain to avoid mixed-content errors for sites that only serve over HTTP.
 *
 * Usage: /api/proxy-image?url=http://example.com/img.jpg
 *
 * For CSS files, relative url() references are rewritten to also go
 * through this proxy so fonts and background images resolve correctly.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  const validation = validateExternalUrl(url);
  if (!validation.valid) {
    return new NextResponse("Invalid URL", { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "*/*",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      return new NextResponse("Failed to fetch resource", { status: 502 });
    }

    const contentType = res.headers.get("content-type") || "application/octet-stream";

    // For CSS files, rewrite relative url() references so fonts/images
    // inside the CSS also go through our proxy
    if (contentType.includes("text/css") || url.endsWith(".css")) {
      let css = await res.text();
      const parsedUrl = new URL(url);
      // Base directory of the CSS file (e.g. http://example.com/css/)
      const cssDir = url.substring(0, url.lastIndexOf("/") + 1);
      const proxyBase = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      const proxyPrefix = `${proxyBase}/api/proxy-image?url=`;

      // Rewrite absolute URLs in CSS
      css = css.replace(
        /url\((["']?)(https?:\/\/[^)"']+)(["']?)\)/gi,
        (_match, q1, absUrl, q2) => {
          return `url(${q1}${proxyPrefix}${encodeURIComponent(absUrl)}${q2})`;
        }
      );

      // Rewrite relative URLs in CSS
      css = css.replace(
        /url\((["']?)((?!https?:\/\/|\/\/|data:)[^)"']+)(["']?)\)/gi,
        (_match, q1, path, q2) => {
          let absUrl: string;
          if (path.startsWith("/")) {
            absUrl = `${parsedUrl.origin}${path}`;
          } else {
            absUrl = new URL(path, cssDir).href;
          }
          return `url(${q1}${proxyPrefix}${encodeURIComponent(absUrl)}${q2})`;
        }
      );

      return new NextResponse(css, {
        headers: {
          "Content-Type": "text/css; charset=utf-8",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse("Failed to fetch resource", { status: 502 });
  }
}
