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
  businessName?: string | null;
  devName: string;
  devEmail: string;
  devMessage: string | null;
  variations: Variation[];
  isOwner: boolean;
  companyName?: string;
  logoUrl?: string;
  hasOriginalSite?: boolean;
  coldEmailSubject?: string | null;
  coldEmailBody?: string | null;
}

export default function PreviewClient({
  slug,
  originalUrl,
  businessName,
  devName,
  devEmail,
  devMessage,
  variations,
  isOwner,
  companyName,
  logoUrl,
  hasOriginalSite = true,
  coldEmailSubject,
  coldEmailBody,
}: PreviewClientProps) {
  const [activeView, setActiveView] = useState<string>(
    variations[0]?.key ?? "original"
  );
  const [iframeLoading, setIframeLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
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
  const [compareMode, setCompareMode] = useState(false);
  const [note, setNote] = useState(devMessage);
  const [removingNote, setRemovingNote] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(devMessage || "");
  const [savingNote, setSavingNote] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState(coldEmailSubject ?? null);
  const [emailBody, setEmailBody] = useState(coldEmailBody ?? null);
  const [emailCopied2, setEmailCopied2] = useState(false);
  const [regeneratingEmail, setRegeneratingEmail] = useState(false);
  const pendingBlobUrl = useRef<string | null>(null);
  const acceptedBlobUrl = useRef<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const editStyleRef = useRef<HTMLStyleElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const replacingImageRef = useRef<HTMLElement | null>(null);

  const domain = useMemo(() => {
    if (businessName) return businessName;
    try {
      return new URL(originalUrl).hostname.replace(/^www\./, "");
    } catch {
      return originalUrl;
    }
  }, [originalUrl, businessName]);

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
    ...(hasOriginalSite ? [{ key: "original", label: "Current" }] : []),
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
      setCompareMode(false);
      setEditOpen(false);
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
      setEditOpen(false);
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

  const IMAGE_SELECTOR = "img";
  const MIN_IMAGE_SIZE = 40;

  const EDIT_STYLE_ID = "pitchkit-edit-style";
  const LINK_POPOVER_ID = "pitchkit-link-popover";

  function handleImageClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget as HTMLElement;
    replacingImageRef.current = el;

    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;

    // Create or reuse hidden file input inside the iframe
    if (!fileInputRef.current || !doc.contains(fileInputRef.current)) {
      const input = doc.createElement("input");
      input.type = "file";
      input.accept = "image/png,image/jpeg,image/webp,image/gif";
      input.style.display = "none";
      input.addEventListener("change", handleImageSelected as EventListener);
      doc.body.appendChild(input);
      fileInputRef.current = input;
    }

    fileInputRef.current.value = "";
    fileInputRef.current.click();
  }

  async function handleImageSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    const el = replacingImageRef.current;
    if (!file || !el) return;

    const isImg = el.tagName === "IMG";
    const originalSrc = isImg
      ? (el as HTMLImageElement).src
      : el.style.backgroundImage;

    el.style.opacity = "0.4";
    el.style.transition = "opacity 0.2s ease";

    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch(`/api/preview/${slug}/upload-image`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        if (isImg) (el as HTMLImageElement).src = originalSrc;
        else el.style.backgroundImage = originalSrc;
        el.style.opacity = "";
        alert(data.error || "Failed to upload image.");
        return;
      }

      if (isImg) {
        (el as HTMLImageElement).src = data.url;
      } else {
        el.style.backgroundImage = `url("${data.url}")`;
      }
      el.style.opacity = "";
      setHasEdits(true);
    } catch {
      if (isImg) (el as HTMLImageElement).src = originalSrc;
      else el.style.backgroundImage = originalSrc;
      el.style.opacity = "";
      alert("Network error. Please try again.");
    }
  }

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
        [data-pitchkit-replaceable] {
          cursor: pointer !important;
          transition: outline 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
          outline: 2px dashed transparent;
          outline-offset: 2px;
          position: relative;
          z-index: 10 !important;
        }
        [data-pitchkit-replaceable]:hover {
          outline-color: rgb(129 140 248) !important;
          box-shadow: inset 0 0 0 4px rgb(99 102 241), inset 0 0 60px 0 rgba(99, 102, 241, 0.25) !important;
          opacity: 0.8;
        }
        [data-pitchkit-overlay-passthrough] {
          pointer-events: none !important;
        }
        #pitchkit-link-popover {
          position: absolute;
          z-index: 99999;
          background: #1a1a2e;
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 8px;
          padding: 8px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 220px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        #pitchkit-link-popover .pitchkit-popover-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        #pitchkit-link-popover button {
          padding: 5px 10px;
          font-size: 12px;
          font-weight: 500;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          white-space: nowrap;
        }
        #pitchkit-link-popover .pitchkit-btn-text {
          background: rgba(255,255,255,0.1);
          color: #e2e8f0;
        }
        #pitchkit-link-popover .pitchkit-btn-text:hover {
          background: rgba(255,255,255,0.18);
        }
        #pitchkit-link-popover .pitchkit-btn-save {
          background: #10b981;
          color: white;
        }
        #pitchkit-link-popover .pitchkit-btn-save:hover {
          background: #059669;
        }
        #pitchkit-link-popover input {
          flex: 1;
          padding: 5px 8px;
          font-size: 12px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 5px;
          color: #e2e8f0;
          outline: none;
          font-family: monospace;
          min-width: 0;
        }
        #pitchkit-link-popover input:focus {
          border-color: rgba(99,102,241,0.6);
        }
        #pitchkit-link-popover .pitchkit-popover-label {
          font-size: 10px;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 600;
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

    // Find divs that contain direct text content (not just child elements)
    doc.querySelectorAll("div").forEach((div) => {
      if (div.getAttribute("data-pitchkit-editable")) return;
      if (div.closest("[data-pitchkit-editable]")) return;
      const hasDirectText = Array.from(div.childNodes).some(
        (n) => (n.nodeType === Node.TEXT_NODE && n.textContent?.trim()) ||
               (n.nodeType === Node.ELEMENT_NODE && (n as HTMLElement).tagName === "BR")
      );
      if (!hasDirectText) return;
      // Skip divs that are mostly containers (have many block-level children)
      const blockChildren = div.querySelectorAll("div, p, h1, h2, h3, h4, h5, h6, ul, ol, section, article");
      if (blockChildren.length > 2) return;
      div.setAttribute("data-pitchkit-editable", "true");
      div.addEventListener("click", handleEditClick as EventListener);
      div.addEventListener("blur", handleEditBlur as EventListener);
      div.addEventListener("keydown", handleEditKeydown as EventListener);
    });

    // Set up replaceable <img> elements
    const images = doc.querySelectorAll(IMAGE_SELECTOR);
    images.forEach((img) => {
      const el = img as HTMLImageElement;
      if (el.naturalWidth < MIN_IMAGE_SIZE || el.naturalHeight < MIN_IMAGE_SIZE) return;
      el.setAttribute("data-pitchkit-replaceable", "true");
      el.addEventListener("click", handleImageClick as EventListener);

      // Mark sibling overlay divs as passthrough so clicks reach the image
      const parent = el.parentElement;
      if (parent) {
        Array.from(parent.children).forEach((sibling) => {
          if (sibling === el) return;
          if (sibling.tagName !== "DIV") return;
          const style = getComputedStyle(sibling);
          if (style.position === "absolute" || style.position === "fixed") {
            sibling.setAttribute("data-pitchkit-overlay-passthrough", "true");
          }
        });
      }
    });

    // Set up replaceable background-image elements
    const allElements = doc.body.querySelectorAll("*");
    allElements.forEach((node) => {
      const el = node as HTMLElement;
      if (el.tagName === "IMG") return; // already handled
      if (el.getAttribute("data-pitchkit-replaceable")) return;
      const bg = getComputedStyle(el).backgroundImage;
      if (!bg || bg === "none" || !bg.startsWith("url(")) return;
      // Skip tiny elements (icons, spacers)
      const rect = el.getBoundingClientRect();
      if (rect.width < MIN_IMAGE_SIZE || rect.height < MIN_IMAGE_SIZE) return;
      el.setAttribute("data-pitchkit-replaceable", "true");
      el.addEventListener("click", handleImageClick as EventListener);
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

    // Clean up replaceable images
    const images = doc.querySelectorAll("[data-pitchkit-replaceable]");
    images.forEach((img) => {
      img.removeAttribute("data-pitchkit-replaceable");
      (img as HTMLElement).style.opacity = "";
      img.removeEventListener("click", handleImageClick as EventListener);
    });

    // Restore overlay pointer events
    const overlays = doc.querySelectorAll("[data-pitchkit-overlay-passthrough]");
    overlays.forEach((el) => {
      el.removeAttribute("data-pitchkit-overlay-passthrough");
    });

    // Remove link popover
    const popover = doc.getElementById(LINK_POPOVER_ID);
    if (popover) popover.remove();

    // Remove hidden file input
    if (fileInputRef.current && doc.contains(fileInputRef.current)) {
      fileInputRef.current.remove();
    }
    fileInputRef.current = null;
    replacingImageRef.current = null;
  }, []);

  function dismissLinkPopover() {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const existing = doc.getElementById(LINK_POPOVER_ID);
    if (existing) existing.remove();
  }

  function showLinkPopover(anchor: HTMLAnchorElement) {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    dismissLinkPopover();

    const popover = doc.createElement("div");
    popover.id = LINK_POPOVER_ID;

    const rect = anchor.getBoundingClientRect();
    const scrollY = doc.documentElement.scrollTop || doc.body.scrollTop;
    const scrollX = doc.documentElement.scrollLeft || doc.body.scrollLeft;
    popover.style.top = `${rect.bottom + scrollY + 6}px`;
    popover.style.left = `${rect.left + scrollX}px`;

    // URL row
    const urlLabel = doc.createElement("span");
    urlLabel.className = "pitchkit-popover-label";
    urlLabel.textContent = "Link URL";
    popover.appendChild(urlLabel);

    const urlRow = doc.createElement("div");
    urlRow.className = "pitchkit-popover-row";

    const urlInput = doc.createElement("input");
    urlInput.type = "text";
    urlInput.value = anchor.getAttribute("href") || "#";
    urlInput.placeholder = "https://...";

    const saveBtn = doc.createElement("button");
    saveBtn.className = "pitchkit-btn-save";
    saveBtn.textContent = "Save";
    saveBtn.addEventListener("click", () => {
      anchor.setAttribute("href", urlInput.value);
      setHasEdits(true);
      dismissLinkPopover();
    });

    urlInput.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        saveBtn.click();
      }
      if (ev.key === "Escape") {
        ev.preventDefault();
        dismissLinkPopover();
      }
    });

    urlRow.appendChild(urlInput);
    urlRow.appendChild(saveBtn);
    popover.appendChild(urlRow);

    // Edit text button
    const editTextBtn = doc.createElement("button");
    editTextBtn.className = "pitchkit-btn-text";
    editTextBtn.textContent = "Edit Text";
    editTextBtn.addEventListener("click", () => {
      dismissLinkPopover();
      anchor.contentEditable = "true";
      anchor.focus();
    });
    popover.appendChild(editTextBtn);

    doc.body.appendChild(popover);

    // Auto-focus the URL input
    urlInput.focus();
    urlInput.select();

    // Close on click outside
    function onDocClick(ev: Event) {
      if (popover.contains(ev.target as Node) || ev.target === anchor) return;
      dismissLinkPopover();
      doc!.removeEventListener("click", onDocClick, true);
    }
    setTimeout(() => doc!.addEventListener("click", onDocClick, true), 0);
  }

  function handleEditClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget as HTMLElement;

    // Links get a popover with URL edit + text edit options
    if (el.tagName === "A") {
      showLinkPopover(el as HTMLAnchorElement);
      return;
    }

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
    if (editOpen) {
      // Turning off — if edits exist, cancel (reload iframe)
      if (hasEdits) {
        cancelEdits();
      } else {
        disableEditMode();
        setEditMode(false);
      }
      setEditOpen(false);
      setReviseError(null);
    } else {
      // Turning on — enable both direct editing and AI revision
      setCompareMode(false);
      setEditOpen(true);
      setEditMode(true);
      setHasEdits(false);
      setReviseError(null);
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
      // Safety net: remove image replacement artifacts before extracting HTML
      doc.querySelectorAll("[data-pitchkit-replaceable]").forEach((el) => {
        el.removeAttribute("data-pitchkit-replaceable");
      });
      doc.querySelectorAll("[data-pitchkit-overlay-passthrough]").forEach((el) => {
        el.removeAttribute("data-pitchkit-overlay-passthrough");
      });
      const hiddenInput = doc.querySelector('input[type="file"][style*="display: none"]');
      if (hiddenInput) hiddenInput.remove();
      const linkPopover = doc.getElementById(LINK_POPOVER_ID);
      if (linkPopover) linkPopover.remove();
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
    setEditOpen(false);
    setHasEdits(false);
    setReviseError(null);
    setIframeLoading(true);
    setIframeVersion((v) => v + 1);
  }

  function handleCopyColdEmail() {
    if (!emailSubject || !emailBody) return;
    const full = `Subject: ${emailSubject}\n\n${emailBody}`;
    navigator.clipboard.writeText(full);
    setEmailCopied2(true);
    setTimeout(() => setEmailCopied2(false), 2000);
  }

  async function handleRegenerateEmail() {
    setRegeneratingEmail(true);
    try {
      const res = await fetch(`/api/preview/${slug}/regenerate-email`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setEmailSubject(data.subject);
        setEmailBody(data.body);
      }
    } catch {
      // silently fail
    } finally {
      setRegeneratingEmail(false);
    }
  }

  async function handleRemoveNote() {
    setRemovingNote(true);
    try {
      const res = await fetch(`/api/preview/${slug}/note`, { method: "DELETE" });
      if (res.ok) {
        setNote(null);
        setNoteDraft("");
        setEditingNote(false);
      }
    } catch {
      // silently fail
    } finally {
      setRemovingNote(false);
    }
  }

  async function handleSaveNote() {
    if (!noteDraft.trim()) return;
    setSavingNote(true);
    try {
      const res = await fetch(`/api/preview/${slug}/note`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: noteDraft.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setNote(data.message);
        setEditingNote(false);
      }
    } catch {
      // silently fail
    } finally {
      setSavingNote(false);
    }
  }

  const showCta = devName && devEmail;
  const [contactOpen, setContactOpen] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);

  function handleCopyEmail() {
    navigator.clipboard.writeText(devEmail);
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 2000);
  }

  return (
    <div className="h-screen flex flex-col bg-zinc-950 overflow-hidden">
      {/* ── Top bar ── */}
      <header className="relative z-30 shrink-0 h-12 flex items-center gap-2 px-4 bg-black/60 backdrop-blur-xl border-b border-white/10">
        {/* Left — back button (owner) + domain */}
        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
          {isOwner && (
            <Link
              href="/dashboard"
              className="flex items-center justify-center w-7 h-7 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Back to dashboard"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </Link>
          )}
          <span className="text-xs text-zinc-400 font-medium tracking-wide">
            {domain}
          </span>
        </div>

        {/* Center — segmented control + compare toggle */}
        <div className="flex-1 flex items-center justify-center gap-1.5 min-w-0 sm:absolute sm:left-1/2 sm:-translate-x-1/2">
          <nav className="flex items-center bg-white/[0.06] rounded-full p-0.5 border border-white/[0.08] max-w-full overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => switchView(tab.key)}
                disabled={!!pendingRevisionHtml || (compareMode && tab.key === "original")}
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
          {hasOriginalSite && (
            <button
              onClick={() => setCompareMode((c) => !c)}
              disabled={activeView === "original" || !!pendingRevisionHtml || editOpen || revising}
              title={
                activeView === "original"
                  ? "Switch to a redesign to compare"
                  : compareMode
                    ? "Exit compare view"
                    : "Compare with original"
              }
              className={`flex items-center justify-center w-7 h-7 rounded-full transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400 ${
                compareMode
                  ? "bg-white/15 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
            >
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="3" width="8" height="18" rx="1" />
                <rect x="14" y="3" width="8" height="18" rx="1" />
              </svg>
            </button>
          )}
        </div>

        {/* Right — edit + export */}
        {isOwner ? (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={toggleEditMode}
              disabled={activeView === "original" || !!pendingRevisionHtml}
              title={
                activeView === "original"
                  ? "Switch to a redesign to edit"
                  : editOpen
                    ? "Exit editing"
                    : "Edit this design"
              }
              className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400 ${
                editOpen
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
            {emailBody && (
              <button
                onClick={() => setEmailOpen(true)}
                title="View cold email"
                className="flex items-center justify-center w-8 h-8 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M22 7l-10 7L2 7" />
                </svg>
              </button>
            )}
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

      {/* ── Unified edit toolbar (owner only) ── */}
      {isOwner && editOpen && activeView !== "original" && (
        <div className="relative z-20 shrink-0 bg-black/60 backdrop-blur-xl border-b border-white/10 px-4 py-2.5">
          {pendingRevisionHtml ? (
            /* ── Pending revision: accept / discard ── */
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
            /* ── Revision limit reached: unlock UI ── */
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
                  <button
                    onClick={cancelEdits}
                    disabled={saving}
                    className="px-4 py-1.5 text-sm font-medium text-zinc-400 hover:text-white rounded-lg border border-white/10 hover:border-white/20 transition-colors disabled:opacity-40"
                  >
                    Cancel
                  </button>
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
            /* ── Normal editing: direct edit hint + AI prompt + save/cancel ── */
            <div className="max-w-3xl mx-auto">
              <p className="text-sm text-zinc-300 mb-2">
                {hasEdits ? (
                  <span className="text-amber-400">Unsaved changes</span>
                ) : (
                  "Click text or images to edit directly"
                )}
              </p>
              <div className="flex items-center gap-2">
                <form
                  onSubmit={handleRevise}
                  className="flex-1 flex items-center gap-2"
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
                {hasEdits && (
                  <button
                    onClick={saveEdits}
                    disabled={saving}
                    className="shrink-0 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-40 flex items-center gap-2"
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
                <button
                  onClick={cancelEdits}
                  disabled={saving}
                  className="shrink-0 px-4 py-1.5 text-sm font-medium text-zinc-400 hover:text-white rounded-lg border border-white/10 hover:border-white/20 transition-colors disabled:opacity-40"
                >
                  Cancel
                </button>
              </div>
              <div className="flex items-center justify-between mt-1.5">
                {revisionInfo && (
                  <p className="text-[11px] text-zinc-600">
                    {revisionInfo.revisionCount}/{revisionInfo.revisionLimit} revisions used
                  </p>
                )}
              </div>
            </div>
          )}
          {reviseError && (
            <p className="max-w-3xl mx-auto mt-1.5 text-xs text-red-400">
              {reviseError}
            </p>
          )}
        </div>
      )}

      {/* ── Iframe(s) ── */}
      {compareMode && activeView !== "original" ? (
        <div className="flex-1 flex flex-col sm:flex-row relative">
          {/* Original */}
          <div className="h-1/2 sm:h-auto sm:w-1/2 relative border-b sm:border-b-0 sm:border-r border-white/10">
            <span className="absolute top-3 left-3 z-20 px-2 py-0.5 bg-black/70 backdrop-blur text-[11px] font-medium text-zinc-400 rounded">
              Current
            </span>
            <iframe
              key={`compare-original`}
              src={originalUrl}
              sandbox="allow-scripts allow-same-origin"
              className="w-full h-full absolute inset-0 border-0"
              title="Current"
            />
          </div>
          {/* Variation */}
          <div className="h-1/2 sm:h-auto sm:w-1/2 relative">
            <span className="absolute top-3 left-3 z-20 px-2 py-0.5 bg-black/70 backdrop-blur text-[11px] font-medium text-emerald-400 rounded">
              {activeVariation?.label ?? "Redesign"}
            </span>
            <iframe
              key={`compare-variation-${activeView}-${iframeVersion}`}
              src={iframeSrc}
              className="w-full h-full absolute inset-0 border-0"
              title={activeVariation?.label ?? "Redesign"}
            />
          </div>
        </div>
      ) : pendingRevisionHtml ? (
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
        <footer className="relative z-30 shrink-0 bg-black/60 backdrop-blur-xl border-t border-white/10 px-4 sm:px-6 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
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
              <button
                onClick={() => setContactOpen(true)}
                className="sm:hidden shrink-0 px-4 py-2 bg-white hover:bg-neutral-200 text-zinc-900 text-xs font-semibold rounded-lg transition-colors"
              >
                Get in Touch
              </button>
            </div>

            {/* Center — dev message (hidden on mobile) */}
            <div className="hidden md:flex items-center gap-2 flex-1 justify-center px-4">
              {note ? (
                <>
                  <p className="text-sm text-zinc-400 truncate">{note}</p>
                  {isOwner && (
                    <>
                      <button
                        onClick={() => { setNoteDraft(note); setEditingNote(true); }}
                        className="shrink-0 text-zinc-600 hover:text-zinc-300 transition-colors"
                        title="Edit note"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={handleRemoveNote}
                        disabled={removingNote}
                        className="shrink-0 text-zinc-600 hover:text-zinc-300 transition-colors"
                        title="Remove note"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </>
                  )}
                </>
              ) : isOwner ? (
                <button
                  onClick={() => { setNoteDraft(""); setEditingNote(true); }}
                  className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors"
                >
                  + Add a personal note
                </button>
              ) : null}
            </div>

            {/* Right — CTA button (hidden on mobile, shown inline above) */}
            <button
              onClick={() => setContactOpen(true)}
              className="hidden sm:block shrink-0 px-5 py-2 bg-white hover:bg-neutral-200 text-zinc-900 text-sm font-semibold rounded-lg transition-colors"
            >
              Get in Touch
            </button>
          </div>
        </footer>
      )}

      {/* ── Cold Email Modal (owner only) ── */}
      {emailOpen && emailBody && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => { setEmailOpen(false); setEmailCopied2(false); }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-lg bg-zinc-900 border border-white/10 rounded-2xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { setEmailOpen(false); setEmailCopied2(false); }}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mx-auto mb-4">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M22 7l-10 7L2 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white text-center mb-1">Cold Email</h3>
            <p className="text-xs text-zinc-500 text-center mb-5">
              For {domain}
            </p>

            <div className="mb-3">
              <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1 block">Subject</label>
              <div className="px-3 py-2 bg-black/30 rounded-lg border border-white/5 text-sm text-white">
                {emailSubject}
              </div>
            </div>

            <div className="mb-5">
              <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1 block">Body</label>
              <div className="px-3 py-3 bg-black/30 rounded-lg border border-white/5 text-sm text-zinc-300 whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed">
                {emailBody}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRegenerateEmail}
                disabled={regeneratingEmail}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 border border-white/10 hover:border-indigo-500/30 text-zinc-400 hover:text-indigo-400 text-xs font-medium rounded-xl transition-colors disabled:opacity-50"
                title="Generate a new email"
              >
                <svg className={`w-3.5 h-3.5 ${regeneratingEmail ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 11-6.219-8.56" /><polyline points="21 3 21 9 15 9" />
                </svg>
                {regeneratingEmail ? "Generating..." : "Regenerate"}
              </button>
              <div className="flex-1" />
              <button
                onClick={() => { setEmailOpen(false); setEmailCopied2(false); }}
                className="px-4 py-2.5 border border-white/10 hover:border-white/20 text-zinc-300 text-sm font-medium rounded-xl transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleCopyColdEmail}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-neutral-200 text-zinc-900 text-sm font-semibold rounded-xl transition-all duration-200"
              >
                {emailCopied2 ? (
                  <>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Copied
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                    Copy Email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Contact Modal ── */}
      {contactOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setContactOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm bg-zinc-900 border border-white/10 rounded-2xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setContactOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Avatar / Logo */}
            <div className="flex flex-col items-center text-center mb-5">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt={displayName}
                  className="w-14 h-14 rounded-xl object-contain mb-3"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xl font-semibold mb-3">
                  {initial}
                </div>
              )}
              <h3 className="text-lg font-semibold text-white">{displayName}</h3>
              {companyName && companyName !== devName && (
                <p className="text-sm text-zinc-400">{devName}</p>
              )}
            </div>

            {/* Dev message */}
            {note ? (
              <div className="mb-5">
                <p className="text-sm text-zinc-400 text-center leading-relaxed italic">
                  &ldquo;{note}&rdquo;
                </p>
                {isOwner && (
                  <div className="flex items-center justify-center gap-3 mt-1.5">
                    <button
                      onClick={() => { setNoteDraft(note); setEditingNote(true); }}
                      className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={handleRemoveNote}
                      disabled={removingNote}
                      className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors"
                    >
                      {removingNote ? "Removing..." : "Remove"}
                    </button>
                  </div>
                )}
              </div>
            ) : isOwner ? (
              <button
                onClick={() => { setNoteDraft(""); setEditingNote(true); }}
                className="mb-5 mx-auto block text-xs text-zinc-600 hover:text-zinc-300 transition-colors"
              >
                + Add a personal note
              </button>
            ) : null}

            {/* Email row */}
            <div className="flex items-center gap-2 p-3 bg-zinc-800/50 border border-white/5 rounded-xl mb-4">
              <svg className="w-4 h-4 text-zinc-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7l-10 7L2 7" />
              </svg>
              <span className="text-sm text-zinc-300 truncate flex-1 font-mono">{devEmail}</span>
              <button
                onClick={handleCopyEmail}
                className="shrink-0 px-2.5 py-1 text-xs font-medium rounded-md bg-white/10 hover:bg-white/15 text-zinc-300 transition-colors"
              >
                {emailCopied ? "Copied!" : "Copy"}
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2">
              <a
                href={`mailto:${devEmail}?subject=Website Redesign&body=Hi ${encodeURIComponent(displayName)}, I saw the redesign preview and I'm interested in learning more.`}
                className="w-full py-2.5 bg-white hover:bg-neutral-200 text-zinc-900 text-sm font-semibold rounded-xl transition-colors text-center"
              >
                Send Email
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Note Modal (owner only) ── */}
      {editingNote && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setEditingNote(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm bg-zinc-900 border border-white/10 rounded-2xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setEditingNote(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <h3 className="text-sm font-semibold text-white mb-1">
              {note ? "Edit personal note" : "Add a personal note"}
            </h3>
            <p className="text-xs text-zinc-500 mb-4">
              This appears on the preview page to make your outreach feel personal.
            </p>

            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder={'e.g. "Hey, I noticed your site could use a refresh \u2014 here\'s what I\'d do."'}
              rows={3}
              className="w-full px-3.5 py-2.5 bg-zinc-800/50 border border-white/10 rounded-xl text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-white/20 transition-all resize-none mb-4"
              autoFocus
            />

            <div className="flex gap-2">
              <button
                onClick={() => setEditingNote(false)}
                className="flex-1 py-2 text-sm font-medium text-zinc-400 hover:text-white rounded-lg border border-white/10 hover:border-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNote}
                disabled={savingNote || !noteDraft.trim()}
                className="flex-1 py-2 text-sm font-semibold bg-white hover:bg-neutral-200 text-zinc-900 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {savingNote ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
