import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export type Role = "admin" | "staff";
const COOKIE = "session";
const MAX_AGE = 60 * 60 * 12; // 12 jam

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET belum diset");
  }
  return s || "dev-secret";
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function checkPassword(password: string): Role | null {
  const admin = process.env.ADMIN_PASSWORD;
  const staff = process.env.STAFF_PASSWORD || admin;
  if (admin && safeEqual(password, admin)) return "admin";
  if (staff && safeEqual(password, staff)) return "staff";
  return null;
}

export async function createSession(role: Role) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const payload = `${role}.${exp}`;
  const jar = await cookies();
  jar.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function getRole(): Promise<Role | null> {
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return null;
  const [role, exp, sig] = value.split(".");
  if (!sig || !safeEqual(sig, sign(`${role}.${exp}`))) return null;
  if (Number(exp) < Date.now() / 1000) return null;
  return role === "admin" || role === "staff" ? role : null;
}
