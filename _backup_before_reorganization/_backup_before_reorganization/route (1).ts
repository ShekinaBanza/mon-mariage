import { NextRequest, NextResponse } from "next/server";
import { authenticate, setSessionCookie, clearSessionCookie } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const ATTEMPTS = new Map<string, { count: number; reset: number }>();
function checkRate(ip: string, max = 8, windowMs = 5 * 60_000): boolean {
  const now = Date.now();
  const e = ATTEMPTS.get(ip);
  if (!e || e.reset < now) { ATTEMPTS.set(ip, { count: 1, reset: now + windowMs }); return true; }
  if (e.count >= max) return false;
  e.count++;
  return true;
}
function bumpFail(ip: string) {
  const now = Date.now();
  const e = ATTEMPTS.get(ip) ?? { count: 0, reset: now + 5 * 60_000 };
  e.count++;
  ATTEMPTS.set(ip, e);
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Requête invalide." }, { status: 400 }); }

  const email = (body.email ?? "").toString().toLowerCase().trim();
  const password = (body.password ?? "").toString();

  if (!email || !password) {
    return NextResponse.json({ error: "E-mail et mot de passe requis." }, { status: 400 });
  }
  if (!checkRate(ip)) {
    return NextResponse.json({ error: "Trop de tentatives. Réessayez dans 5 minutes." }, { status: 429 });
  }

  const user = await db.user.findUnique({ where: { email } });
  const ua = req.headers.get("user-agent") ?? "";

  if (!user) {
    bumpFail(ip);
    await db.loginAttempt.create({ data: { email, ip, userAgent: ua, success: false, reason: "user_not_found" } });
    return NextResponse.json({ error: "Identifiants invalides." }, { status: 401 });
  }

  const sessionUser = await authenticate(email, password);
  if (!sessionUser) {
    bumpFail(ip);
    await db.loginAttempt.create({ data: { email, ip, userAgent: ua, success: false, reason: "bad_password", userId: user.id } });
    return NextResponse.json({ error: "Identifiants invalides." }, { status: 401 });
  }

  await db.loginAttempt.create({ data: { email, ip, userAgent: ua, success: true, userId: user.id } });
  await db.activityLog.create({ data: { actorId: user.id, action: "login", entity: "user", entityId: user.id, ip } });

  const token = await (import("@/lib/auth")).then(m => m.createSessionToken(sessionUser));
  await setSessionCookie(token);
  return NextResponse.json({ success: true, user: sessionUser });
}

export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
