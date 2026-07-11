import { NextRequest, NextResponse } from "next/server";
import { renderInvitationPdf, renderInvitationJpg, renderInvitationPng } from "@/lib/invitation-render";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const url = new URL(req.url);
  const format = url.searchParams.get("format") ?? "pdf";

  const invitation = await db.invitation.findUnique({ where: { publicToken: token } });
  if (!invitation) {
    return NextResponse.json({ error: "Invitation introuvable." }, { status: 404 });
  }

  // Log the download
  await db.invitationDownload.create({
    data: {
      invitationId: invitation.id,
      format,
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    },
  });

  try {
    if (format === "pdf") {
      const buf = await renderInvitationPdf(invitation.id);
      return new NextResponse(buf, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="invitation-SR-${invitation.code}.pdf"`,
          "Cache-Control": "private, max-age=300",
        },
      });
    }
    if (format === "jpg") {
      const buf = await renderInvitationJpg(invitation.id, 2);
      return new NextResponse(buf, {
        headers: {
          "Content-Type": "image/jpeg",
          "Content-Disposition": `inline; filename="invitation-SR-${invitation.code}.jpg"`,
          "Cache-Control": "private, max-age=300",
        },
      });
    }
    if (format === "png") {
      const buf = await renderInvitationPng(invitation.id, 2);
      return new NextResponse(buf, {
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": `inline; filename="invitation-SR-${invitation.code}.png"`,
          "Cache-Control": "private, max-age=300",
        },
      });
    }
    return NextResponse.json({ error: "Format non supporté." }, { status: 400 });
  } catch (e) {
    console.error("Render error:", e);
    return NextResponse.json({ error: "Erreur de génération." }, { status: 500 });
  }
}
