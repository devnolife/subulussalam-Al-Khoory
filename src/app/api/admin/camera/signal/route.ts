import { NextResponse } from "next/server";
import { authorize, handleError, jsonError } from "@/lib/api";
import { signalFromCamera } from "@/lib/camera";
import { cameraSignalSchema, MAX_SIGNAL_BYTES } from "@/lib/camera-signal";
import { readJson } from "@/lib/sse";

/** Kamera → satu layar TV: penawaran WebRTC atau kandidat jaringan. */
export async function POST(request: Request) {
  const user = await authorize("remote");
  if (user instanceof NextResponse) return user;
  let body: unknown;
  try {
    body = await readJson(request, MAX_SIGNAL_BYTES);
  } catch {
    return jsonError("Permintaan tidak valid", 400);
  }
  try {
    const { session, to, description, candidate } = cameraSignalSchema.parse(body);
    return NextResponse.json({ ok: signalFromCamera(session, to, { description, candidate }) });
  } catch (e) {
    return handleError(e);
  }
}
