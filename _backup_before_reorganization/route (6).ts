import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, INVITATION_STATUS, ASSIGNMENT_STATE } from "@/lib/constants";
import { findSeatsForIndividual, findSeatsForCouple, assignSeatsToInvitation, releaseInvitationSeats } from "@/lib/seat-service";
import { generateAndStoreInvitationFiles } from "@/lib/invitation-render";
import { saveQrCode } from "@/lib/qr";
import { getSettings } from "@/lib/settings";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!can(user.role, "guests:view")) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  const { id } = await params;
  const inv = await db.invitation.findUnique({
    where: { id },
    include: { guest: true, members: true, table: { include: { seats: true } }, assignments: { include: { seat: true, member: true } } },
  });
  if (!inv) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  return NextResponse.json(inv);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!can(user.role, "guests:edit")) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  const { id } = await params;
  const body = await req.json();

  const inv = await db.invitation.findUnique({ where: { id }, include: { guest: true, members: true } });
  if (!inv) return NextResponse.json({ error: "Invitation introuvable." }, { status: 404 });

  // Update guest + members
  if (body.guest) {
    await db.guest.update({ where: { id: inv.guestId }, data: { ...body.guest } });
  }
  if (body.members && Array.isArray(body.members)) {
    for (const m of body.members) {
      if (m.id) {
        await db.invitationMember.update({ where: { id: m.id }, data: { firstName: m.firstName, lastName: m.lastName, middleName: m.middleName, sex: m.sex } });
      }
    }
  }
  if (body.comment !== undefined) {
    await db.invitation.update({ where: { id }, data: { comment: body.comment } });
  }

  await db.activityLog.create({ data: { actorId: user.id, action: "edit_invitation", entity: "invitation", entityId: id, ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() } });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!can(user.role, "guests:edit")) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  const { id } = await params;
  await releaseInvitationSeats(id);
  await db.invitation.delete({ where: { id } });
  await db.activityLog.create({ data: { actorId: user.id, action: "delete_invitation", entity: "invitation", entityId: id, ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() } });
  return NextResponse.json({ success: true });
}
