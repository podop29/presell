import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { generateVariation, generateColdEmail } from "@/lib/ai";
import { rateLimit, getIP } from "@/lib/rate-limit";
import { getUser } from "@/lib/auth";
import { getBalance, deductCredit } from "@/lib/credits";
import type { GenerateRequest } from "@/types";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    // Require auth
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "You must be signed in to generate a preview." },
        { status: 401 }
      );
    }

    // Check credits
    const balance = await getBalance(user.id);
    if (balance < 1) {
      return NextResponse.json(
        { error: "You don't have enough credits.", insufficientCredits: true, balance: 0 },
        { status: 402 }
      );
    }

    // Rate limit: 3 generations per 10 minutes per IP
    const ip = getIP(req.headers);
    const limit = rateLimit(`generate:${ip}`, { maxRequests: 3, windowMs: 10 * 60 * 1000 });
    if (!limit.success) {
      return NextResponse.json(
        { error: `Too many requests. Please try again in ${limit.retryAfter} seconds.` },
        { status: 429 }
      );
    }

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
      stockImageUrls,
      pageContent,
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
      html = await generateVariation(profile, imageUrls || [], stockImageUrls || [], selectedStyle, pageStructure, pageContent || "");
    } catch (aiErr) {
      console.error("AI generation error:", aiErr);
      const message =
        aiErr instanceof Error && (aiErr.message.includes("401") || aiErr.message.includes("auth"))
          ? "AI generation failed — please check your API key or credits and try again."
          : "Redesign generation failed. Please try again.";
      return NextResponse.json({ error: message }, { status: 502 });
    }

    // Save to Supabase
    const slug = nanoid(8);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const previewUrl = `${baseUrl}/preview/${slug}`;

    // Generate cold email (non-blocking — don't fail the whole request if this errors)
    let coldEmail = { subject: "", body: "" };
    try {
      coldEmail = await generateColdEmail(profile, previewUrl, devName);
    } catch (emailErr) {
      console.error("Cold email generation error:", emailErr);
    }

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
      user_id: user.id,
      cold_email_subject: coldEmail.subject || null,
      cold_email_body: coldEmail.body || null,
      business_name: profile.businessName || null,
    });

    if (dbError) {
      console.error("Supabase insert error:", dbError.message, dbError.details, dbError.hint);
      return NextResponse.json(
        { error: `Failed to save preview: ${dbError.message}` },
        { status: 500 }
      );
    }

    // Deduct credit AFTER successful DB insert
    await deductCredit(user.id, 1, "generation", `Generated preview for ${url}`, slug);

    return NextResponse.json({
      slug,
      previewUrl,
    });
  } catch (err) {
    console.error("Generate error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
