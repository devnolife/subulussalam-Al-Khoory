import { NextResponse } from "next/server";
import { displayStatus } from "@/lib/realtime";
import { authorize } from "@/lib/api";

export async function GET() {
  const user = await authorize("remote");
  if (user instanceof NextResponse) return user;
  return NextResponse.json(displayStatus());
}
