import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { supabase } from "@/lib/supabase";
import { generateVariation } from "@/lib/ai";
import type { GenerateRequest } from "@/types";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const body: GenerateRequest = await req.json();
    const {
      url,
      devName,
      devEmail,
      devMessage,
      profile,
      selectedStyle,
      pageStructure,
      imageUrls,
    } = body;

    // Validate
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL provided." }, { status: 400 });
    }

    if (!devName || !devEmail) {
      return NextResponse.json(
        { error: "Name and email are required." },
        { status: 400 }
      );
    }

    if (!profile || !selectedStyle || !pageStructure) {
      return NextResponse.json(
        { error: "Missing analysis data. Please analyze the site first." },
        { status: 400 }
      );
    }

    // Generate the selected variation
    let html;
    try {
      html = await generateVariation(profile, imageUrls || [], selectedStyle, pageStructure);
    } catch {
      return NextResponse.json(
        { error: "Redesign generation failed. Please try again." },
        { status: 500 }
      );
    }

    // Save to Supabase
    const slug = nanoid(8);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const { error: dbError } = await supabase.from("previews").insert({
      slug,
      original_url: url,
      redesign_html: html,
      dev_name: devName,
      dev_email: devEmail,
      dev_message: devMessage || null,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      variation_a_style: selectedStyle.styleName,
    });

    if (dbError) {
      console.error("Supabase insert error:", dbError);
      return NextResponse.json(
        { error: "Failed to save preview. Please try again." },
        { status: 500 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    return NextResponse.json({
      slug,
      previewUrl: `${baseUrl}/preview/${slug}`,
    });
  } catch (err) {
    console.error("Generate error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
