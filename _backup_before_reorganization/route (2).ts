import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { INVITATION_STATUS, PRESENCE_STATE, can } from "@/lib/constants";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!can(user.role, "dashboard:view")) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const [
    totalInvitations,
    individualCount,
    coupleCount,
    totalPeople,
    totalSeats,
    occupiedSeats,
    groomCount,
    brideCount,
    arrivedPeople,
    pendingCount,
    rejectedCount,
    cancelledCount,
    activeCount,
    fullTables,
    allTables,
  ] = await Promise.all([
    db.invitation.count({ where: { status: { not: INVITATION_STATUS.CANCELLED } } }),
    db.invitation.count({ where: { type: "individual", status: { not: INVITATION_STATUS.CANCELLED } } }),
    db.invitation.count({ where: { type: "couple", status: { not: INVITATION_STATUS.CANCELLED } } }),
    db.invitationMember.count(),
    db.seat.count(),
    db.seatAssignment.count(),
    db.guest.count({ where: { side: "groom" } }),
    db.guest.count({ where: { side: "bride" } }),
    db.invitationMember.count({ where: { arrived: true } }),
    db.invitation.count({ where: { status: INVITATION_STATUS.PENDING } }),
    db.invitation.count({ where: { status: INVITATION_STATUS.REJECTED } }),
    db.invitation.count({ where: { status: INVITATION_STATUS.CANCELLED } }),
    db.invitation.count({ where: { status: INVITATION_STATUS.ACTIVE } }),
    db.table.count({ where: { active: true } }),
    db.table.findMany({ where: { active: true }, include: { assignments: true } }),
  ]);

  const freeSeats = totalSeats - occupiedSeats;
  const fillRate = totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0;
  const presenceRate = totalPeople > 0 ? Math.round((arrivedPeople / totalPeople) * 100) : 0;
  const tablesFull = allTables.filter((t) => t.assignments.length >= t.capacity).length;
  const tablesPartial = allTables.filter((t) => t.assignments.length > 0 && t.assignments.length < t.capacity).length;
  const tablesEmpty = allTables.filter((t) => t.assignments.length === 0).length;

  // Recent activity (last scans / registrations)
  const recentScans = await db.scanLog.findMany({
    take: 8,
    orderBy: { at: "desc" },
    include: { invitation: { include: { members: true } } },
  });
  const recentRegistrations = await db.invitation.findMany({
    take: 8,
    orderBy: { createdAt: "desc" },
    include: { members: true, table: true },
  });

  return NextResponse.json({
    totalInvitations,
    individualCount,
    coupleCount,
    totalPeople,
    totalSeats,
    occupiedSeats,
    freeSeats,
    groomCount,
    brideCount,
    arrivedPeople,
    pendingCount,
    rejectedCount,
    cancelledCount,
    activeCount,
    fullTables: tablesFull,
    partialTables: tablesPartial,
    emptyTables: tablesEmpty,
    fillRate,
    presenceRate,
    recentScans: recentScans.map((s) => ({
      id: s.id,
      result: s.result,
      at: s.at,
      name: s.invitation ? (s.invitation.members.length === 2 ? `${s.invitation.members[0].firstName} & ${s.invitation.members[1].firstName}` : s.invitation.members[0]?.firstName) : "Inconnu",
    })),
    recentRegistrations: recentRegistrations.map((r) => ({
      id: r.id,
      code: r.code,
      type: r.type,
      status: r.status,
      table: r.table?.name ?? null,
      name: r.members.length === 2 ? `${r.members[0].firstName} & ${r.members[1].firstName}` : r.members[0]?.firstName,
      createdAt: r.createdAt,
    })),
  });
}
