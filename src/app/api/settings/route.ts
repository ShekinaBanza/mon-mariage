import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/constants";
import { getSettings } from "@/lib/settings";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!can(user.role, "dashboard:view")) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  const s = await getSettings();
  return NextResponse.json(s);
}

export async function PUT(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!can(user.role, "settings:manage")) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  const body = await req.json();

  const allowed = [
    "groomFirstName", "groomLastName", "brideFirstName", "brideLastName", "monogram", "eventTitle",
    "weddingDate", "ceremonyAddress", "ceremonyTime", "receptionAddress", "receptionTime", "mapsLink",
    "invitationText", "giftMessage", "romanticPhrase", "closingSignature", "instructions",
    "primaryColor", "secondaryColor", "accentColor", "font", "logoUrl", "socialImageUrl",
    "maxPeople", "maxInvitations", "registrationOpen", "registrationDeadline", "validationMode",
    "showSeatsOnInvitation", "tableFormat", "whatsappContact", "contactEmail", "publicBaseUrl",
  ];

  const data: any = {};
  for (const k of allowed) {
    if (body[k] !== undefined) {
      if (k === "weddingDate" || k === "registrationDeadline") {
        data[k] = body[k] ? new Date(body[k]) : null;
      } else if (k === "maxPeople" || k === "maxInvitations") {
        data[k] = parseInt(body[k]) || 0;
      } else if (k === "registrationOpen" || k === "showSeatsOnInvitation") {
        data[k] = Boolean(body[k]);
      } else {
        data[k] = body[k];
      }
    }
  }

  const updated = await db.weddingSettings.update({ where: { id: "default" }, data });
  await db.activityLog.create({ data: { actorId: user.id, action: "update_settings", entity: "settings", entityId: "default", ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() } });
  return NextResponse.json({ success: true, settings: updated });
}
