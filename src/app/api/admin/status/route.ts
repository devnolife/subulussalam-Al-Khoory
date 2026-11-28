import { NextResponse } from "next/server";
import { authorize, handleError } from "@/lib/api";
import { screensOverview } from "@/lib/screens";

/** Layar yang terhubung per TV + status siaran kamera, untuk halaman Remote, Kamera, dan beranda. */
export async function GET() {
  const user = await authorize("remote");
  if (user instanceof NextResponse) return user;
  try {
    return NextResponse.json(await screensOverview());
  } catch (e) {
    return handleError(e);
  }
}
