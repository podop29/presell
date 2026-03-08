/**
 * Validates that a URL is safe to fetch server-side.
 * Blocks private/internal IPs, non-HTTP protocols, and reserved ranges.
 */
export function validateExternalUrl(input: string): { valid: true; url: URL } | { valid: false; reason: string } {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { valid: false, reason: "Invalid URL format." };
  }

  // Only allow http/https
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { valid: false, reason: "Only HTTP and HTTPS URLs are allowed." };
  }

  const hostname = url.hostname.toLowerCase();

  // Block localhost and common loopback names
  const blockedHostnames = [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "[::1]",
    "[::]",
  ];
  if (blockedHostnames.includes(hostname)) {
    return { valid: false, reason: "This URL is not allowed." };
  }

  // Block private and reserved IP ranges
  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, a, b, c] = ipv4Match.map(Number);
    if (
      a === 10 ||                              // 10.0.0.0/8
      (a === 172 && b >= 16 && b <= 31) ||     // 172.16.0.0/12
      (a === 192 && b === 168) ||              // 192.168.0.0/16
      a === 127 ||                              // 127.0.0.0/8
      a === 0 ||                                // 0.0.0.0/8
      (a === 169 && b === 254) ||              // 169.254.0.0/16 (link-local / AWS metadata)
      (a === 100 && b >= 64 && b <= 127) ||    // 100.64.0.0/10 (carrier-grade NAT)
      (a === 198 && b === 18) ||               // 198.18.0.0/15 (benchmarking)
      (a === 198 && b === 19) ||
      (a === 192 && b === 0 && c === 0) ||     // 192.0.0.0/24
      a >= 224                                  // multicast + reserved
    ) {
      return { valid: false, reason: "This URL is not allowed." };
    }
  }

  // Block IPv6 private ranges (bracketed in URLs)
  if (hostname.startsWith("[")) {
    return { valid: false, reason: "IPv6 addresses are not allowed." };
  }

  // Block common internal hostnames
  if (
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".localhost")
  ) {
    return { valid: false, reason: "This URL is not allowed." };
  }

  return { valid: true, url };
}
