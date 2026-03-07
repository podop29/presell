import { NextRequest, NextResponse } from "next/server";
import { getRevisionInfo } from "@/lib/credits";
import { notifyError } from "@/lib/discord";

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const info = await getRevisionInfo(params.slug);
    return NextResponse.json(info);
  } catch (err) {
    console.error("Revision info error:", err);
    notifyError("Revision info error", err);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
