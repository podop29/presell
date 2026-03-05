import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUser } from "@/lib/auth";

const MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};
const ALLOWED_TYPES = Object.keys(MIME_TO_EXT);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = params;

    // Verify ownership
    const { data: preview, error: previewError } = await supabaseAdmin
      .from("previews")
      .select("user_id, expires_at")
      .eq("slug", slug)
      .single();

    if (previewError || !preview) {
      return NextResponse.json(
        { error: "Preview not found." },
        { status: 404 }
      );
    }

    if (preview.user_id !== user.id) {
      return NextResponse.json(
        { error: "You do not have permission to modify this preview." },
        { status: 403 }
      );
    }

    if (new Date(preview.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "This preview has expired." },
        { status: 410 }
      );
    }

    const formData = await req.formData();
    const image = formData.get("image") as File | null;

    if (!image || image.size === 0) {
      return NextResponse.json(
        { error: "No image provided." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(image.type)) {
      return NextResponse.json(
        { error: "Image must be PNG, JPG, WebP, or GIF." },
        { status: 400 }
      );
    }

    if (image.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Image must be under 5 MB." },
        { status: 400 }
      );
    }

    const ext = MIME_TO_EXT[image.type] ?? "png";
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    const path = `${slug}/${timestamp}-${random}.${ext}`;
    const buffer = Buffer.from(await image.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage
      .from("preview-images")
      .upload(path, buffer, {
        contentType: image.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Image upload error:", uploadError.message);
      return NextResponse.json(
        { error: "Failed to upload image." },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from("preview-images").getPublicUrl(path);

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    console.error("Upload image error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
