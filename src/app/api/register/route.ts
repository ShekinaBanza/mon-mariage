import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { registerInvitation, detectDuplicates, RegistrationError } from "@/lib/registration";
import { saveQrCode } from "@/lib/qr";
import { getSettings } from "@/lib/settings";

export const runtime = "nodejs";

// Simple in-memory rate limiting per IP
const RATE_MAP = new Map<string, { count: number; reset: number }>();
function rateLimit(ip: string, max = 10, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = RATE_MAP.get(ip);
  if (!entry || entry.reset < now) {
    RATE_MAP.set(ip, { count: 1, reset: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

function getClientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function GET(req: NextRequest) {
  const side = req.nextUrl.searchParams.get("side");
  const requestedSeats = Math.max(1, Math.min(2, Number(req.nextUrl.searchParams.get("seats") ?? "1") || 1));
  const allowedZones = side === "groom" || side === "bride" ? [side, "common"] : ["groom", "bride", "common"];

  const tables = await db.table.findMany({
    where: {
      active: true,
      locked: false,
      zone: { in: allowedZones },
    },
    include: {
      seats: { orderBy: { number: "asc" } },
      assignments: true,
    },
  });

  const collator = new Intl.Collator("fr", { numeric: true, sensitivity: "base" });
  const availableTables = tables
    .map((table) => {
      const assignedSeatIds = new Set(table.assignments.map((a) => a.seatId));
      const seats = table.seats
        .filter((seat) => seat.status === "available" && !assignedSeatIds.has(seat.id))
        .map((seat) => ({
          id: seat.id,
          code: seat.code,
          number: seat.number,
        }));

      return {
        id: table.id,
        name: table.name,
        zone: table.zone,
        capacity: table.capacity,
        availableCount: seats.length,
        seats,
      };
    })
    .filter((table) => table.availableCount >= requestedSeats)
    .sort((a, b) => collator.compare(a.name, b.name));

  return NextResponse.json({ tables: availableTables });
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!rateLimit(ip, 10, 60_000)) {
    return NextResponse.json(
      { error: "Trop de tentatives. Veuillez réessayer dans un instant." },
      { status: 429 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  // Validate
  const type = body.type;
  if (type !== "individual" && type !== "couple") {
    return NextResponse.json({ error: "Type d'invitation invalide." }, { status: 400 });
  }
  const side = body.side;
  if (side !== "groom" && side !== "bride") {
    return NextResponse.json({ error: "Côté d'invitation invalide." }, { status: 400 });
  }
  const whatsapp = (body.whatsapp ?? "").toString().trim();
  if (!/^\+243\d{9}$/.test(whatsapp)) {
    return NextResponse.json({ error: "Numero WhatsApp invalide. Utilisez +243 suivi de 9 chiffres." }, { status: 400 });
  }
  const firstName = (body.firstName ?? "").toString().trim();
  const lastName = (body.lastName ?? "").toString().trim();
  if (!firstName || !lastName) {
    return NextResponse.json({ error: "Prénom et nom sont obligatoires." }, { status: 400 });
  }
  if (type === "couple") {
    if (!body.partnerFirstName || !body.partnerLastName) {
      return NextResponse.json({ error: "Les informations du deuxième membre du couple sont obligatoires." }, { status: 400 });
    }
  }

  // Duplicate detection — do NOT auto-create if a strong match is found
  const requestedSeatIds: string[] = Array.isArray(body.requestedSeatIds)
    ? Array.from(
        new Set<string>(
          body.requestedSeatIds
            .map((id: unknown) => String(id ?? "").trim())
            .filter((id: string) => id.length > 0)
        )
      )
    : [];
  const seatCount = type === "couple" ? 2 : 1;
  if (requestedSeatIds.length !== seatCount) {
    return NextResponse.json(
      { error: `Veuillez choisir ${seatCount} chaise${seatCount > 1 ? "s" : ""}.` },
      { status: 400 }
    );
  }

  const duplicates = await detectDuplicates({
    whatsapp,
    email: body.email,
    firstName,
    lastName,
    partnerFirstName: body.partnerFirstName,
    partnerLastName: body.partnerLastName,
    type,
  });

  if (duplicates.length > 0) {
    return NextResponse.json(
      {
        error: "DUPLICATE",
        duplicates,
        message:
          "Une invitation semble déjà exister pour ces informations. Vous pouvez la consulter via le lien ci-dessous ou contacter l'organisateur.",
      },
      { status: 409 }
    );
  }

  try {
    const result = await registerInvitation({
      type,
      side,
      whatsapp,
      email: body.email?.trim() || undefined,
      sex: body.sex || undefined,
      comment: body.comment || undefined,
      firstName,
      lastName,
      middleName: body.middleName || undefined,
      partnerFirstName: body.partnerFirstName,
      partnerLastName: body.partnerLastName,
      partnerMiddleName: body.partnerMiddleName,
      requestedSeatIds,
    });

    // Generate QR code immediately (lightweight). PDF/JPG generation stays
    // on-demand through /api/invitation/[token]/download to avoid dev-server
    // memory spikes.
    const settings = await getSettings();
    if (result.assigned) {
      try {
        await saveQrCode(result.publicToken, `${settings.publicBaseUrl || ""}/i/${result.publicToken}`);
      } catch (e) {
        console.error("QR save failed:", e);
      }
    }

    return NextResponse.json(result);
  } catch (e: any) {
    if (e instanceof RegistrationError) {
      const status =
        e.code === "CLOSED" || e.code === "DEADLINE" ? 403 :
        e.code === "FULL" || e.code === "MAX_INVITES" || e.code === "SEATS_UNAVAILABLE" ? 409 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("Registration error:", e);
    return NextResponse.json({ error: "Une erreur est survenue. Veuillez réessayer." }, { status: 500 });
  }
}
