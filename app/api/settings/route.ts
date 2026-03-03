import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/svg+xml",
  "image/webp",
];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin.auth.admin.getUserById(user.id);
  if (error || !data.user) {
    return NextResponse.json(
      { error: "Failed to fetch settings." },
      { status: 500 }
    );
  }

  const meta = data.user.user_metadata ?? {};
  return NextResponse.json({
    companyName: meta.company_name ?? "",
    logoUrl: meta.logo_url ?? "",
  });
}

export async function PUT(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const companyName = (formData.get("companyName") as string | null) ?? "";
  const logo = formData.get("logo") as File | null;
  const removeLogo = formData.get("removeLogo") === "true";

  // Validate company name
  if (companyName.length > 100) {
    return NextResponse.json(
      { error: "Company name must be 100 characters or less." },
      { status: 400 }
    );
  }

  // Validate logo file if present
  if (logo && logo.size > 0) {
    if (!ALLOWED_TYPES.includes(logo.type)) {
      return NextResponse.json(
        { error: "Logo must be PNG, JPG, SVG, or WebP." },
        { status: 400 }
      );
    }
    if (logo.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Logo must be under 2 MB." },
        { status: 400 }
      );
    }
  }

  let logoUrl = user.user_metadata?.logo_url ?? "";

  // Remove logo
  if (removeLogo) {
    // Delete all files under the user's logo folder
    const { data: files } = await supabaseAdmin.storage
      .from("logos")
      .list(user.id);
    if (files && files.length > 0) {
      await supabaseAdmin.storage
        .from("logos")
        .remove(files.map((f) => `${user.id}/${f.name}`));
    }
    logoUrl = "";
  }

  // Upload new logo
  if (logo && logo.size > 0) {
    // Delete old files first
    const { data: files } = await supabaseAdmin.storage
      .from("logos")
      .list(user.id);
    if (files && files.length > 0) {
      await supabaseAdmin.storage
        .from("logos")
        .remove(files.map((f) => `${user.id}/${f.name}`));
    }

    const ext = logo.name.split(".").pop() ?? "png";
    const path = `${user.id}/logo.${ext}`;
    const buffer = Buffer.from(await logo.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage
      .from("logos")
      .upload(path, buffer, {
        contentType: logo.type,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: "Failed to upload logo." },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from("logos").getPublicUrl(path);

    // Cache-bust param
    logoUrl = `${publicUrl}?t=${Date.now()}`;
  }

  // Update user metadata
  const { error: updateError } =
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        company_name: companyName,
        logo_url: logoUrl,
      },
    });

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to save settings." },
      { status: 500 }
    );
  }

  return NextResponse.json({ companyName, logoUrl });
}
