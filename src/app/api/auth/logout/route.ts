import { NextResponse } from "next/server";
import { audit, currentUser, destroySession } from "@/lib/auth";

export async function POST() {
  const user = await currentUser();
  await destroySession();
  if (user) await audit(user, "logout");
  return NextResponse.json({ ok: true });
}
