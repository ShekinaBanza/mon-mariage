import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/constants";
import { createTableWithSeats, seatCode } from "@/lib/seat-service";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!can(user.role, "tables:view") && !can(user.role, "tables:manage")) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  const tables = await db.table.findMany({
    include: {
      seats: { orderBy: { number: "asc" } },
      assignments: { include: { invitation: { include: { members: true } } } },
      invitations: { include: { members: true } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ tables });
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!can(user.role, "tables:manage")) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  const body = await req.json();
  const { name, zone, capacity, shape, positionX, positionY } = body;
  if (!name || !zone || !capacity) return NextResponse.json({ error: "Champs requis manquants." }, { status: 400 });
  try {
    const result = await createTableWithSeats({ name, zone, capacity: parseInt(capacity), shape: shape || "round", positionX: positionX ?? 0, positionY: positionY ?? 0 });
    await db.activityLog.create({ data: { actorId: user.id, action: "create_table", entity: "table", entityId: result.table.id, ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() } });
    return NextResponse.json({ success: true, table: result.table });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
