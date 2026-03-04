import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { getUser } from "@/lib/auth";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PreviewClient from "./preview-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  console.time("metadata:db-query");
  const { data } = await supabase
    .from("previews")
    .select("original_url, dev_name, user_id, business_name")
    .eq("slug", params.slug)
    .single();
  console.timeEnd("metadata:db-query");

  if (!data) return { title: "Preview" };

  let domain = data.business_name || data.original_url;
  if (!data.business_name) {
    try {
      domain = new URL(data.original_url).hostname.replace(/^www\./, "");
    } catch {}
  }

  // Prefer company name from owner's branding settings
  let brandName = data.dev_name;
  if (data.user_id) {
    console.time("metadata:getUserById");
    const { data: owner } = await supabase.auth.admin.getUserById(
      data.user_id
    );
    console.timeEnd("metadata:getUserById");
    if (owner?.user?.user_metadata?.company_name) {
      brandName = owner.user.user_metadata.company_name;
    }
  }

  return {
    title: `${domain} — Redesign by ${brandName}`,
  };
}

export default async function PreviewPage({
  params,
}: {
  params: { slug: string };
}) {
  console.time("preview:db-query");
  const { data, error } = await supabase
    .from("previews")
    .select("*")
    .eq("slug", params.slug)
    .single();
  console.timeEnd("preview:db-query");

  if (error || !data) {
    notFound();
  }

  const isExpired = new Date(data.expires_at) < new Date();

  if (isExpired) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-semibold text-white">
            This preview has expired
          </h1>
          <p className="text-sm text-zinc-500">
            This redesign preview is no longer available. Please contact the
            developer for an updated link.
          </p>
        </div>
      </div>
    );
  }

  console.time("preview:getUser");
  const user = await getUser();
  console.timeEnd("preview:getUser");
  const isOwner = !!user && user.id === data.user_id;

  // Fetch owner branding
  let companyName = "";
  let logoUrl = "";
  if (data.user_id) {
    console.time("preview:getUserById");
    const { data: owner } = await supabase.auth.admin.getUserById(
      data.user_id
    );
    console.timeEnd("preview:getUserById");
    if (owner?.user?.user_metadata) {
      companyName = owner.user.user_metadata.company_name ?? "";
      logoUrl = owner.user.user_metadata.logo_url ?? "";
    }
  }

  // Detect if original_url is a real website (not a Google Maps link)
  const mapsPattern = /google\.com\/maps|maps\.google\.|maps\.app\.goo\.gl|goo\.gl\/maps/i;
  const hasOriginalSite = !mapsPattern.test(data.original_url);

  const variations: { key: string; label: string; src: string }[] = [];
  if (data.variation_a_html)
    variations.push({
      key: "a",
      label: data.variation_a_style || "Style A",
      src: `/api/preview/${data.slug}/variation-a`,
    });
  if (data.variation_b_html)
    variations.push({
      key: "b",
      label: data.variation_b_style || "Style B",
      src: `/api/preview/${data.slug}/variation-b`,
    });
  if (data.variation_c_html)
    variations.push({
      key: "c",
      label: data.variation_c_style || "Style C",
      src: `/api/preview/${data.slug}/variation-c`,
    });
  if (variations.length === 0)
    variations.push({
      key: "redesign",
      label: data.variation_a_style || "Redesign",
      src: `/api/preview/${data.slug}/html`,
    });

  return (
    <PreviewClient
      slug={data.slug}
      originalUrl={data.original_url}
      businessName={data.business_name}
      devName={data.dev_name}
      devEmail={data.dev_email}
      devMessage={data.dev_message}
      variations={variations}
      isOwner={isOwner}
      companyName={companyName}
      logoUrl={logoUrl}
      hasOriginalSite={hasOriginalSite}
    />
  );
}
