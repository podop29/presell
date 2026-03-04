"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import AuthButton from "@/components/auth-button";

export default function SettingsPage() {
  const [companyName, setCompanyName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [removeLogo, setRemoveLogo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setCompanyName(data.companyName ?? "");
        setLogoUrl(data.logoUrl ?? "");
      })
      .catch(() => setError("Failed to load settings."))
      .finally(() => setLoading(false));
  }, []);

  function handleFileChange(file: File | null) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("File must be under 2 MB.");
      return;
    }
    if (
      !["image/png", "image/jpeg", "image/svg+xml", "image/webp"].includes(
        file.type
      )
    ) {
      setError("File must be PNG, JPG, SVG, or WebP.");
      return;
    }
    setError("");
    setLogoFile(file);
    setRemoveLogo(false);
    const url = URL.createObjectURL(file);
    setLogoPreview(url);
  }

  function handleRemoveLogo() {
    setLogoFile(null);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview("");
    setRemoveLogo(true);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileChange(file);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);

    const form = new FormData();
    form.set("companyName", companyName);
    if (removeLogo) form.set("removeLogo", "true");
    if (logoFile) form.set("logo", logoFile);

    try {
      const res = await fetch("/api/settings", { method: "PUT", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save.");
        return;
      }
      setLogoUrl(data.logoUrl);
      setLogoFile(null);
      if (logoPreview) URL.revokeObjectURL(logoPreview);
      setLogoPreview("");
      setRemoveLogo(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const displayLogo = logoPreview || (!removeLogo && logoUrl) || "";

  return (
    <main className="min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm font-semibold tracking-tight text-white"
          >
            pitchkit<span className="text-accent">.</span>
          </Link>
          <AuthButton />
        </div>
      </nav>

      {/* Page Header */}
      <div className="pt-14 noise-bg border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="animate-fade-in-up">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Settings
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              Brand your preview pages
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 animate-fade-in-up delay-100">
        {loading ? (
          <div className="p-6 rounded-2xl border border-[var(--border)] bg-surface animate-pulse space-y-6">
            <div className="h-4 bg-neutral-800 rounded w-1/3" />
            <div className="h-10 bg-neutral-800 rounded" />
            <div className="h-4 bg-neutral-800 rounded w-1/4" />
            <div className="h-32 bg-neutral-800 rounded" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* Company Name */}
            <div className="p-6 rounded-2xl border border-[var(--border)] bg-surface space-y-4">
              <div>
                <label
                  htmlFor="companyName"
                  className="block text-sm font-medium text-white mb-1.5"
                >
                  Company Name
                </label>
                <p className="text-xs text-neutral-500 mb-3">
                  Shown in the footer of your preview pages instead of your
                  personal name.
                </p>
                <input
                  id="companyName"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  maxLength={100}
                  placeholder="Acme Design Co."
                  className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-[var(--border)] rounded-xl text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-[var(--border-light)] transition-colors"
                />
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-white mb-1.5">
                  Logo
                </label>
                <p className="text-xs text-neutral-500 mb-3">
                  PNG, JPG, SVG, or WebP. Max 2 MB.
                </p>

                {displayLogo ? (
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl border border-[var(--border)] bg-[#0a0a0a] flex items-center justify-center overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={displayLogo}
                        alt="Logo preview"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 text-xs font-medium text-neutral-300 border border-[var(--border)] hover:border-[var(--border-light)] rounded-lg transition-colors"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="px-4 py-2 text-xs font-medium text-red-400 border border-red-500/20 hover:border-red-500/40 rounded-lg transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    className="w-full py-8 border-2 border-dashed border-[var(--border)] hover:border-[var(--border-light)] rounded-xl text-center transition-colors cursor-pointer"
                  >
                    <div className="text-neutral-500 text-sm">
                      <span className="text-accent font-medium">
                        Click to upload
                      </span>{" "}
                      or drag and drop
                    </div>
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            {/* Success */}
            {success && (
              <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                Settings saved successfully.
              </p>
            )}

            {/* Save */}
            <button
              type="submit"
              disabled={saving}
              className="w-full px-5 py-2.5 bg-accent hover:bg-accent-light text-black text-sm font-semibold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-accent/20 disabled:opacity-50 disabled:hover:shadow-none"
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
