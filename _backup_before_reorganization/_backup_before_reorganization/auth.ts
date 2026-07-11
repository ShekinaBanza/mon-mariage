import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { ROLES, can } from "@/lib/constants";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

const SESSION_COOKIE = "sr_admin_session";
const SESSION_SECRET = process.env.SESSION_SECRET || "sr-wedding-secret-change-me-in-production-2026";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

async function getKey(): Promise<Uint8Array> {
  return new TextEncoder().encode(SESSION_SECRET);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(await getKey());
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, await getKey());
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function authenticate(email: string, password: string): Promise<SessionUser | null> {
  const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user || !user.active) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export function requireRole(user: SessionUser | null, ...roles: string[]): SessionUser {
  if (!user) throw new Error("UNAUTHORIZED");
  if (!roles.includes(user.role) && user.role !== ROLES.SUPER_ADMIN) {
    throw new Error("FORBIDDEN");
  }
  return user;
}

export function requirePermission(user: SessionUser | null, permission: string): SessionUser {
  if (!user) throw new Error("UNAUTHORIZED");
  if (!can(user.role, permission)) throw new Error("FORBIDDEN");
  return user;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}
