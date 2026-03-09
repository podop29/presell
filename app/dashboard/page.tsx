"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import AuthButton from "@/components/auth-button";

/* ─── Types ─── */
interface PreviewRow {
  id: string;
  slug: string;
  original_url: string;
  variation_a_style: string | null;
  created_at: string;
  expires_at: string;
  cold_email_subject: string | null;
  cold_email_body: string | null;
  business_name: string | null;
}

type FilterStatus = "all" | "active" | "expired";
type ViewMode = "grid" | "list";

/* ─── Helpers ─── */
function isExpired(p: PreviewRow) {
  return new Date(p.expires_at) < new Date();
}

function daysRemaining(p: PreviewRow) {
  const diff = new Date(p.expires_at).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

function extractDomain(url: string, businessName?: string | null) {
  if (businessName) return businessName;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function formatRelativeDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return "1 week ago";
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/* ─── Inline SVG Icons ─── */
function SearchIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
function GridIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}
function ListIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}
function ExternalLinkIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}
function CopyIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}
function TrashIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  );
}
function CheckIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function SparklesIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
    </svg>
  );
}
function ClockIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function LayersIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
    </svg>
  );
}
function ActivityIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
function AlertTriangleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
function PlusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function MailIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

/* ─── Main Component ─── */
export default function Dashboard() {
  const [previews, setPreviews] = useState<PreviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [copiedSlug, setCopiedSlug] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<PreviewRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [emailTarget, setEmailTarget] = useState<PreviewRow | null>(null);
  const [emailCopied, setEmailCopied] = useState(false);
  const [regeneratingEmail, setRegeneratingEmail] = useState(false);
  const [previewBaseUrl, setPreviewBaseUrl] = useState("");

  useEffect(() => {
    fetchPreviews();
  }, []);

  async function fetchPreviews() {
    try {
      const res = await fetch("/api/previews");
      const data = await res.json();
      if (data.previews && Array.isArray(data.previews)) {
        setPreviews(data.previews);
        setPreviewBaseUrl(data.previewBaseUrl || "");
      }
    } catch {
      console.error("Failed to fetch previews");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/previews/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        setPreviews((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      }
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  function handleCopy(slug: string) {
    const url = `${previewBaseUrl || window.location.origin}/preview/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(""), 2000);
  }

  function handleCopyEmail(preview: PreviewRow) {
    if (!preview.cold_email_subject || !preview.cold_email_body) return;
    const full = `Subject: ${preview.cold_email_subject}\n\n${preview.cold_email_body}`;
    navigator.clipboard.writeText(full);
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 2000);
  }

  async function handleRegenerateEmail(preview: PreviewRow) {
    setRegeneratingEmail(true);
    try {
      const res = await fetch(`/api/preview/${preview.slug}/regenerate-email`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) return;
      const updated = {
        ...preview,
        cold_email_subject: data.subject,
        cold_email_body: data.body,
      };
      setPreviews((prev) =>
        prev.map((p) => (p.slug === preview.slug ? updated : p))
      );
      setEmailTarget(updated);
    } catch {
      // silently fail
    } finally {
      setRegeneratingEmail(false);
    }
  }

  /* ─── Derived data ─── */
  const stats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
    const active = previews.filter((p) => !isExpired(p)).length;
    const expired = previews.filter((p) => isExpired(p)).length;
    const thisWeek = previews.filter((p) => new Date(p.created_at) >= weekAgo).length;
    return { total: previews.length, active, expired, thisWeek };
  }, [previews]);

  const filtered = useMemo(() => {
    let list = previews;
    if (filterStatus === "active") list = list.filter((p) => !isExpired(p));
    if (filterStatus === "expired") list = list.filter((p) => isExpired(p));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.original_url.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          (p.business_name && p.business_name.toLowerCase().includes(q)) ||
          (p.variation_a_style && p.variation_a_style.toLowerCase().includes(q))
      );
    }
    return list;
  }, [previews, filterStatus, searchQuery]);

  const hasAnyPreviews = previews.length > 0;
  const hasResults = filtered.length > 0;

  return (
    <main className="min-h-screen">
      {/* ═══ Nav ═══ */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold tracking-tight text-white">
            pitchkit<span className="text-accent">.</span>
          </Link>
          <AuthButton />
        </div>
      </nav>

      {/* ═══ Page Header ═══ */}
      <div className="pt-14 noise-bg border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between animate-fade-in-up">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Dashboard</h1>
              <p className="text-sm text-neutral-500 mt-1">Your generated previews</p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-light text-black text-sm font-semibold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-accent/20"
            >
              <PlusIcon className="w-4 h-4" />
              <span>New Preview</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* ═══ Stats Row ═══ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-fade-in-up delay-100">
          {[
            { icon: <LayersIcon className="w-4 h-4" />, value: stats.total, label: "Total Previews" },
            { icon: <ActivityIcon className="w-4 h-4" />, value: stats.active, label: "Active" },
            { icon: <ClockIcon className="w-4 h-4" />, value: stats.expired, label: "Expired" },
            { icon: <SparklesIcon className="w-4 h-4" />, value: stats.thisWeek, label: "This Week" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="p-4 rounded-2xl border border-[var(--border)] bg-surface hover:border-[var(--border-light)] transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent mb-3">
                {stat.icon}
              </div>
              <div className="text-2xl font-bold text-white">{loading ? "-" : stat.value}</div>
              <div className="text-xs text-neutral-500 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* ═══ Toolbar ═══ */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 animate-fade-in-up delay-200">
          {/* Search */}
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
            <input
              type="text"
              placeholder="Search by URL, slug, or style..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface border border-[var(--border)] rounded-xl text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-[var(--border-light)] transition-colors"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center bg-surface border border-[var(--border)] rounded-xl p-1">
            {(["all", "active", "expired"] as FilterStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-1.5 text-xs font-medium rounded-lg capitalize transition-all duration-200 ${
                  filterStatus === status
                    ? "bg-accent/10 text-accent"
                    : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-surface border border-[var(--border)] rounded-xl p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-all duration-200 ${
                viewMode === "grid" ? "bg-accent/10 text-accent" : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              <GridIcon />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-all duration-200 ${
                viewMode === "list" ? "bg-accent/10 text-accent" : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              <ListIcon />
            </button>
          </div>
        </div>

        {/* ═══ Content Area ═══ */}
        {loading ? (
          /* Skeleton loading */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-5 rounded-2xl border border-[var(--border)] bg-surface animate-pulse">
                <div className="h-4 bg-neutral-800 rounded w-3/4 mb-3" />
                <div className="h-3 bg-neutral-800 rounded w-1/2 mb-4" />
                <div className="flex gap-2 mb-4">
                  <div className="h-5 bg-neutral-800 rounded-full w-16" />
                  <div className="h-5 bg-neutral-800 rounded-full w-20" />
                </div>
                <div className="h-3 bg-neutral-800 rounded w-1/3 mb-4" />
                <div className="flex gap-2 pt-3 border-t border-neutral-800">
                  <div className="h-8 bg-neutral-800 rounded-lg flex-1" />
                  <div className="h-8 bg-neutral-800 rounded-lg w-8" />
                  <div className="h-8 bg-neutral-800 rounded-lg w-8" />
                </div>
              </div>
            ))}
          </div>
        ) : !hasAnyPreviews ? (
          /* Empty state */
          <div className="text-center py-20 animate-fade-in-up">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center text-accent mx-auto mb-5">
              <LayersIcon className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No previews yet</h3>
            <p className="text-sm text-neutral-500 mb-6 max-w-sm mx-auto">
              Create your first preview by entering a client&apos;s website URL. It only takes a couple minutes.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-light text-black text-sm font-semibold rounded-xl transition-all duration-200"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Create First Preview</span>
            </Link>
          </div>
        ) : !hasResults ? (
          /* No results state */
          <div className="text-center py-20 animate-fade-in-up">
            <div className="w-16 h-16 rounded-2xl bg-neutral-800/50 flex items-center justify-center text-neutral-600 mx-auto mb-5">
              <SearchIcon className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No previews match</h3>
            <p className="text-sm text-neutral-500 mb-6">
              Try adjusting your search or filters.
            </p>
            <button
              onClick={() => { setSearchQuery(""); setFilterStatus("all"); }}
              className="px-5 py-2.5 border border-[var(--border)] hover:border-[var(--border-light)] text-neutral-300 text-sm font-medium rounded-xl transition-colors"
            >
              Clear Filters
            </button>
          </div>
        ) : viewMode === "grid" ? (
          /* Grid view */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((preview, i) => {
              const expired = isExpired(preview);
              const days = daysRemaining(preview);
              return (
                <div
                  key={preview.id}
                  className={`group relative p-5 rounded-2xl border border-[var(--border)] bg-surface hover:border-[var(--border-light)] transition-all duration-300 hover:-translate-y-0.5 animate-fade-in-up ${
                    expired ? "opacity-60" : ""
                  }`}
                  style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <a
                        href={preview.original_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-white hover:text-accent transition-colors inline-flex items-center gap-1.5"
                      >
                        {extractDomain(preview.original_url, preview.business_name)}
                        <ExternalLinkIcon className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                      <div className="text-xs font-mono text-neutral-600 mt-0.5">{preview.slug}</div>
                    </div>
                    <a
                      href={`/preview/${preview.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white text-xs font-medium rounded-lg transition-colors border border-white/10"
                    >
                      <ExternalLinkIcon className="w-3 h-3" />
                      Edit
                    </a>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {expired ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                        Expired
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {days}d left
                      </span>
                    )}
                    {preview.variation_a_style && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-accent/10 text-accent border border-accent/20">
                        {preview.variation_a_style}
                      </span>
                    )}
                  </div>

                  {/* Date */}
                  <div className="text-xs text-neutral-600 mb-4">
                    {formatRelativeDate(preview.created_at)}
                  </div>

                  {/* Action bar */}
                  <div className="flex items-center gap-2 pt-3 border-t border-[var(--border)]">
                    <button
                      onClick={() => handleCopy(preview.slug)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-accent hover:bg-accent-light text-black text-xs font-semibold rounded-lg transition-colors"
                    >
                      {copiedSlug === preview.slug ? <CheckIcon className="w-3.5 h-3.5" /> : <CopyIcon className="w-3.5 h-3.5" />}
                      {copiedSlug === preview.slug ? "Copied!" : "Share Preview"}
                    </button>
                    {preview.cold_email_body && (
                      <button
                        onClick={() => setEmailTarget(preview)}
                        className="flex items-center justify-center w-9 h-9 rounded-lg border border-[var(--border)] hover:border-accent/30 text-neutral-500 hover:text-accent transition-colors"
                        title="View cold email"
                      >
                        <MailIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteTarget(preview)}
                      className="flex items-center justify-center w-9 h-9 rounded-lg border border-[var(--border)] hover:border-red-500/30 text-neutral-500 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List view */
          <div className="space-y-2 animate-fade-in-up">
            {filtered.map((preview) => {
              const expired = isExpired(preview);
              const days = daysRemaining(preview);
              return (
                <div
                  key={preview.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-surface hover:border-[var(--border-light)] transition-colors ${
                    expired ? "opacity-60" : ""
                  }`}
                >
                  {/* Domain + style */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <a
                        href={preview.original_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-white hover:text-accent transition-colors truncate"
                      >
                        {extractDomain(preview.original_url, preview.business_name)}
                      </a>
                      {preview.variation_a_style && (
                        <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-accent/10 text-accent border border-accent/20">
                          {preview.variation_a_style}
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-mono text-neutral-600 mt-0.5 truncate">{preview.slug}</div>
                  </div>

                  {/* Status badge */}
                  <div className="hidden sm:block shrink-0">
                    {expired ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                        Expired
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {days}d left
                      </span>
                    )}
                  </div>

                  {/* Date */}
                  <div className="hidden md:block text-xs text-neutral-600 shrink-0 w-24 text-right">
                    {formatRelativeDate(preview.created_at)}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleCopy(preview.slug)}
                      className="flex items-center justify-center gap-1.5 px-3 h-8 rounded-lg bg-accent hover:bg-accent-light text-black text-xs font-semibold transition-colors"
                      title="Share preview"
                    >
                      {copiedSlug === preview.slug ? <CheckIcon className="w-3.5 h-3.5" /> : <CopyIcon className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline">{copiedSlug === preview.slug ? "Copied!" : "Share"}</span>
                    </button>
                    <a
                      href={`/preview/${preview.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 px-3 h-8 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-colors border border-white/10"
                      title="Edit preview"
                    >
                      <ExternalLinkIcon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Edit</span>
                    </a>
                    {preview.cold_email_body && (
                      <button
                        onClick={() => setEmailTarget(preview)}
                        className="flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--border)] hover:border-accent/30 text-neutral-500 hover:text-accent transition-colors"
                        title="View cold email"
                      >
                        <MailIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteTarget(preview)}
                      className="flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--border)] hover:border-red-500/30 text-neutral-500 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ Delete Confirmation Modal ═══ */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !deleting && setDeleteTarget(null)} />
          <div className="relative bg-surface border border-[var(--border)] rounded-2xl p-6 max-w-sm w-full animate-fade-in-up">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 mx-auto mb-4">
              <AlertTriangleIcon className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-white text-center mb-2">Delete Preview</h3>
            <p className="text-sm text-neutral-400 text-center mb-6">
              Are you sure you want to delete the preview for{" "}
              <span className="text-white font-medium">{extractDomain(deleteTarget.original_url, deleteTarget.business_name)}</span>?
              This action cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 border border-[var(--border)] hover:border-[var(--border-light)] text-neutral-300 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Cold Email Modal ═══ */}
      {emailTarget && emailTarget.cold_email_body && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setEmailTarget(null); setEmailCopied(false); }} />
          <div className="relative bg-surface border border-[var(--border)] rounded-2xl p-6 max-w-lg w-full animate-fade-in-up">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent mx-auto mb-4">
              <MailIcon className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-white text-center mb-1">Cold Email</h3>
            <p className="text-xs text-neutral-500 text-center mb-5">
              For {extractDomain(emailTarget.original_url, emailTarget.business_name)}
            </p>

            {/* Subject */}
            <div className="mb-3">
              <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1 block">Subject</label>
              <div className="px-3 py-2 bg-black/30 rounded-lg border border-white/5 text-sm text-white">
                {emailTarget.cold_email_subject}
              </div>
            </div>

            {/* Body */}
            <div className="mb-5">
              <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1 block">Body</label>
              <div className="px-3 py-3 bg-black/30 rounded-lg border border-white/5 text-sm text-neutral-300 whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed">
                {emailTarget.cold_email_body}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleRegenerateEmail(emailTarget)}
                disabled={regeneratingEmail}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 border border-[var(--border)] hover:border-accent/30 text-neutral-400 hover:text-accent text-xs font-medium rounded-xl transition-colors disabled:opacity-50"
                title="Generate a new email"
              >
                <svg className={`w-3.5 h-3.5 ${regeneratingEmail ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 11-6.219-8.56" /><polyline points="21 3 21 9 15 9" />
                </svg>
                {regeneratingEmail ? "Generating..." : "Regenerate"}
              </button>
              <div className="flex-1" />
              <button
                onClick={() => { setEmailTarget(null); setEmailCopied(false); }}
                className="px-4 py-2.5 border border-[var(--border)] hover:border-[var(--border-light)] text-neutral-300 text-sm font-medium rounded-xl transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => handleCopyEmail(emailTarget)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-light text-black text-sm font-semibold rounded-xl transition-all duration-200"
              >
                {emailCopied ? (
                  <>
                    <CheckIcon className="w-3.5 h-3.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <CopyIcon className="w-3.5 h-3.5" />
                    Copy Email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
