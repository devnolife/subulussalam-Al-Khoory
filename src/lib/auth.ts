import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { query } from "./db";
import { getRaw, setRaw } from "./settings";

export const SESSION_COOKIE = "masjid_admin";
const SESSION_DAYS = 30;

const attempts = new Map<string, { count: number; until: number }>();

/** Batasi tebakan PIN: 5 kali gagal → kunci 5 menit per IP. */
export function checkRateLimit(ip: string): number {
  const a = attempts.get(ip);
  if (a && a.until > Date.now()) return Math.ceil((a.until - Date.now()) / 1000);
  return 0;
}

function recordFailure(ip: string) {
  const a = attempts.get(ip) ?? { count: 0, until: 0 };
  a.count += 1;
  if (a.count >= 5) {
    a.until = Date.now() + 5 * 60_000;
    a.count = 0;
  }
  attempts.set(ip, a);
}

export async function verifyPin(pin: string, ip: string): Promise<boolean> {
  const hash = await getRaw<string>("pinHash");
  const ok = !!hash && (await bcrypt.compare(pin, hash));
  if (ok) attempts.delete(ip);
  else recordFailure(ip);
  return ok;
}

export async function changePin(newPin: string): Promise<void> {
  await setRaw("pinHash", await bcrypt.hash(newPin, 10));
  await query("DELETE FROM sessions");
}

export async function createSession(): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await query("DELETE FROM sessions WHERE expires_at < now()");
  await query("INSERT INTO sessions (token, expires_at) VALUES ($1, $2)", [token, expires]);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIE !== "1",
    path: "/",
    expires,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await query("DELETE FROM sessions WHERE token = $1", [token]);
  jar.delete(SESSION_COOKIE);
}

export async function isAuthenticated(): Promise<boolean> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return false;
  const rows = await query("SELECT 1 FROM sessions WHERE token = $1 AND expires_at > now()", [token]);
  return rows.length > 0;
}
