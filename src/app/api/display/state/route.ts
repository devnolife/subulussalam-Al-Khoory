import { NextResponse } from "next/server";
import { getDisplayState } from "@/lib/display-state";
import { handleError } from "@/lib/api";
import { createDemoState } from "@/lib/demo";

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
    return NextResponse.json(await getDisplayState(), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return handleError(e);
  }
}
