import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { registerInvitation, detectDuplicates, RegistrationError } from "@/lib/registration";
import { saveQrCode } from "@/lib/qr";
import { getSettings } from "@/lib/settings";

// Lazy-load the heavy rendering module (sharp + pdf-lib + fonts) to avoid
// loading it at compile time and reduce memory pressure on the dev server.
async function generateAndStoreInvitationFiles(invitationId: string) {
  const mod = await import("@/lib/invitation-render");
  return mod.generateAndStoreInvitationFiles(invitationId);
}

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
  if (whatsapp.length < 6) {
    return NextResponse.json({ error: "Numéro WhatsApp invalide." }, { status: 400 });
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
    });

    // Generate QR code immediately (lightweight) and defer PDF/JPG generation
    // to avoid OOM kills on the dev server. The files are generated on-demand
    // when the user downloads them via /api/invitation/[token]/download.
    const settings = await getSettings();
    if (result.assigned) {
      try {
        await saveQrCode(result.publicToken, `${settings.publicBaseUrl || ""}/i/${result.publicToken}`);
      } catch (e) {
        console.error("QR save failed:", e);
      }
      // Fire-and-forget: generate PDF/JPG in the background without blocking
      // the response. Errors are logged but don't fail the registration.
      generateAndStoreInvitationFiles(result.invitationId).catch((e) =>
        console.error("Background file generation failed:", e)
      );
    }

    return NextResponse.json({ success: true, ...result });
  } catch (e: any) {
    if (e instanceof RegistrationError) {
      const status =
        e.code === "CLOSED" || e.code === "DEADLINE" ? 403 :
        e.code === "FULL" || e.code === "MAX_INVITES" ? 409 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("Registration error:", e);
    return NextResponse.json({ error: "Une erreur est survenue. Veuillez réessayer." }, { status: 500 });
  }
}
