import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/constants";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!can(user.role, "dashboard:view")) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const perPage = Math.min(100, Math.max(10, parseInt(url.searchParams.get("perPage") ?? "30")));
  const search = url.searchParams.get("search") ?? "";
  const result = url.searchParams.get("result") ?? "";

  const where: Prisma.ScanLogWhereInput = {};
  if (result) where.result = result;
  if (search) {
    where.OR = [
      { input: { contains: search } },
      { invitation: { code: { contains: search.toUpperCase() } } },
      { invitation: { qrCode: { contains: search.toUpperCase() } } },
      { invitation: { members: { some: { OR: [{ firstName: { contains: search } }, { lastName: { contains: search } }] } } } },
    ];
  }

  const [total, items] = await Promise.all([
    db.scanLog.count({ where }),
    db.scanLog.findMany({
      where,
      include: {
        invitation: { include: { members: true, table: true } },
        agent: { select: { name: true } },
      },
      orderBy: { at: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ]);

  return NextResponse.json({
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
    items: items.map((s) => ({
      id: s.id,
      result: s.result,
      input: s.input,
      note: s.note,
      at: s.at,
      ip: s.ip,
      agentName: s.agent?.name ?? "—",
      invitation: s.invitation
        ? {
            code: s.invitation.code,
            qrCode: s.invitation.qrCode,
            type: s.invitation.type,
            table: s.invitation.table?.name ?? null,
            displayName:
              s.invitation.members.length === 2
                ? `${s.invitation.members[0].firstName} & ${s.invitation.members[1].firstName}`
                : s.invitation.members[0]?.firstName ?? "—",
          }
        : null,
    })),
  });
}
