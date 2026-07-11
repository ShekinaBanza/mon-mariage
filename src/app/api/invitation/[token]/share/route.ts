import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  let body: any = {};
  try { body = await req.json(); } catch {}
  const channel = body.channel ?? "other";

  const invitation = await db.invitation.findUnique({ where: { publicToken: token } });
  if (!invitation) {
    return NextResponse.json({ error: "Invitation introuvable." }, { status: 404 });
  }

  await db.invitationShare.create({
    data: {
      invitationId: invitation.id,
      channel,
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    },
  });
  await db.invitation.update({
    where: { id: invitation.id },
    data: { lastShareAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
