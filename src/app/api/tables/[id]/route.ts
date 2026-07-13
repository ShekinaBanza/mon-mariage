import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/constants";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!can(user.role, "tables:manage")) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  const data: any = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.zone !== undefined) data.zone = body.zone;
  if (body.capacity !== undefined) data.capacity = parseInt(body.capacity);
  if (body.active !== undefined) data.active = body.active;
  if (body.locked !== undefined) data.locked = body.locked;
  if (body.shape !== undefined) data.shape = body.shape;
  if (body.positionX !== undefined) data.positionX = body.positionX;
  if (body.positionY !== undefined) data.positionY = body.positionY;
  const table = await db.table.update({ where: { id }, data });
  await db.activityLog.create({
    data: {
      actorId: user.id,
      action: "update_table",
      entity: "table",
      entityId: id,
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
      meta: JSON.stringify(data),
    },
  });
  return NextResponse.json({ success: true, table });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!can(user.role, "tables:manage")) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  const { id } = await params;
  // Check no assignments
  const count = await db.seatAssignment.count({ where: { tableId: id } });
  if (count > 0) return NextResponse.json({ error: "Impossible de supprimer une table avec des places occupées." }, { status: 400 });
  await db.table.delete({ where: { id } });
  await db.activityLog.create({
    data: {
      actorId: user.id,
      action: "delete_table",
      entity: "table",
      entityId: id,
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    },
  });
  return NextResponse.json({ success: true });
}
