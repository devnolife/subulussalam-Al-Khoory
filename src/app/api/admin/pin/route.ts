import { NextResponse } from "next/server";
import { z } from "zod";
import { changePin, createSession } from "@/lib/auth";
import { handleError, requireAdmin } from "@/lib/api";

const schema = z.object({ pin: z.string().trim().min(6, "Kode minimal 6 karakter").max(64) });

export async function PUT(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { pin } = schema.parse(await request.json());
    await changePin(pin);
    await createSession();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
