import { NextResponse } from "next/server";
import { audit, checkRateLimit, createSession, normalizeUsername, verifyLogin } from "@/lib/auth";
import { clientIp, handleError, jsonError } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const ip = clientIp(request);
    const body = await request.json().catch(() => ({}));
    const username = typeof body.username === "string" ? normalizeUsername(body.username).slice(0, 40) : "";
    const password = typeof body.password === "string" ? body.password.slice(0, 129) : "";
    const wait = checkRateLimit(ip, username);
    if (wait) return jsonError(`Terlalu banyak percobaan. Coba lagi dalam ${wait} detik.`, 429);
    const user = username && password ? await verifyLogin(username, password, ip) : null;
    if (!user) return jsonError("Nama pengguna atau password salah", 401);
    await createSession(user.id);
    await audit(user, "login");
    // Beranda dashboard bisa dibuka semua peran; isinya menyesuaikan izin.
    return NextResponse.json({ ok: true, home: "/admin" });
  } catch (e) {
    return handleError(e);
  }
}
