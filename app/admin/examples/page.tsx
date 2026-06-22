import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUser } from "@/lib/auth";
import ExamplePicker, { type Candidate } from "@/components/example-picker";

export const dynamic = "force-dynamic";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);

// Slugs currently featured on the homepage (keep in sync with examples-gallery.tsx).
const FEATURED = ["fwQZOlN7", "ZzmKUNqs", "lHvFfiJL", "G8uoC40j", "GaLlDV_G", "yrNP06js"];

export default async function ExamplePickerPage() {
  const user = await getUser();
  if (!user || !ADMIN_EMAILS.includes(user.email || "")) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <p className="text-neutral-500 text-sm">Forbidden.</p>
      </main>
    );
  }

  const { data } = await supabaseAdmin
    .from("previews")
    .select("slug, business_name, original_url, created_at, expires_at")
    .order("created_at", { ascending: false })
    .limit(411);

  const candidates: Candidate[] = (data || []).map((p) => ({
    slug: p.slug,
    name: p.business_name || hostnameOf(p.original_url) || p.slug,
    url: p.original_url || "",
    isMaps: (p.original_url || "").includes("google.com/maps"),
    expired: new Date(p.expires_at).getTime() < Date.now(),
  }));

  return <ExamplePicker candidates={candidates} featured={FEATURED} />;
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
