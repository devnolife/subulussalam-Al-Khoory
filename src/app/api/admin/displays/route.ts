import { NextResponse } from "next/server";
import { authorize, handleError } from "@/lib/api";
import { listDisplays } from "@/lib/displays";

/** Pengaturan layar TV 1–3 beserta kunci tautannya. */
export async function GET() {
  const user = await authorize("playlist");
  if (user instanceof NextResponse) return user;
  try {
    return NextResponse.json(await listDisplays());
  } catch (e) {
    return handleError(e);
  }
}
