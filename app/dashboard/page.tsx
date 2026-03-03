"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthButton from "@/components/auth-button";

interface PreviewRow {
  id: string;
  slug: string;
  original_url: string;
  created_at: string;
  expires_at: string;
}

export default function Dashboard() {
  const [previews, setPreviews] = useState<PreviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedSlug, setCopiedSlug] = useState("");

  useEffect(() => {
    fetchPreviews();
  }, []);

  async function fetchPreviews() {
    try {
      const res = await fetch("/api/previews");
      const data = await res.json();
      setPreviews(data);
    } catch {
      console.error("Failed to fetch previews");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/previews/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPreviews((prev) => prev.filter((p) => p.id !== id));
    }
  }

  function handleCopy(slug: string) {
    const url = `${window.location.origin}/preview/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(""), 2000);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <main className="min-h-screen px-4 py-12 max-w-5xl mx-auto">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold tracking-tight text-white">
            presell<span className="text-accent">.</span>
          </Link>
          <AuthButton />
        </div>
      </nav>

      <div className="flex items-center justify-between mb-8 pt-14">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Your generated previews
          </p>
        </div>
        <Link
          href="/"
          className="px-4 py-2 bg-accent hover:bg-accent-light text-black text-sm font-semibold rounded-lg transition-colors"
        >
          + New Preview
        </Link>
      </div>

      {loading ? (
        <div className="text-neutral-500 text-sm">Loading...</div>
      ) : previews.length === 0 ? (
        <div className="text-center py-16 text-neutral-500">
          <p>No previews yet.</p>
          <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-block">
            Generate your first one &rarr;
          </Link>
        </div>
      ) : (
        <div className="border border-neutral-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-900 text-neutral-400 text-left">
                <th className="px-4 py-3 font-medium">Client URL</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Expires</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {previews.map((preview) => (
                <tr
                  key={preview.id}
                  className="border-t border-neutral-800 hover:bg-neutral-900/50"
                >
                  <td className="px-4 py-3">
                    <a
                      href={preview.original_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-300 hover:text-white truncate block max-w-[200px]"
                    >
                      {preview.original_url}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-xs font-mono text-neutral-400">
                      {preview.slug}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-neutral-400">
                    {formatDate(preview.created_at)}
                  </td>
                  <td className="px-4 py-3 text-neutral-400">
                    {formatDate(preview.expires_at)}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => handleCopy(preview.slug)}
                      className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs rounded transition-colors"
                    >
                      {copiedSlug === preview.slug ? "Copied!" : "Copy Link"}
                    </button>
                    <button
                      onClick={() => handleDelete(preview.id)}
                      className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs rounded transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
