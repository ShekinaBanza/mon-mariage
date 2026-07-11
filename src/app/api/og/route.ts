import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  try {
    const buf = await fs.readFile(path.join(process.cwd(), "public", "logo-social.png"));
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
      },
    });
  } catch (e) {
    console.error("OG image error:", e);
    return NextResponse.json({ error: "Erreur de génération." }, { status: 500 });
  }
}
