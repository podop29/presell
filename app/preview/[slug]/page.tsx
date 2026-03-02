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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-semibold text-gray-900">
            This preview has expired
          </h1>
          <p className="text-gray-500">
            This redesign preview is no longer available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <PreviewClient
      slug={data.slug}
      originalUrl={data.original_url}
      devName={data.dev_name}
      devEmail={data.dev_email}
      devMessage={data.dev_message}
    />
  );
}
