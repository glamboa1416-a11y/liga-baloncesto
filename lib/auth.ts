import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "liga_admin";
export const SESSION_SECONDS = 60 * 60 * 24 * 7; // 7 días

export type LoginState = { error?: string } | undefined;

function secret(): string {
  return process.env.ADMIN_PASSWORD ?? "";
}

function sign(exp: string): string {
  return createHmac("sha256", secret()).update(`liga-admin:${exp}`).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/** El panel de administración solo funciona si hay una contraseña configurada. */
export function adminConfigured(): boolean {
  return secret().length >= 8;
}

export function checkPassword(input: string): boolean {
  return adminConfigured() && safeEqual(input, secret());
}

export function createSessionToken(): string {
  const exp = String(Date.now() + SESSION_SECONDS * 1000);
  return `${exp}.${sign(exp)}`;
}

export async function isAdmin(): Promise<boolean> {
  if (!adminConfigured()) return false;
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig) return false;
  if (!(Number(exp) > Date.now())) return false;
  return safeEqual(sig, sign(exp));
}
