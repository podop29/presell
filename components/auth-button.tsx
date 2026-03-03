"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function AuthButton() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
      if (user) {
        fetch("/api/credits")
          .then((r) => r.json())
          .then((d) => setBalance(d.balance ?? null))
          .catch(() => {});
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        fetch("/api/credits")
          .then((r) => r.json())
          .then((d) => setBalance(d.balance ?? null))
          .catch(() => {});
      } else {
        setBalance(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setBalance(null);
    router.push("/");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="w-20 h-8 rounded-md bg-white/5 animate-pulse" />
    );
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="text-xs text-neutral-400 hover:text-white transition-colors px-3 py-1.5 rounded-md border border-white/10 hover:border-white/20"
      >
        Sign In
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/dashboard"
        className="text-xs text-neutral-400 hover:text-white transition-colors"
      >
        Dashboard
      </Link>
      <Link
        href="/settings"
        className="text-xs text-neutral-400 hover:text-white transition-colors"
      >
        Settings
      </Link>
      <Link
        href="/credits"
        className="text-xs text-neutral-400 hover:text-white transition-colors flex items-center gap-1"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="8" />
          <path d="M14.5 9a3.5 3.5 0 0 0-5 0" />
          <path d="M9.5 15a3.5 3.5 0 0 0 5 0" />
          <line x1="12" y1="9" x2="12" y2="15" />
        </svg>
        {balance !== null ? balance : "–"}
      </Link>
      <button
        onClick={handleSignOut}
        className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors px-3 py-1.5 rounded-md border border-white/10 hover:border-white/20"
      >
        Sign Out
      </button>
    </div>
  );
}
