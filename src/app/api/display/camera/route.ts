import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { handleError, jsonError } from "@/lib/api";
import { keyMatches } from "@/lib/access-key";
import { getDisplay } from "@/lib/displays";
import { listen } from "@/lib/realtime";
import { joinViewer, leaveViewer, signalFromViewer } from "@/lib/camera";
import { PEER_ID, type ViewerMessage } from "@/lib/camera-protocol";
import { MAX_SIGNAL_BYTES, viewerSignalSchema } from "@/lib/camera-signal";
import { readJson, sseResponse } from "@/lib/sse";
import { parseDisplayId } from "@/lib/types";

/**
 * Layar TV menonton siaran kamera: GET /api/display/camera?tv=&key=&session=&peer= (SSE).
 * Hanya layar dengan kunci yang benar yang boleh bergabung.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tv = parseDisplayId(url.searchParams.get("tv"));
  const session = url.searchParams.get("session") ?? "";
  const peer = url.searchParams.get("peer") ?? "";
  if (!tv || !session || !PEER_ID.test(peer)) return jsonError("Permintaan tidak valid", 400);
  try {
    const record = await getDisplay(tv);
    if (!record || !keyMatches(record.accessKey, url.searchParams.get("key"))) return jsonError("Kunci layar tidak cocok", 403);
  } catch (e) {
    return handleError(e);
  }
  const conn = randomUUID();

  return sseResponse(request, (send, close) => {
    const unlisten = listen<ViewerMessage>(`viewer:${conn}`, (msg) => {
      send(msg.type, msg);
      if (msg.type === "ended") close();
    });
    const joined = joinViewer(session, peer, tv, conn);
    if ("token" in joined) {
      send("ready", { type: "ready", token: joined.token } satisfies ViewerMessage);
      return () => {
        unlisten();
        leaveViewer(session, peer, conn);
      };
    }
    if ("full" in joined) send("full", { type: "full" } satisfies ViewerMessage);
    else send("ended", { type: "ended", reason: joined.ended } satisfies ViewerMessage);
    close();
    return unlisten;
  });
}

/** Layar → kamera: jawaban WebRTC atau kandidat jaringan. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await readJson(request, MAX_SIGNAL_BYTES);
  } catch {
    return jsonError("Permintaan tidak valid", 400);
  }
  try {
    const { session, peer, token, description, candidate } = viewerSignalSchema.parse(body);
    const ok = signalFromViewer(session, peer, token, { description, candidate });
    return NextResponse.json({ ok }, { status: ok ? 200 : 410 });
  } catch (e) {
    return handleError(e);
  }
}
