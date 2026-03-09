import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { generateColdEmail } from "@/lib/ai";
import { getUser } from "@/lib/auth";
import type { BusinessProfile } from "@/types";
import { notifyError } from "@/lib/discord";

export async function POST(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "You must be signed in." },
        { status: 401 }
      );
    }

    const { slug } = params;
    const { data, error } = await supabase
      .from("previews")
      .select("user_id, original_url, business_name, dev_name")
      .eq("slug", slug)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Preview not found." },
        { status: 404 }
      );
    }

    if (data.user_id !== user.id) {
      return NextResponse.json(
        { error: "You do not have permission to modify this preview." },
        { status: 403 }
      );
    }

    const mapsPattern = /google\.com\/maps|maps\.google\.|maps\.app\.goo\.gl|goo\.gl\/maps/i;
    const isNewSite = mapsPattern.test(data.original_url);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const previewBaseUrl = process.env.NEXT_PUBLIC_PREVIEW_URL || baseUrl;
    const previewUrl = `${previewBaseUrl}/preview/${slug}`;

    // Build a minimal profile from what we have stored
    const profile: BusinessProfile = {
      businessName: data.business_name || "this business",
      industry: "",
      whatTheyDo: "",
      targetCustomer: "",
      keySellingPoints: [],
      brandTone: "",
      primaryColors: "",
      location: "",
    };

    const coldEmail = await generateColdEmail(
      profile,
      previewUrl,
      data.dev_name,
      isNewSite
    );

    // Save to DB
    const { error: updateError } = await supabase
      .from("previews")
      .update({
        cold_email_subject: coldEmail.subject,
        cold_email_body: coldEmail.body,
      })
      .eq("slug", slug);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to save email." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      subject: coldEmail.subject,
      body: coldEmail.body,
    });
  } catch (err) {
    console.error("Regenerate email error:", err);
    notifyError("Regenerate email error", err);
    return NextResponse.json(
      { error: "Failed to generate email." },
      { status: 500 }
    );
  }
}
