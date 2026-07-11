import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, PRESENCE_STATE, SCAN_RESULT } from "@/lib/constants";

export const runtime = "nodejs";

/** POST /api/scan/confirm — confirm entry for an invitation (and optionally specific members). */
export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!can(user.role, "scanner:use")) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const body = await req.json();
  const invitationId: string = body.invitationId;
  const memberIds: string[] | undefined = body.memberIds; // if provided, only mark these
  const refuse: boolean = !!body.refuse;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  const inv = await db.invitation.findUnique({ where: { id: invitationId }, include: { members: true } });
  if (!inv) return NextResponse.json({ error: "Invitation introuvable." }, { status: 404 });

  if (refuse) {
    await db.$transaction(async (tx) => {
      await tx.invitation.update({ where: { id: invitationId }, data: { presenceState: PRESENCE_STATE.REFUSED_ENTRY, arrivedAt: new Date(), arrivedById: user.id } });
      await tx.attendanceLog.create({ data: { invitationId, agentId: user.id, action: "refuse_entry", ip, note: "Entrée refusée" } });
      await tx.scanLog.create({ data: { invitationId, agentId: user.id, input: inv.code, result: SCAN_RESULT.REFUSED, ip } });
    });
    return NextResponse.json({ success: true, message: "Entrée refusée enregistrée." });
  }

  await db.$transaction(async (tx) => {
    const now = new Date();
    const membersToMark = memberIds ? inv.members.filter((m) => memberIds.includes(m.id)) : inv.members;
    for (const m of membersToMark) {
      if (!m.arrived) {
        await tx.invitationMember.update({ where: { id: m.id }, data: { arrived: true, arrivedAt: now } });
        await tx.attendanceLog.create({ data: { invitationId, memberId: m.id, agentId: user.id, action: "confirm_entry", ip } });
      }
    }
    // Recompute presence state
    const updatedMembers = await tx.invitationMember.findMany({ where: { invitationId } });
    const arrivedCount = updatedMembers.filter((m) => m.arrived).length;
    let presence = PRESENCE_STATE.NOT_ARRIVED;
    if (arrivedCount === updatedMembers.length) presence = PRESENCE_STATE.ARRIVED;
    else if (arrivedCount > 0) presence = PRESENCE_STATE.PARTIALLY_ARRIVED;
    await tx.invitation.update({ where: { id: invitationId }, data: { presenceState: presence, arrivedAt: arrivedCount > 0 ? now : null, arrivedById: user.id } });
    await tx.scanLog.create({ data: { invitationId, agentId: user.id, input: inv.code, result: SCAN_RESULT.VALID, ip, note: `Confirmé (${arrivedCount}/${updatedMembers.length})` } });
  });

  return NextResponse.json({ success: true, message: "Entrée confirmée." });
}
