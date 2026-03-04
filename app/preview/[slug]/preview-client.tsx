"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

interface Variation {
  key: string;
  label: string;
  src: string;
}

interface RevisionInfo {
  revisionCount: number;
  revisionLimit: number;
  freeRemaining: number;
  canRevise: boolean;
}

interface PreviewClientProps {
  slug: string;
  originalUrl: string;
  devName: string;
  devEmail: string;
  devMessage: string | null;
  variations: Variation[];
  isOwner: boolean;
  companyName?: string;
  logoUrl?: string;
}

export default function PreviewClient({
  slug,
  originalUrl,
  devName,
  devEmail,
  devMessage,
  variations,
  isOwner,
  companyName,
  logoUrl,
}: PreviewClientProps) {
  const [activeView, setActiveView] = useState<string>(
    variations[0]?.key ?? "original"
  );
  const [iframeLoading, setIframeLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [reviseOpen, setReviseOpen] = useState(false);
  const [revisePrompt, setRevisePrompt] = useState("");
  const [revising, setRevising] = useState(false);
  const [reviseError, setReviseError] = useState<string | null>(null);
  const [iframeVersion, setIframeVersion] = useState(0);
  const [pendingRevisionHtml, setPendingRevisionHtml] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [hasEdits, setHasEdits] = useState(false);
  const [saving, setSaving] = useState(false);
  const [revisionInfo, setRevisionInfo] = useState<RevisionInfo | null>(null);
  const [revisionLimitReached, setRevisionLimitReached] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const pendingBlobUrl = useRef<string | null>(null);
  const acceptedBlobUrl = useRef<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const editStyleRef = useRef<HTMLStyleElement | null>(null);

  const domain = useMemo(() => {
    try {
      return new URL(originalUrl).hostname.replace(/^www\./, "");
    } catch {
      return originalUrl;
    }
  }, [originalUrl]);

  const displayName = companyName || devName;
  const initial = displayName.charAt(0).toUpperCase();

  function revokePendingBlob() {
    if (pendingBlobUrl.current) {
      URL.revokeObjectURL(pendingBlobUrl.current);
      pendingBlobUrl.current = null;
    }
  }

  function revokeAcceptedBlob() {
    if (acceptedBlobUrl.current) {
      URL.revokeObjectURL(acceptedBlobUrl.current);
      acceptedBlobUrl.current = null;
    }
  }

  useEffect(() => {
    return () => {
      revokePendingBlob();
      revokeAcceptedBlob();
    };
  }, []);

  useEffect(() => {
    if (isOwner) {
      fetch(`/api/preview/${slug}/revision-info`)
        .then((r) => r.json())
        .then((data) => setRevisionInfo(data))
        .catch(() => {});
    }
  }, [isOwner, slug]);

  const tabs: { key: string; label: string }[] = [
    { key: "original", label: "Current" },
    ...variations.map((v) => ({ key: v.key, label: v.label })),
  ];

  const activeVariation = variations.find((v) => v.key === activeView);

  const baseSrc =
    activeView === "original"
      ? originalUrl
      : activeVariation?.src ?? originalUrl;
  const iframeSrc =
    acceptedBlobUrl.current && activeView !== "original"
      ? acceptedBlobUrl.current
      : activeView !== "original" && iframeVersion > 0
        ? `${baseSrc}?v=${iframeVersion}`
        : baseSrc;

  async function handleExport() {
    if (activeView === "original") return;
    setExporting(true);
    try {
      const src = activeVariation?.src ?? `/api/preview/${slug}/html`;
      const res = await fetch(src);
      if (!res.ok) return;
      const html = await res.text();
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug}-${activeView}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  function switchView(key: string) {
    if (key === activeView || pendingRevisionHtml) return;
    // Exit edit mode when switching tabs
    if (editMode) {
      disableEditMode();
      setEditMode(false);
      setHasEdits(false);
    }
    revokeAcceptedBlob();
    setIframeLoading(true);
    setActiveView(key);
    if (key === "original") {
      setReviseOpen(false);
      setReviseError(null);
    }
  }

  async function handleRevise(e: React.FormEvent) {
    e.preventDefault();
    if (!revisePrompt.trim() || revising || pendingRevisionHtml) return;
    setRevising(true);
    setReviseError(null);
    try {
      const res = await fetch(`/api/preview/${slug}/revise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variationKey: activeView,
          prompt: revisePrompt.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402 && data.revisionLimitReached) {
          setRevisionLimitReached(true);
          setRevisionInfo(data);
          return;
        }
        setReviseError(data.error || "Revision failed.");
        return;
      }
      revokePendingBlob();
      const blobUrl = URL.createObjectURL(
        new Blob([data.revisedHtml], { type: "text/html" })
      );
      pendingBlobUrl.current = blobUrl;
      setPendingRevisionHtml(data.revisedHtml);
      setRevisePrompt("");
      if (data.revisionInfo) {
        setRevisionInfo(data.revisionInfo);
      }
    } catch {
      setReviseError("Network error. Please try again.");
    } finally {
      setRevising(false);
    }
  }

  async function handleAcceptRevision() {
    if (!pendingRevisionHtml || accepting) return;
    setAccepting(true);
    setReviseError(null);
    try {
      const res = await fetch(`/api/preview/${slug}/accept-revision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variationKey: activeView,
          html: pendingRevisionHtml,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReviseError(data.error || "Failed to save revision.");
        return;
      }
      // Show the accepted HTML immediately via blob URL (avoids cache issues)
      revokeAcceptedBlob();
      acceptedBlobUrl.current = URL.createObjectURL(
        new Blob([pendingRevisionHtml], { type: "text/html" })
      );
      revokePendingBlob();
      setPendingRevisionHtml(null);
      setIframeLoading(true);
      setIframeVersion((v) => v + 1);
      setReviseOpen(false);
      // Re-fetch revision info after accepting
      fetch(`/api/preview/${slug}/revision-info`)
        .then((r) => r.json())
        .then((data) => setRevisionInfo(data))
        .catch(() => {});
    } catch {
      setReviseError("Network error. Please try again.");
    } finally {
      setAccepting(false);
    }
  }

  function handleDiscardRevision() {
    revokePendingBlob();
    setPendingRevisionHtml(null);
    setReviseError(null);
  }

  async function handleUnlockRevisions() {
    if (unlocking) return;
    setUnlocking(true);
    setUnlockError(null);
    try {
      const res = await fetch(`/api/preview/${slug}/unlock-revisions`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402 && data.insufficientCredits) {
          setUnlockError("insufficient_credits");
          return;
        }
        setUnlockError(data.error || "Failed to unlock revisions.");
        return;
      }
      setRevisionLimitReached(false);
      setRevisionInfo({
        revisionCount: revisionInfo?.revisionCount ?? 0,
        revisionLimit: data.newLimit,
        freeRemaining: data.newLimit - (revisionInfo?.revisionCount ?? 0),
        canRevise: true,
      });
    } catch {
      setUnlockError("Network error. Please try again.");
    } finally {
      setUnlocking(false);
    }
  }

  const EDITABLE_SELECTOR =
    "h1, h2, h3, h4, h5, h6, p, span, a, li, td, th, label, button, blockquote";

  const EDIT_STYLE_ID = "pitchkit-edit-style";

  const enableEditMode = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;

    // Inject styles
    let style = doc.getElementById(EDIT_STYLE_ID) as HTMLStyleElement | null;
    if (!style) {
      style = doc.createElement("style");
      style.id = EDIT_STYLE_ID;
      style.textContent = `
        [data-pitchkit-editable] {
          cursor: text !important;
          transition: outline 0.15s ease;
          outline: 2px dashed transparent;
          outline-offset: 2px;
        }
        [data-pitchkit-editable]:hover {
          outline-color: rgb(129 140 248) !important;
        }
        [data-pitchkit-editable][contenteditable="true"] {
          outline: 2px solid rgb(99 102 241) !important;
          outline-offset: 2px;
        }
      `;
      doc.head.appendChild(style);
    }
    editStyleRef.current = style;

    const elements = doc.querySelectorAll(EDITABLE_SELECTOR);
    elements.forEach((el) => {
      if (el.closest("[data-pitchkit-editable]") && el !== el.closest("[data-pitchkit-editable]")) return;
      el.setAttribute("data-pitchkit-editable", "true");

      el.addEventListener("click", handleEditClick as EventListener);
      el.addEventListener("blur", handleEditBlur as EventListener);
      el.addEventListener("keydown", handleEditKeydown as EventListener);
    });
  }, []);

  const disableEditMode = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;

    // Remove styles
    const style = doc.getElementById(EDIT_STYLE_ID);
    if (style) style.remove();
    editStyleRef.current = null;

    // Clean up editable elements
    const elements = doc.querySelectorAll("[data-pitchkit-editable]");
    elements.forEach((el) => {
      el.removeAttribute("data-pitchkit-editable");
      (el as HTMLElement).contentEditable = "false";
      el.removeEventListener("click", handleEditClick as EventListener);
      el.removeEventListener("blur", handleEditBlur as EventListener);
      el.removeEventListener("keydown", handleEditKeydown as EventListener);
    });
  }, []);

  function handleEditClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget as HTMLElement;
    el.contentEditable = "true";
    el.focus();
  }

  function handleEditBlur(e: FocusEvent) {
    const el = e.currentTarget as HTMLElement;
    el.contentEditable = "false";
    setHasEdits(true);
  }

  function handleEditKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      (e.currentTarget as HTMLElement).blur();
    }
  }

  function toggleEditMode() {
    if (editMode) {
      // Turning off — if edits exist, cancel (reload iframe)
      if (hasEdits) {
        cancelEdits();
      } else {
        disableEditMode();
        setEditMode(false);
      }
    } else {
      // Turning on — close revise bar first
      setReviseOpen(false);
      setReviseError(null);
      setEditMode(true);
      setHasEdits(false);
      // enableEditMode runs after iframe is confirmed loaded via useEffect
      enableEditMode();
    }
  }

  async function saveEdits() {
    if (saving) return;
    setSaving(true);
    try {
      disableEditMode();
      const doc = iframeRef.current?.contentDocument;
      if (!doc) {
        setSaving(false);
        setEditMode(false);
        return;
      }
      // Clean up any contenteditable="false" artifacts left by disableEditMode
      doc.querySelectorAll('[contenteditable="false"]').forEach((el) => {
        el.removeAttribute("contenteditable");
      });
      const html = `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
      const res = await fetch(`/api/preview/${slug}/accept-revision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variationKey: activeView, html, isManualEdit: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReviseError(data.error || "Failed to save edits.");
        enableEditMode(); // re-enable so user doesn't lose work
        return;
      }
      // Show the saved HTML immediately via blob URL (avoids cache issues)
      revokeAcceptedBlob();
      acceptedBlobUrl.current = URL.createObjectURL(
        new Blob([html], { type: "text/html" })
      );
      setEditMode(false);
      setHasEdits(false);
      setIframeLoading(true);
      setIframeVersion((v) => v + 1);
    } catch {
      setReviseError("Network error. Please try again.");
      enableEditMode();
    } finally {
      setSaving(false);
    }
  }

  function cancelEdits() {
    disableEditMode();
    setEditMode(false);
    setHasEdits(false);
    setIframeLoading(true);
    setIframeVersion((v) => v + 1);
  }

  const showCta = devName && devEmail;

  return (
    <div className="h-screen flex flex-col bg-zinc-950 overflow-hidden">
      {/* ── Top bar ── */}
      <header className="relative z-30 shrink-0 h-12 flex items-center gap-2 px-4 bg-black/60 backdrop-blur-xl border-b border-white/10">
        {/* Left — domain (hidden on mobile to give tabs room) */}
        <span className="hidden sm:block text-xs text-zinc-400 font-medium tracking-wide shrink-0">
          {domain}
        </span>

        {/* Center — segmented control */}
        <div className="flex-1 flex justify-center min-w-0 sm:absolute sm:left-1/2 sm:-translate-x-1/2">
          <nav className="flex items-center bg-white/[0.06] rounded-full p-0.5 border border-white/[0.08] max-w-full overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => switchView(tab.key)}
                disabled={!!pendingRevisionHtml}
                className={`px-2.5 sm:px-3.5 py-1 text-[11px] sm:text-xs font-medium rounded-full transition-all whitespace-nowrap ${
                  activeView === tab.key
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-400 hover:text-white"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Right — revise + edit + export (owner only) */}
        {isOwner ? (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => {
                if (editMode) {
                  disableEditMode();
                  setEditMode(false);
                  setHasEdits(false);
                }
                setReviseOpen((o) => !o);
                setReviseError(null);
              }}
              disabled={activeView === "original"}
              title={
                activeView === "original"
                  ? "Switch to a redesign to revise"
                  : "Revise this design"
              }
              className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400 ${
                reviseOpen
                  ? "bg-white/15 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
                <path d="M20 3v4" />
                <path d="M22 5h-4" />
              </svg>
            </button>
            <button
              onClick={toggleEditMode}
              disabled={activeView === "original" || !!pendingRevisionHtml}
              title={
                activeView === "original"
                  ? "Switch to a redesign to edit text"
                  : editMode
                    ? "Exit text editing"
                    : "Edit text directly"
              }
              className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400 ${
                editMode
                  ? "bg-white/15 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
            </button>
            <button
              onClick={handleExport}
              disabled={exporting || activeView === "original"}
              title={
                activeView === "original"
                  ? "Switch to a redesign to export"
                  : "Download HTML"
              }
              className="flex items-center justify-center w-8 h-8 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400"
            >
              {exporting ? (
                <svg
                  className="w-4 h-4 animate-spin"
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
              ) : (
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              )}
            </button>
          </div>
        ) : (
          <div className="hidden sm:block w-8" />
        )}
      </header>

      {/* ── Revision bar (owner only) ── */}
      {isOwner && reviseOpen && activeView !== "original" && (
        <div className="relative z-20 shrink-0 bg-black/60 backdrop-blur-xl border-b border-white/10 px-4 py-2.5">
          {pendingRevisionHtml ? (
            <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
              <p className="text-sm text-zinc-300">
                Review the changes below
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDiscardRevision}
                  disabled={accepting}
                  className="px-4 py-1.5 text-sm font-medium text-zinc-400 hover:text-white rounded-lg border border-white/10 hover:border-white/20 transition-colors disabled:opacity-40"
                >
                  Discard
                </button>
                <button
                  onClick={handleAcceptRevision}
                  disabled={accepting}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-40 flex items-center gap-2"
                >
                  {accepting && (
                    <svg
                      className="w-3.5 h-3.5 animate-spin"
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
                  )}
                  Accept
                </button>
              </div>
            </div>
          ) : revisionLimitReached ? (
            <div className="max-w-3xl mx-auto">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-amber-400">
                    You&apos;ve used all {revisionInfo?.revisionLimit ?? 0} revisions
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Unlock 5 more revisions for 1 credit
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {unlockError === "insufficient_credits" ? (
                    <Link
                      href="/credits"
                      className="px-4 py-1.5 bg-accent hover:bg-accent-light text-black text-sm font-medium rounded-lg transition-colors"
                    >
                      Buy Credits
                    </Link>
                  ) : (
                    <button
                      onClick={handleUnlockRevisions}
                      disabled={unlocking}
                      className="px-4 py-1.5 bg-white hover:bg-neutral-200 text-zinc-900 text-sm font-medium rounded-lg transition-colors disabled:opacity-40 flex items-center gap-2"
                    >
                      {unlocking && (
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      )}
                      Unlock Revisions
                    </button>
                  )}
                </div>
              </div>
              {unlockError && unlockError !== "insufficient_credits" && (
                <p className="mt-1.5 text-xs text-red-400">{unlockError}</p>
              )}
            </div>
          ) : (
            <div className="max-w-3xl mx-auto">
              <form
                onSubmit={handleRevise}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={revisePrompt}
                  onChange={(e) => setRevisePrompt(e.target.value)}
                  placeholder="Describe what to change..."
                  maxLength={2000}
                  disabled={revising}
                  className="flex-1 bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-white/20 transition-colors disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={revising || !revisePrompt.trim()}
                  className="shrink-0 px-4 py-1.5 bg-white hover:bg-neutral-200 text-zinc-900 text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:hover:bg-white flex items-center gap-2"
                >
                  {revising && (
                    <svg
                      className="w-3.5 h-3.5 animate-spin"
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
                  )}
                  Revise
                </button>
              </form>
              {revisionInfo && (
                <p className="mt-1.5 text-[11px] text-zinc-600">
                  {revisionInfo.revisionCount}/{revisionInfo.revisionLimit} revisions used
                </p>
              )}
            </div>
          )}
          {reviseError && (
            <p className="max-w-3xl mx-auto mt-1.5 text-xs text-red-400">
              {reviseError}
            </p>
          )}
        </div>
      )}

      {/* ── Edit toolbar (owner only) ── */}
      {isOwner && editMode && !pendingRevisionHtml && (
        <div className="relative z-20 shrink-0 bg-black/60 backdrop-blur-xl border-b border-white/10 px-4 py-2.5">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            <p className="text-sm text-zinc-300">
              {hasEdits ? (
                <span className="text-amber-400">Unsaved changes</span>
              ) : (
                "Click any text in the preview to edit it"
              )}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={cancelEdits}
                disabled={saving}
                className="px-4 py-1.5 text-sm font-medium text-zinc-400 hover:text-white rounded-lg border border-white/10 hover:border-white/20 transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              {hasEdits && (
                <button
                  onClick={saveEdits}
                  disabled={saving}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-40 flex items-center gap-2"
                >
                  {saving && (
                    <svg
                      className="w-3.5 h-3.5 animate-spin"
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
                  )}
                  Save
                </button>
              )}
            </div>
          </div>
          {reviseError && (
            <p className="max-w-3xl mx-auto mt-1.5 text-xs text-red-400">
              {reviseError}
            </p>
          )}
        </div>
      )}

      {/* ── Iframe(s) ── */}
      {pendingRevisionHtml ? (
        <div className="flex-1 flex flex-col sm:flex-row relative">
          {/* Before */}
          <div className="h-1/2 sm:h-auto sm:w-1/2 relative border-b sm:border-b-0 sm:border-r border-white/10">
            <span className="absolute top-3 left-3 z-20 px-2 py-0.5 bg-black/70 backdrop-blur text-[11px] font-medium text-zinc-400 rounded">
              Before
            </span>
            <iframe
              key={`before-${activeView}-${iframeVersion}`}
              src={iframeSrc}
              className="w-full h-full absolute inset-0 border-0"
              title="Before"
              onLoad={() => setIframeLoading(false)}
            />
          </div>
          {/* After */}
          <div className="h-1/2 sm:h-auto sm:w-1/2 relative">
            <span className="absolute top-3 left-3 z-20 px-2 py-0.5 bg-black/70 backdrop-blur text-[11px] font-medium text-emerald-400 rounded">
              After
            </span>
            <iframe
              key={`after-${activeView}`}
              src={pendingBlobUrl.current ?? ""}
              className="w-full h-full absolute inset-0 border-0"
              title="After"
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 relative">
          {iframeLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 z-10">
              <svg
                className="w-6 h-6 text-zinc-500 animate-spin"
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
          )}
          <iframe
            ref={activeView !== "original" ? iframeRef : undefined}
            key={`${activeView}-${iframeVersion}`}
            src={iframeSrc}
            className="w-full h-full absolute inset-0 border-0"
            title={tabs.find((t) => t.key === activeView)?.label || "Preview"}
            sandbox={
              activeView === "original"
                ? "allow-scripts allow-same-origin"
                : undefined
            }
            onLoad={() => {
              setIframeLoading(false);
              if (editMode && activeView !== "original") {
                enableEditMode();
              }
            }}
          />
        </div>
      )}

      {/* ── Bottom CTA bar ── */}
      {showCta && (
        <footer className="relative z-30 shrink-0 bg-black/60 backdrop-blur-xl border-t border-white/10 px-4 sm:px-6 py-3">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center sm:justify-between gap-3 sm:gap-4">
            {/* Left — logo/avatar + dev info */}
            <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt={displayName}
                  className="w-9 h-9 rounded-lg object-contain shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                  {initial}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">
                  {displayName}
                </p>
                <p className="text-xs text-zinc-400 truncate">{devEmail}</p>
              </div>
              {/* CTA inline on mobile */}
              <a
                href={`mailto:${devEmail}?subject=Website Redesign&body=Hi ${encodeURIComponent(displayName)}, I saw the redesign preview and I'm interested in learning more.`}
                className="sm:hidden shrink-0 px-4 py-2 bg-white hover:bg-neutral-200 text-zinc-900 text-xs font-semibold rounded-lg transition-colors"
              >
                Get in Touch
              </a>
            </div>

            {/* Center — dev message (hidden on mobile) */}
            {devMessage && (
              <p className="hidden md:block text-sm text-zinc-400 truncate flex-1 text-center px-4">
                {devMessage}
              </p>
            )}

            {/* Right — CTA button (hidden on mobile, shown inline above) */}
            <a
              href={`mailto:${devEmail}?subject=Website Redesign&body=Hi ${encodeURIComponent(displayName)}, I saw the redesign preview and I'm interested in learning more.`}
              className="hidden sm:block shrink-0 px-5 py-2 bg-white hover:bg-neutral-200 text-zinc-900 text-sm font-semibold rounded-lg transition-colors"
            >
              Get in Touch
            </a>
          </div>
        </footer>
      )}
    </div>
  );
}
