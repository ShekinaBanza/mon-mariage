import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/constants";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!can(user.role, "exports:view")) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const format = new URL(req.url).searchParams.get("format") ?? "csv";
  const type = new URL(req.url).searchParams.get("type") ?? "all"; // all | present | absent | by_table

  const invitations = await db.invitation.findMany({
    where: { status: { in: ["active", "approved"] } },
    include: { guest: true, members: true, table: true, assignments: { include: { seat: true } } },
    orderBy: [{ table: { name: "asc" } }, { code: "asc" }],
  });

  let filtered = invitations;
  if (type === "present") {
    filtered = invitations.filter((i) => i.presenceState === "arrived" || i.presenceState === "partially_arrived");
  } else if (type === "absent") {
    filtered = invitations.filter((i) => i.presenceState === "not_arrived");
  }

  const headers = ["N°", "Code", "Code QR", "Type", "Côté", "Nom affiché", "Membres", "WhatsApp", "Email", "Table", "Places", "Statut", "Présence", "Date inscription", "Date validation", "Date arrivée"];

  const rows = filtered.map((inv, idx) => {
    const displayName =
      inv.type === "couple" && inv.members.length === 2
        ? `${inv.members[0].firstName} ${inv.members[0].lastName} & ${inv.members[1].firstName} ${inv.members[1].lastName}`
        : `${inv.members[0]?.firstName ?? ""} ${inv.members[0]?.lastName ?? ""}`.trim();
    const membersStr = inv.members.map((m) => `${m.firstName} ${m.lastName}`).join(" | ");
    const seatCodes = inv.assignments.map((a) => a.seat.code).sort().join(", ");
    return [
      idx + 1,
      inv.code,
      inv.qrCode,
      inv.type === "couple" ? "Couple" : "Individuel",
      inv.side === "groom" ? "Homme" : "Femme",
      displayName,
      membersStr,
      inv.guest?.whatsapp ?? "",
      inv.guest?.email ?? "",
      inv.table?.name ?? "",
      seatCodes,
      inv.status,
      inv.presenceState,
      inv.createdAt.toISOString(),
      inv.validatedAt?.toISOString() ?? "",
      inv.arrivedAt?.toISOString() ?? "",
    ];
  });

  if (format === "csv") {
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    // BOM for Excel UTF-8 compatibility
    return new NextResponse("\uFEFF" + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="invites-SR-${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  if (format === "json") {
    return NextResponse.json({ headers, rows });
  }

  return NextResponse.json({ error: "Format non supporté. Utilisez ?format=csv ou ?format=json" }, { status: 400 });
}
