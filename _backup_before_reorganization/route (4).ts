import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizeCode } from "@/lib/codes";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: any = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Requête invalide." }, { status: 400 }); }

  const query = (body.query ?? "").toString().trim();
  if (query.length < 3) {
    return NextResponse.json({ error: "Saisie trop courte." }, { status: 400 });
  }

  // Try by qrCode (short 6-char) first
  const upper = query.toUpperCase();
  if (/^[A-Z0-9]{6}$/.test(upper)) {
    const byQr = await db.invitation.findUnique({
      where: { qrCode: upper },
      include: { guest: true, members: true, table: true },
    });
    if (byQr) return NextResponse.json({ matches: [serialize(byQr)] });
  }

  // Try by public token (10-char)
  if (/^[A-Z0-9]{10}$/.test(upper)) {
    const byToken = await db.invitation.findUnique({
      where: { publicToken: upper },
      include: { guest: true, members: true, table: true },
    });
    if (byToken) return NextResponse.json({ matches: [serialize(byToken)] });
  }

  // Try by backup code (normalized)
  const normalized = normalizeCode(query);
  const byCode = await db.invitation.findUnique({
    where: { code: normalized },
    include: { guest: true, members: true, table: true },
  });
  if (byCode) return NextResponse.json({ matches: [serialize(byCode)] });

  // Try by whatsapp
  const guests = await db.guest.findMany({
    where: { OR: [{ whatsapp: { contains: query } }, { email: { equals: query.toLowerCase() } }] },
    include: { invitations: { include: { guest: true, members: true, table: true } } },
  });
  const matches: any[] = [];
  for (const g of guests) {
    for (const inv of g.invitations) {
      matches.push(serialize(inv));
    }
  }

  // Fallback: case-insensitive code scan
  if (matches.length === 0) {
    const all = await db.invitation.findMany({ include: { guest: true, members: true, table: true } });
    const found = all.find((i) => normalizeCode(i.code) === normalized);
    if (found) matches.push(serialize(found));
  }

  if (matches.length === 0) {
    return NextResponse.json({ matches: [], message: "Aucune invitation trouvée." });
  }
  return NextResponse.json({ matches });
}

function serialize(inv: any) {
  const displayName =
    inv.type === "couple" && inv.members.length === 2
      ? `${inv.members[0].firstName} ${inv.members[0].lastName} & ${inv.members[1].firstName} ${inv.members[1].lastName}`
      : `${inv.members[0]?.firstName ?? ""} ${inv.members[0]?.lastName ?? ""}`.trim();
  return {
    publicToken: inv.publicToken,
    code: inv.code,
    displayName,
    type: inv.type,
    status: inv.status,
    table: inv.table?.name ?? null,
  };
}
