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

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
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
      <button
        onClick={handleSignOut}
        className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors px-3 py-1.5 rounded-md border border-white/10 hover:border-white/20"
      >
        Sign Out
      </button>
    </div>
  );
}
