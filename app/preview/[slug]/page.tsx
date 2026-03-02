import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import PreviewClient from "./preview-client";

export const dynamic = "force-dynamic";

export default async function PreviewPage({
  params,
}: {
  params: { slug: string };
}) {
  const { data, error } = await supabase
    .from("previews")
    .select("*")
    .eq("slug", params.slug)
    .single();

  if (error || !data) {
    notFound();
  }

  const isExpired = new Date(data.expires_at) < new Date();

  if (isExpired) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-semibold text-white">
            This preview has expired.
          </h1>
          <a
            href="/"
            className="inline-block text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Powered by Presell
          </a>
        </div>
      </div>
    );
  }

  return (
    <PreviewClient
      slug={data.slug}
      originalUrl={data.original_url}
      styleName={data.variation_a_style || "Redesign"}
      devName={data.dev_name}
      devEmail={data.dev_email}
      devMessage={data.dev_message}
    />
  );
}
