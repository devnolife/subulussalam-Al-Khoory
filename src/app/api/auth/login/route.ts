import { NextResponse } from "next/server";
import { checkRateLimit, createSession, verifyPin } from "@/lib/auth";
import { clientIp, handleError, jsonError } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const ip = clientIp(request);
    const wait = checkRateLimit(ip);
    if (wait) return jsonError(`Terlalu banyak percobaan. Coba lagi dalam ${wait} detik.`, 429);
    const body = await request.json().catch(() => ({}));
    const pin = typeof body.pin === "string" ? body.pin.trim().slice(0, 65) : "";
    if (!(await verifyPin(pin, ip))) return jsonError("Kode salah", 401);
    await createSession();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
