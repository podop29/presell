"use client";

import { useEffect, useState } from "react";

export default function LiveCounter() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => setCount(d.count ?? 0))
      .catch(() => {});
  }, []);

  if (count === null || count < 10) return null;

  // Round down to nearest 10 for social proof (feels more authentic than exact)
  const display = Math.floor(count / 10) * 10;

  return (
    <p className="mt-3 text-xs text-neutral-600 text-center">
      No credit card required — start with a free credit
      <span className="mx-1.5 text-neutral-700">·</span>
      <span className="text-neutral-500">{display}+ redesigns generated</span>
    </p>
  );
}
