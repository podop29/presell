import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PREVIEW_HOST = process.env.NEXT_PUBLIC_PREVIEW_HOST || "";

export async function middleware(request: NextRequest) {
  // On the preview domain, only allow preview routes
  if (PREVIEW_HOST && request.headers.get("host") === PREVIEW_HOST) {
    const { pathname } = request.nextUrl;
    const isPreviewRoute =
      pathname.startsWith("/preview/") || pathname.startsWith("/api/preview/");
    if (!isPreviewRoute) {
      return new NextResponse("Not Found", { status: 404 });
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public assets (svg, png, jpg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
