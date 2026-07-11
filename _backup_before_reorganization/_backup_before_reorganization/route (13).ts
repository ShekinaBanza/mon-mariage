import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, INVITATION_STATUS, PRESENCE_STATE, SCAN_RESULT } from "@/lib/constants";
import { getInvitationByCode } from "@/lib/registration";
import { normalizeCode } from "@/lib/codes";

export const runtime = "nodejs";

const RATE = new Map<string, { count: number; reset: number }>();
function rateLimit(ip: string, max = 60, windowMs = 60_000): boolean {
  const now = Date.now();
  const e = RATE.get(ip);
  if (!e || e.reset < now) { RATE.set(ip, { count: 1, reset: now + windowMs }); return true; }
  if (e.count >= max) return false;
  e.count++; return true;
}

/** POST /api/scan — lookup by token or code, returns the invitation + result classification. */
export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!can(user.role, "scanner:use")) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(ip)) return NextResponse.json({ error: "Trop de scans. Patientez." }, { status: 429 });

  const body = await req.json();
  const input: string = (body.input ?? "").toString().trim();
  if (!input) return NextResponse.json({ error: "Aucune saisie." }, { status: 400 });

  // The QR code now contains a short 6-char qrCode (not a URL).
  // We also still support: full URLs (/i/TOKEN), public tokens, and backup codes (with dashes).
  let invitation = null;
  const upper = input.toUpperCase();

  // 1) Try by qrCode (short 6-char code embedded in QR) — most common case
  if (/^[A-Z0-9]{6}$/.test(upper)) {
    invitation = await db.invitation.findUnique({
      where: { qrCode: upper },
      include: { guest: true, members: true, table: true, assignments: { include: { seat: true } } },
    });
  }

  // 2) Try by URL (/i/TOKEN)
  if (!invitation && input.startsWith("http")) {
    try {
      const u = new URL(input);
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts[0] === "i" && parts[1]) {
        invitation = await db.invitation.findUnique({
          where: { publicToken: parts[1].toUpperCase() },
          include: { guest: true, members: true, table: true, assignments: { include: { seat: true } } },
        });
      }
    } catch {}
  }

  // 3) Try by public token (10-char alphanumeric, no dashes)
  if (!invitation && /^[A-Z0-9]{10}$/.test(upper)) {
    invitation = await db.invitation.findUnique({
      where: { publicToken: upper },
      include: { guest: true, members: true, table: true, assignments: { include: { seat: true } } },
    });
  }

  // 4) Try by backup code (with dashes, e.g. BAN-T1-X7K9) — tolerant
  if (!invitation) {
    invitation = await getInvitationByCode(input);
  }

  const device = req.headers.get("user-agent") ?? "";

  // Not found
  if (!invitation) {
    await db.failedScanAttempt.create({ data: { input, reason: "not_found", ip } });
    await db.scanLog.create({ data: { agentId: user.id, input, result: SCAN_RESULT.INVALID, device, ip, note: "Invitation introuvable" } });
    return NextResponse.json({ result: SCAN_RESULT.INVALID, message: "QR code invalide ou invitation introuvable." });
  }

  // Cancelled / rejected
  if (invitation.status === INVITATION_STATUS.CANCELLED || invitation.status === INVITATION_STATUS.REJECTED) {
    await db.scanLog.create({ data: { invitationId: invitation.id, agentId: user.id, input, result: SCAN_RESULT.CANCELLED, device, ip, note: invitation.cancelledReason } });
    return NextResponse.json({
      result: SCAN_RESULT.CANCELLED,
      message: `Invitation ${invitation.status === "cancelled" ? "annulée" : "refusée"}.`,
      reason: invitation.cancelledReason,
      invitation: serialize(invitation),
    });
  }

  // Pending
  if (invitation.status === INVITATION_STATUS.PENDING) {
    await db.scanLog.create({ data: { invitationId: invitation.id, agentId: user.id, input, result: SCAN_RESULT.INVALID, device, ip, note: "Invitation non validée" } });
    return NextResponse.json({ result: SCAN_RESULT.INVALID, message: "Cette invitation n'est pas encore validée.", invitation: serialize(invitation) });
  }

  // Already arrived (full)
  if (invitation.presenceState === PRESENCE_STATE.ARRIVED) {
    const firstArrival = invitation.members.find((m) => m.arrivedAt)?.arrivedAt ?? invitation.arrivedAt;
    const agent = invitation.arrivedById ? await db.user.findUnique({ where: { id: invitation.arrivedById } }) : null;
    await db.scanLog.create({ data: { invitationId: invitation.id, agentId: user.id, input, result: SCAN_RESULT.ALREADY_USED, device, ip } });
    return NextResponse.json({
      result: SCAN_RESULT.ALREADY_USED,
      message: "Invitation déjà contrôlée.",
      firstArrival,
      agentName: agent?.name,
      invitation: serialize(invitation),
    });
  }

  // Valid (not yet arrived, or partially arrived for couples)
  await db.scanLog.create({ data: { invitationId: invitation.id, agentId: user.id, input, result: SCAN_RESULT.VALID, device, ip } });
  return NextResponse.json({
    result: SCAN_RESULT.VALID,
    message: invitation.presenceState === PRESENCE_STATE.PARTIALLY_ARRIVED
      ? "Couple : une personne déjà arrivée."
      : "Invitation valide.",
    invitation: serialize(invitation),
  });
}

function serialize(inv: any) {
  return {
    id: inv.id,
    code: inv.code,
    qrCode: inv.qrCode,
    publicToken: inv.publicToken,
    type: inv.type,
    side: inv.side,
    status: inv.status,
    presenceState: inv.presenceState,
    table: inv.table?.name ?? null,
    seatCodes: inv.assignments.map((a: any) => a.seat.code).sort(),
    members: inv.members.map((m: any) => ({ id: m.id, firstName: m.firstName, lastName: m.lastName, middleName: m.middleName, arrived: m.arrived, arrivedAt: m.arrivedAt })),
    whatsapp: inv.guest?.whatsapp,
    comment: inv.comment,
    cancelledReason: inv.cancelledReason,
  };
}
