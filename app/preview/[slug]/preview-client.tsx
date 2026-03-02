"use client";

import { useState } from "react";

interface PreviewClientProps {
  slug: string;
  originalUrl: string;
  devName: string;
  devEmail: string;
  devMessage: string | null;
}

export default function PreviewClient({
  slug,
  originalUrl,
  devName,
  devEmail,
  devMessage,
}: PreviewClientProps) {
  const [view, setView] = useState<"before" | "after">("after");

  const defaultMessage =
    "I'd love to help you build this. Reach out and let's talk.";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-900 tracking-tight">
          Presell{" "}
          <span className="text-gray-400 font-normal">
            &mdash; Website Redesign Preview
          </span>
        </span>

        <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setView("before")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === "before"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Before
          </button>
          <button
            onClick={() => setView("after")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === "after"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            After
          </button>
        </div>
      </header>

      {/* Iframe Area */}
      <div className="flex-1 relative">
        {view === "before" ? (
          <iframe
            src={originalUrl}
            className="w-full h-full absolute inset-0 border-0"
            title="Original website"
            sandbox="allow-scripts allow-same-origin"
          />
        ) : (
          <iframe
            src={`/api/preview/${slug}/html`}
            className="w-full h-full absolute inset-0 border-0"
            title="Redesigned website"
          />
        )}
      </div>

      {/* Bottom CTA */}
      <footer className="bg-white border-t border-gray-200 px-6 py-5">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-6">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-gray-900">{devName}</p>
            <p className="text-sm text-gray-500">{devEmail}</p>
            <p className="text-sm text-gray-600 mt-1">
              {devMessage || defaultMessage}
            </p>
          </div>
          <a
            href={`mailto:${devEmail}?subject=Website Redesign&body=Hi ${devName}, I saw the redesign preview and I'm interested in learning more.`}
            className="shrink-0 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Get in Touch with {devName}
          </a>
        </div>
      </footer>
    </div>
  );
}
