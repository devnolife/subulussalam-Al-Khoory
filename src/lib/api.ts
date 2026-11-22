import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { isAuthenticated } from "./auth";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Mengembalikan response 401 jika belum login, atau null jika boleh lanjut. */
export async function requireAdmin(): Promise<NextResponse | null> {
  return (await isAuthenticated()) ? null : jsonError("Silakan login terlebih dahulu", 401);
}

export function handleError(e: unknown) {
  if (e instanceof ZodError) return jsonError(e.issues.map((i) => i.message).join(", "), 422);
  console.error(e);
  return jsonError("Terjadi kesalahan pada server", 500);
}

export function clientIp(req: Request): string {
  return req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
}
