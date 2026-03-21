"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface EventCounts {
  [name: string]: { total: number; last7d: number; last30d: number };
}

interface RecentEvent {
  event_name: string;
  user_id: string | null;
  properties: Record<string, unknown>;
  created_at: string;
}

interface AdminData {
  eventCounts: EventCounts;
  signupsByDay: Record<string, number>;
  totalPreviewViews: number;
  totalUsers: number;
  recentEvents: RecentEvent[];
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminAnalytics() {
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => {
        if (r.status === 403) throw new Error("Forbidden");
        return r.json();
      })
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen noise-bg flex items-center justify-center">
        <div className="text-neutral-500 text-sm">Loading analytics...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen noise-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-lg font-semibold mb-2">Access Denied</div>
          <p className="text-neutral-500 text-sm mb-4">{error}</p>
          <Link href="/dashboard" className="text-accent text-sm hover:underline">
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  if (!data) return null;

  const { eventCounts, signupsByDay, totalPreviewViews, totalUsers, recentEvents } = data;

  // KPI values
  const totalGenerations = eventCounts["generation_completed"]?.total || 0;
  const totalRevisions = eventCounts["revision_made"]?.total || 0;
  const totalSignups = eventCounts["user_signup"]?.total || 0;

  // Signups chart data (last 30 days)
  const chartDays: { day: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    chartDays.push({ day: key, count: signupsByDay[key] || 0 });
  }
  const maxSignups = Math.max(...chartDays.map((d) => d.count), 1);

  const eventNames = Object.keys(eventCounts).sort(
    (a, b) => eventCounts[b].total - eventCounts[a].total
  );

  return (
    <main className="min-h-screen noise-bg">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold tracking-tight text-white">
            pitchkit<span className="text-accent">.</span>
          </Link>
          <Link href="/dashboard" className="text-xs text-neutral-500 hover:text-white transition-colors">
            Dashboard
          </Link>
        </div>
      </nav>

      <div className="pt-14">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <h1 className="text-2xl font-bold text-white mb-1">Admin Analytics</h1>
          <p className="text-sm text-neutral-500 mb-8">Internal usage tracking</p>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Users", value: totalUsers },
              { label: "Generations", value: totalGenerations },
              { label: "Preview Views", value: totalPreviewViews },
              { label: "Revisions", value: totalRevisions },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="p-4 rounded-2xl border border-[var(--border)] bg-surface"
              >
                <div className="text-2xl font-bold text-white">{kpi.value}</div>
                <div className="text-xs text-neutral-500 mt-0.5">{kpi.label}</div>
              </div>
            ))}
          </div>

          {/* Signups Chart */}
          <div className="mb-8 p-5 rounded-2xl border border-[var(--border)] bg-surface">
            <h2 className="text-sm font-semibold text-white mb-1">Signups</h2>
            <p className="text-xs text-neutral-500 mb-4">Last 30 days ({totalSignups} total)</p>
            <div className="flex items-end gap-[2px] h-24">
              {chartDays.map((d) => (
                <div
                  key={d.day}
                  className="flex-1 bg-accent/20 hover:bg-accent/40 rounded-t transition-colors relative group"
                  style={{ height: `${Math.max((d.count / maxSignups) * 100, 2)}%` }}
                  title={`${d.day}: ${d.count}`}
                >
                  {d.count > 0 && (
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-accent opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {d.count}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-neutral-600">{chartDays[0]?.day.slice(5)}</span>
              <span className="text-[10px] text-neutral-600">{chartDays[chartDays.length - 1]?.day.slice(5)}</span>
            </div>
          </div>

          {/* Event Breakdown */}
          <div className="mb-8 p-5 rounded-2xl border border-[var(--border)] bg-surface">
            <h2 className="text-sm font-semibold text-white mb-4">Event Breakdown</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-neutral-500 text-xs border-b border-white/5">
                    <th className="text-left py-2 pr-4 font-medium">Event</th>
                    <th className="text-right py-2 px-4 font-medium">7 days</th>
                    <th className="text-right py-2 px-4 font-medium">30 days</th>
                    <th className="text-right py-2 pl-4 font-medium">All time</th>
                  </tr>
                </thead>
                <tbody>
                  {eventNames.map((name) => (
                    <tr key={name} className="border-b border-white/5 last:border-0">
                      <td className="py-2 pr-4 text-white font-mono text-xs">{name}</td>
                      <td className="text-right py-2 px-4 text-neutral-400">{eventCounts[name].last7d}</td>
                      <td className="text-right py-2 px-4 text-neutral-400">{eventCounts[name].last30d}</td>
                      <td className="text-right py-2 pl-4 text-white font-medium">{eventCounts[name].total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Events */}
          <div className="p-5 rounded-2xl border border-[var(--border)] bg-surface">
            <h2 className="text-sm font-semibold text-white mb-4">Recent Events</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {recentEvents.map((ev, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0 text-xs"
                >
                  <span className="text-neutral-600 shrink-0 w-28">{formatTime(ev.created_at)}</span>
                  <span className="font-mono text-accent shrink-0">{ev.event_name}</span>
                  <span className="text-neutral-500 truncate">
                    {ev.user_id ? ev.user_id.slice(0, 8) + "..." : "anon"}
                  </span>
                  {Object.keys(ev.properties).length > 0 && (
                    <span className="text-neutral-600 truncate ml-auto">
                      {JSON.stringify(ev.properties).slice(0, 60)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
