import { NextResponse } from "next/server";
import { displayStatus } from "@/lib/realtime";
import { requireAdmin } from "@/lib/api";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  return NextResponse.json(displayStatus());
}
