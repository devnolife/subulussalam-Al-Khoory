import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { currentUser, type SessionUser } from "./auth";
import { can, type Permission } from "./permissions";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Pengguna yang login dan punya izin `permission` (null = cukup login),
 * atau response 401/403 yang harus langsung dikembalikan.
 */
export async function authorize(permission: Permission | null): Promise<SessionUser | NextResponse> {
  const user = await currentUser();
  if (!user) return jsonError("Silakan login terlebih dahulu", 401);
  if (permission && !can(user.role, permission)) return jsonError("Akun Anda tidak punya akses untuk tindakan ini", 403);
  return user;
}

export function handleError(e: unknown) {
  if (e instanceof ZodError) return jsonError(e.issues.map((i) => i.message).join(", "), 422);
  console.error(e);
  return jsonError("Terjadi kesalahan pada server", 500);
}

export function clientIp(req: Request): string {
  return req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
}
