import { NextRequest, NextResponse } from "next/server";
import { renderSocialImage } from "@/lib/invitation-render";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  try {
    const buf = await renderSocialImage();
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch (e) {
    console.error("OG image error:", e);
    return NextResponse.json({ error: "Erreur de génération." }, { status: 500 });
  }
}
