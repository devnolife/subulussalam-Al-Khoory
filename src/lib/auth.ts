import { cookies } from "next/headers";
import { cache } from "react";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { query } from "./db";
import type { SessionUser } from "./permissions";

export type { SessionUser };

export const SESSION_COOKIE = "masjid_admin";
const SESSION_DAYS = 30;

const LIMITS = { user: 5, ip: 20 };
const LOCK_MS = 5 * 60_000;
const attempts = new Map<string, { count: number; until: number }>();

function lockedFor(key: string): number {
  const a = attempts.get(key);
  return a && a.until > Date.now() ? Math.ceil((a.until - Date.now()) / 1000) : 0;
}

function fail(key: string, limit: number) {
  const a = attempts.get(key) ?? { count: 0, until: 0 };
  a.count += 1;
  if (a.count >= limit) {
    a.until = Date.now() + LOCK_MS;
    a.count = 0;
  }
  attempts.set(key, a);
}

/** Batasi tebakan: 5 gagal per IP+username atau 20 gagal per IP → kunci 5 menit. */
export function checkRateLimit(ip: string, username: string): number {
  return Math.max(lockedFor(`ip:${ip}`), lockedFor(`u:${ip}|${username}`));
}

export function normalizeUsername(v: string): string {
  return v.trim().toLowerCase();
}

// Hash pengganti agar waktu respons sama saat username tidak ada.
let dummyHash: Promise<string> | undefined;

export async function verifyLogin(usernameInput: string, password: string, ip: string): Promise<SessionUser | null> {
  const username = normalizeUsername(usernameInput);
  const rows = await query<SessionUser & { password_hash: string; active: boolean }>(
    "SELECT id, username, name, role, active, password_hash FROM users WHERE username = $1",
    [username],
  );
  const row = rows[0];
  dummyHash ??= bcrypt.hash("tidak-ada-pengguna", 10);
  const ok = (await bcrypt.compare(password, row?.password_hash ?? (await dummyHash))) && !!row?.active;
  if (!ok) {
    fail(`ip:${ip}`, LIMITS.ip);
    fail(`u:${ip}|${username}`, LIMITS.user);
    return null;
  }
  attempts.delete(`u:${ip}|${username}`);
  await query("UPDATE users SET last_login_at = now() WHERE id = $1", [row.id]);
  return { id: row.id, username: row.username, name: row.name, role: row.role };
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function checkPassword(userId: number, password: string): Promise<boolean> {
  const rows = await query<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = $1", [userId]);
  return !!rows[0] && bcrypt.compare(password, rows[0].password_hash);
}

/** Ganti password dan keluarkan semua sesi pengguna tersebut. */
export async function setPassword(userId: number, password: string): Promise<void> {
  await query("UPDATE users SET password_hash = $1 WHERE id = $2", [await hashPassword(password), userId]);
  await query("DELETE FROM sessions WHERE user_id = $1", [userId]);
}

export async function createSession(userId: number): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await query("DELETE FROM sessions WHERE expires_at < now()");
  await query("INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)", [token, userId, expires]);
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

/** Pengguna yang sedang login (akun aktif dengan sesi valid), dimemo per request. */
export const currentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await query<SessionUser>(
    `SELECT u.id, u.username, u.name, u.role FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = $1 AND s.expires_at > now() AND u.active`,
    [token],
  );
  return rows[0] ?? null;
});

/** Catat aktivitas pengurus untuk halaman Riwayat. Gagal mencatat tidak membatalkan aksi. */
export async function audit(user: SessionUser | null, action: string, target = "", detail = ""): Promise<void> {
  try {
    await query("INSERT INTO audit_log (user_id, username, action, target, detail) VALUES ($1, $2, $3, $4, $5)", [
      user?.id ?? null,
      user?.username ?? "",
      action,
      target.slice(0, 120),
      detail.slice(0, 300),
    ]);
  } catch (e) {
    console.error("Gagal mencatat riwayat", e);
  }
}
