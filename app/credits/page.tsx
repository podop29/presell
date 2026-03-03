"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import AuthButton from "@/components/auth-button";

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  created_at: string;
}

const CREDIT_PACKS = [
  { id: "pack_5", credits: 5, price: 700, label: "Starter", perCredit: "$1.40" },
  { id: "pack_15", credits: 15, price: 1500, label: "Popular", perCredit: "$1.00" },
  { id: "pack_50", credits: 50, price: 4000, label: "Pro", perCredit: "$0.80" },
];

function CreditsPageInner() {
  const searchParams = useSearchParams();
  const purchaseSuccess = searchParams.get("purchase") === "success";

  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [showBanner, setShowBanner] = useState(purchaseSuccess);

  useEffect(() => {
    fetch("/api/credits")
      .then((r) => r.json())
      .then((data) => {
        setBalance(data.balance ?? 0);
        setTransactions(data.transactions ?? []);
      })
      .catch(() => setError("Failed to load credits."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (showBanner) {
      const t = setTimeout(() => setShowBanner(false), 5000);
      return () => clearTimeout(t);
    }
  }, [showBanner]);

  async function handleBuy(packId: string) {
    setBuying(packId);
    setError("");
    try {
      const res = await fetch("/api/credits/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Purchase failed.");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBuying(null);
    }
  }

  return (
    <main className="min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm font-semibold tracking-tight text-white"
          >
            presell<span className="text-accent">.</span>
          </Link>
          <AuthButton />
        </div>
      </nav>

      {/* Page Header */}
      <div className="pt-14 noise-bg border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="animate-fade-in-up">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Credits
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              Purchase credits to generate previews and unlock revisions
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8 animate-fade-in-up delay-100">
        {/* Success banner */}
        {showBanner && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
            <svg className="w-5 h-5 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <p className="text-sm text-emerald-400">
              Purchase successful! Your credits have been added.
            </p>
          </div>
        )}

        {loading ? (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl border border-[var(--border)] bg-surface animate-pulse">
              <div className="h-8 bg-neutral-800 rounded w-24" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-6 rounded-2xl border border-[var(--border)] bg-surface animate-pulse h-48" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Balance card */}
            <div className="p-6 rounded-2xl border border-[var(--border)] bg-surface">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
                Your Balance
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-white">{balance}</span>
                <span className="text-sm text-neutral-500">credits</span>
              </div>
            </div>

            {/* Credit packs */}
            <div>
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-4">
                Buy Credits
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {CREDIT_PACKS.map((pack) => {
                  const isPopular = pack.id === "pack_15";
                  return (
                    <div
                      key={pack.id}
                      className={`relative p-6 rounded-2xl border bg-surface flex flex-col ${
                        isPopular
                          ? "border-accent/40 shadow-lg shadow-accent/5"
                          : "border-[var(--border)]"
                      }`}
                    >
                      {isPopular && (
                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-accent text-black text-[10px] font-bold uppercase tracking-wider rounded-full">
                          Best Value
                        </span>
                      )}
                      <p className="text-lg font-bold text-white">{pack.label}</p>
                      <p className="text-sm text-neutral-400 mt-1">
                        {pack.credits} credits
                      </p>
                      <div className="mt-4 flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-white">
                          ${(pack.price / 100).toFixed(0)}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">
                        {pack.perCredit} per credit
                      </p>
                      <button
                        onClick={() => handleBuy(pack.id)}
                        disabled={buying !== null}
                        className={`mt-auto pt-4 w-full py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 ${
                          isPopular
                            ? "bg-accent hover:bg-accent-light text-black hover:shadow-lg hover:shadow-accent/20"
                            : "bg-white/10 hover:bg-white/15 text-white border border-white/10"
                        }`}
                      >
                        {buying === pack.id ? "Redirecting..." : "Buy"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            {/* Transaction history */}
            {transactions.length > 0 && (
              <div>
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-4">
                  Transaction History
                </p>
                <div className="rounded-2xl border border-[var(--border)] bg-surface divide-y divide-[var(--border)]">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between px-5 py-3.5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-white truncate">
                          {tx.description}
                        </p>
                        <p className="text-xs text-neutral-600 mt-0.5">
                          {new Date(tx.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <span
                        className={`text-sm font-medium shrink-0 ml-4 ${
                          tx.amount > 0 ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {tx.amount > 0 ? "+" : ""}
                        {tx.amount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default function CreditsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <svg
            className="w-8 h-8 text-accent animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>
      }
    >
      <CreditsPageInner />
    </Suspense>
  );
}
