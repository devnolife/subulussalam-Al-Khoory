import { NextResponse } from "next/server";
import { z } from "zod";
import { audit, checkPassword, createSession, setPassword } from "@/lib/auth";
import { authorize, handleError, jsonError } from "@/lib/api";
import { passwordSchema } from "@/lib/users";

const schema = z.object({ current: z.string().max(128), password: passwordSchema });

/** Ganti password akun sendiri; sesi lain milik akun ini ikut keluar. */
export async function PUT(request: Request) {
  const user = await authorize(null);
  if (user instanceof NextResponse) return user;
  try {
    const { current, password } = schema.parse(await request.json());
    if (!(await checkPassword(user.id, current))) return jsonError("Password saat ini salah", 422);
    await setPassword(user.id, password);
    await createSession(user.id);
    await audit(user, "password", `pengguna:${user.username}`, "Mengganti password sendiri");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
