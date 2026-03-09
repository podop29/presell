import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { validateExternalUrl } from "@/lib/validate-url";

export const dynamic = "force-dynamic";

/**
 * Proxies the original website HTML so it can be loaded in an iframe
 * on our HTTPS page without mixed-content errors, CORS blocks, and
 * X-Frame-Options restrictions.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;

  const { data, error } = await supabase
    .from("previews")
    .select("original_url, expires_at")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    return new NextResponse("Preview not found", { status: 404 });
  }

  if (new Date(data.expires_at) < new Date()) {
    return new NextResponse("This preview has expired", { status: 410 });
  }

  const validation = validateExternalUrl(data.original_url);
  if (!validation.valid) {
    return new NextResponse("Invalid URL", { status: 400 });
  }

  try {
    const res = await fetch(data.original_url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      console.error(
        `[original-site] ${data.original_url} returned ${res.status}`
      );
      return new NextResponse(
        `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body { margin:0; font-family:system-ui,sans-serif; background:#09090b;
         color:#a1a1aa; display:flex; align-items:center; justify-content:center;
         height:100vh; text-align:center; padding:2rem; }
  a { color:#10b981; }
</style></head><body>
<div>
  <p>Unable to load a preview of the current site.</p>
  <p><a href="${data.original_url}" target="_blank" rel="noopener">${data.original_url}</a></p>
</div>
</body></html>`,
        {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
          },
        }
      );
    }

    let html = await res.text();
    const origin = new URL(data.original_url).origin;
    const proxyBase =
      process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const proxyPrefix = `${proxyBase}/api/proxy-image?url=`;

    // Helper: proxy a single URL
    const proxyUrl = (rawUrl: string): string => {
      const trimmed = rawUrl.trim();
      if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("#")) {
        return rawUrl;
      }
      let absUrl: string;
      if (/^https?:\/\//i.test(trimmed)) {
        absUrl = trimmed;
      } else if (trimmed.startsWith("//")) {
        absUrl = `https:${trimmed}`;
      } else if (trimmed.startsWith("/")) {
        absUrl = `${origin}${trimmed}`;
      } else {
        absUrl = `${origin}/${trimmed}`;
      }
      return `${proxyPrefix}${encodeURIComponent(absUrl)}`;
    }

    // Step 1: Strip <script>...</script> blocks, rewrite everything else,
    // then restore scripts untouched. This prevents mangling JS code.
    const scripts: string[] = [];
    html = html.replace(/<script[\s\S]*?<\/script>/gi, (match) => {
      scripts.push(match);
      return `<!--__PROXY_SCRIPT_${scripts.length - 1}__-->`;
    });

    // Step 2: Rewrite srcset (comma-separated list of "url descriptor")
    html = html.replace(
      /srcset=(["'])([\s\S]*?)\1/gi,
      (_match, q, value: string) => {
        const rewritten = value
          .split(",")
          .map((entry) => {
            const parts = entry.trim().split(/\s+/);
            if (parts.length >= 1 && parts[0]) {
              parts[0] = proxyUrl(parts[0]);
            }
            return parts.join(" ");
          })
          .join(", ");
        return `srcset=${q}${rewritten}${q}`;
      }
    );

    // Step 3: Rewrite src, href, poster, content attributes (not srcset)
    html = html.replace(
      /(src|href|poster|content)=(["'])((?!data:|mailto:|javascript:|#|\{)[^"']*)(["'])/gi,
      (_match, attr, q1, url, q2) => {
        return `${attr}=${q1}${proxyUrl(url)}${q2}`;
      }
    );

    // Step 4: Rewrite url() in inline styles
    html = html.replace(
      /url\((["']?)((?!data:)[^)"']+)(["']?)\)/gi,
      (_match, q1, url, q2) => {
        return `url(${q1}${proxyUrl(url)}${q2})`;
      }
    );

    // Step 5: Restore script blocks. Rewrite only their src attributes
    // (for external scripts) but leave inline JS code untouched.
    html = html.replace(
      /<!--__PROXY_SCRIPT_(\d+)__-->/g,
      (_match, idx: string) => {
        let script = scripts[parseInt(idx)];
        // Rewrite src attribute on the <script> tag itself
        script = script.replace(
          /(<script[^>]*?\ssrc=)(["'])((?!data:)[^"']*)(["'])/i,
          (_m, pre, q1, url, q2) => {
            return `${pre}${q1}${proxyUrl(url)}${q2}`;
          }
        );
        return script;
      }
    );

    // Step 6: Inject a <base> tag so any URLs we missed (e.g. dynamically
    // injected by JS) at least resolve to the original domain.
    const baseTag = `<base href="${origin}/">`;
    if (/<head([^>]*)>/i.test(html)) {
      html = html.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`);
    } else {
      html = baseTag + html;
    }

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error(
      `[original-site] Failed to fetch ${data.original_url}: ${msg}`
    );
    return new NextResponse(`Failed to fetch original site: ${msg}`, {
      status: 502,
    });
  }
}
