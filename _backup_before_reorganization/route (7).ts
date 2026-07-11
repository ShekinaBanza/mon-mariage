import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, INVITATION_STATUS } from "@/lib/constants";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!can(user.role, "guests:view")) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const perPage = Math.min(100, Math.max(10, parseInt(url.searchParams.get("perPage") ?? "20")));
  const search = url.searchParams.get("search") ?? "";
  const status = url.searchParams.get("status") ?? "";
  const type = url.searchParams.get("type") ?? "";
  const side = url.searchParams.get("side") ?? "";
  const presence = url.searchParams.get("presence") ?? "";
  const sortBy = url.searchParams.get("sortBy") ?? "createdAt";
  const sortOrder = (url.searchParams.get("sortOrder") ?? "desc") as "asc" | "desc";

  const where: Prisma.InvitationWhereInput = {};
  if (status) where.status = status;
  if (type) where.type = type;
  if (side) where.side = side;
  if (presence) where.presenceState = presence;
  if (search) {
    where.OR = [
      { code: { contains: search.toUpperCase() } },
      { guest: { firstName: { contains: search } } },
      { guest: { lastName: { contains: search } } },
      { guest: { whatsapp: { contains: search } } },
      { guest: { email: { contains: search.toLowerCase() } } },
      { members: { some: { OR: [{ firstName: { contains: search } }, { lastName: { contains: search } }] } } },
    ];
  }

  const [total, items] = await Promise.all([
    db.invitation.count({ where }),
    db.invitation.findMany({
      where,
      include: {
        guest: true,
        members: true,
        table: true,
        assignments: { include: { seat: true } },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ]);

  return NextResponse.json({
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
    items: items.map(serialize),
  });
}

function serialize(inv: any) {
  const displayName =
    inv.type === "couple" && inv.members.length === 2
      ? `${inv.members[0].firstName} ${inv.members[0].lastName} & ${inv.members[1].firstName} ${inv.members[1].lastName}`
      : `${inv.members[0]?.firstName ?? ""} ${inv.members[0]?.middleName ? inv.members[0].middleName + " " : ""}${inv.members[0]?.lastName ?? ""}`.trim();
  return {
    id: inv.id,
    code: inv.code,
    qrCode: inv.qrCode,
    publicToken: inv.publicToken,
    type: inv.type,
    side: inv.side,
    status: inv.status,
    assignmentState: inv.assignmentState,
    presenceState: inv.presenceState,
    seatCount: inv.seatCount,
    displayName,
    members: inv.members.map((m: any) => ({ id: m.id, firstName: m.firstName, lastName: m.lastName, middleName: m.middleName, arrived: m.arrived, arrivedAt: m.arrivedAt })),
    whatsapp: inv.guest?.whatsapp,
    email: inv.guest?.email,
    comment: inv.comment,
    table: inv.table?.name ?? null,
    tableId: inv.tableId,
    seatCodes: inv.assignments.map((a: any) => a.seat.code).sort(),
    createdAt: inv.createdAt,
    validatedAt: inv.validatedAt,
    arrivedAt: inv.arrivedAt,
    lastGeneratedAt: inv.lastGeneratedAt,
  };
}
