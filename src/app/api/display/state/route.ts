import { NextResponse } from "next/server";
import { getDisplayState } from "@/lib/display-state";
import { handleError, jsonError } from "@/lib/api";
import { currentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createDemoState } from "@/lib/demo";
import { parseDisplayId } from "@/lib/types";

/**
 * GET /api/display/state?tv=1..3&key=KUNCI (tanpa `tv` = TV 1).
 * `preview=1` dari panel pengurus yang login ikut melihat status siaran kamera tanpa kunci.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    if (url.searchParams.get("demo") === "1") {
      if (process.env.DEMO_MODE !== "1") {
        return NextResponse.json({ error: "Mode demo tidak aktif" }, { status: 404 });
      }
      return NextResponse.json(
        createDemoState(Date.now(), url.searchParams.get("module"), url.searchParams.get("phase")),
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const tvParam = url.searchParams.get("tv");
    const tv = tvParam === null ? 1 : parseDisplayId(tvParam);
    if (!tv) return jsonError("Layar TV tidak dikenal", 404);
    let trusted = false;
    if (url.searchParams.has("preview")) {
      const user = await currentUser();
      trusted = !!user && (can(user.role, "remote") || can(user.role, "playlist"));
    }
    return NextResponse.json(await getDisplayState(tv, { key: url.searchParams.get("key"), trusted }), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return handleError(e);
  }
}
