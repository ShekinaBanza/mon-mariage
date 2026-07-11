import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, INVITATION_STATUS, ASSIGNMENT_STATE, PRESENCE_STATE } from "@/lib/constants";
import { findSeatsForIndividual, findSeatsForCouple, assignSeatsToInvitation, releaseInvitationSeats } from "@/lib/seat-service";
import { generateAndStoreInvitationFiles } from "@/lib/invitation-render";
import { saveQrCode } from "@/lib/qr";
import { getSettings } from "@/lib/settings";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const action: string = body.action;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

  const inv = await db.invitation.findUnique({ where: { id }, include: { members: true, assignments: true } });
  if (!inv) return NextResponse.json({ error: "Invitation introuvable." }, { status: 404 });

  switch (action) {
    case "validate": {
      if (!can(user.role, "guests:validate")) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
      // Assign seats then activate
      try {
        if (inv.type === "couple") {
          const found = await findSeatsForCouple(inv.side);
          if (found) await assignSeatsToInvitation({ invitationId: id, memberIds: inv.members.map((m) => m.id), seatIds: [found.seat1.id, found.seat2.id], allowZoneMismatch: found.zoneMismatch });
        } else {
          const found = await findSeatsForIndividual(inv.side);
          if (found) await assignSeatsToInvitation({ invitationId: id, memberIds: [inv.members[0].id], seatIds: [found.seat.id], allowZoneMismatch: found.zoneMismatch });
        }
      } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
      const settings = await getSettings();
      await db.invitation.update({ where: { id }, data: { status: INVITATION_STATUS.ACTIVE, validatedAt: new Date(), validatedById: user.id } });
      const updated = await db.invitation.findUnique({ where: { id } });
      await saveQrCode(updated!.publicToken, `${settings.publicBaseUrl || ""}/i/${updated!.publicToken}`);
      try { await generateAndStoreInvitationFiles(id); } catch (e) { console.error(e); }
      await db.activityLog.create({ data: { actorId: user.id, action: "validate_invitation", entity: "invitation", entityId: id, ip } });
      return NextResponse.json({ success: true, message: "Invitation validée et place attribuée." });
    }
    case "reject": {
      if (!can(user.role, "guests:validate")) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
      await releaseInvitationSeats(id);
      await db.invitation.update({ where: { id }, data: { status: INVITATION_STATUS.REJECTED, cancelledReason: body.reason ?? null } });
      await db.activityLog.create({ data: { actorId: user.id, action: "reject_invitation", entity: "invitation", entityId: id, ip } });
      return NextResponse.json({ success: true, message: "Invitation refusée." });
    }
    case "cancel": {
      if (!can(user.role, "guests:cancel")) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
      await releaseInvitationSeats(id);
      await db.invitation.update({ where: { id }, data: { status: INVITATION_STATUS.CANCELLED, cancelledAt: new Date(), cancelledReason: body.reason ?? null } });
      await db.activityLog.create({ data: { actorId: user.id, action: "cancel_invitation", entity: "invitation", entityId: id, ip } });
      return NextResponse.json({ success: true, message: "Invitation annulée." });
    }
    case "reactivate": {
      if (!can(user.role, "guests:validate")) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
      await db.invitation.update({ where: { id }, data: { status: INVITATION_STATUS.ACTIVE, cancelledReason: null, cancelledAt: null } });
      await db.activityLog.create({ data: { actorId: user.id, action: "reactivate_invitation", entity: "invitation", entityId: id, ip } });
      return NextResponse.json({ success: true, message: "Invitation réactivée." });
    }
    case "regenerate": {
      if (!can(user.role, "guests:edit")) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
      try { await generateAndStoreInvitationFiles(id); } catch (e: any) { return NextResponse.json({ error: "Échec de génération: " + e.message }, { status: 500 }); }
      await db.activityLog.create({ data: { actorId: user.id, action: "regenerate_invitation", entity: "invitation", entityId: id, ip } });
      return NextResponse.json({ success: true, message: "PDF et image régénérés." });
    }
    case "change_table": {
      if (!can(user.role, "tables:manage")) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
      const tableId = body.tableId;
      const table = await db.table.findUnique({ where: { id: tableId }, include: { seats: { orderBy: { number: "asc" } }, assignments: true } });
      if (!table) return NextResponse.json({ error: "Table introuvable." }, { status: 404 });
      const free = table.seats.filter((s) => s.status === "available" && !table.assignments.some((a) => a.seatId === s.id));
      if (free.length < inv.seatCount) return NextResponse.json({ error: `Cette table n'a que ${free.length} place(s) libre(s).` }, { status: 400 });
      await releaseInvitationSeats(id);
      await assignSeatsToInvitation({ invitationId: id, memberIds: inv.members.map((m) => m.id), seatIds: free.slice(0, inv.seatCount).map((s) => s.id), allowZoneMismatch: true });
      await db.activityLog.create({ data: { actorId: user.id, action: "change_table", entity: "invitation", entityId: id, ip, meta: JSON.stringify({ tableId }) } });
      return NextResponse.json({ success: true, message: `Déplacé vers la table ${table.name}.` });
    }
    case "change_seat": {
      if (!can(user.role, "tables:manage")) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
      const seatIds: string[] = body.seatIds;
      await releaseInvitationSeats(id);
      await assignSeatsToInvitation({ invitationId: id, memberIds: inv.members.map((m) => m.id), seatIds, allowZoneMismatch: true });
      await db.activityLog.create({ data: { actorId: user.id, action: "change_seat", entity: "invitation", entityId: id, ip } });
      return NextResponse.json({ success: true, message: "Chaise(s) modifiée(s)." });
    }
    case "mark_present": {
      if (!can(user.role, "scanner:use")) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
      await db.invitation.update({ where: { id }, data: { presenceState: PRESENCE_STATE.ARRIVED, arrivedAt: new Date(), arrivedById: user.id } });
      await db.invitationMember.updateMany({ where: { invitationId: id }, data: { arrived: true, arrivedAt: new Date() } });
      await db.activityLog.create({ data: { actorId: user.id, action: "mark_present", entity: "invitation", entityId: id, ip } });
      return NextResponse.json({ success: true, message: "Présence enregistrée manuellement." });
    }
    case "reset_presence": {
      if (!can(user.role, "guests:edit")) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
      await db.invitation.update({ where: { id }, data: { presenceState: PRESENCE_STATE.NOT_ARRIVED, arrivedAt: null, arrivedById: null } });
      await db.invitationMember.updateMany({ where: { invitationId: id }, data: { arrived: false, arrivedAt: null } });
      await db.activityLog.create({ data: { actorId: user.id, action: "reset_presence", entity: "invitation", entityId: id, ip } });
      return NextResponse.json({ success: true, message: "Présence réinitialisée." });
    }
    case "resend_whatsapp": {
      if (!can(user.role, "guests:edit")) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
      const settings = await getSettings();
      const updated = await db.invitation.findUnique({ where: { id } });
      const link = `${settings.publicBaseUrl || ""}/i/${updated!.publicToken}`;
      return NextResponse.json({ success: true, link, message: "Lien prêt à partager." });
    }
    default:
      return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  }
}
