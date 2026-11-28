import { randomUUID } from "crypto";
import { markDisplay, subscribe, type RealtimeEvent } from "@/lib/realtime";
import { sseResponse } from "@/lib/sse";
import { parseDisplayId } from "@/lib/types";

const CLIENT_ID = /^[a-z0-9]{4,40}$/i;

/**
 * Server-Sent Events: layar TV menerima notifikasi perubahan konten & perintah remote.
 * GET /api/stream?tv=1..3&client=ID&key=KUNCI — tanpa `client` (pratinjau admin) tidak dihitung sebagai layar terhubung.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tvParam = url.searchParams.get("tv");
  const tv = tvParam === null ? 1 : parseDisplayId(tvParam);
  if (!tv) return new Response("Layar TV tidak dikenal", { status: 404 });
  // `display` = nama parameter lama, dari tab TV yang belum dimuat ulang sejak pembaruan.
  const rawClient = url.searchParams.get("client") ?? url.searchParams.get("display");
  const client = rawClient && CLIENT_ID.test(rawClient) ? rawClient : null;
  const key = url.searchParams.get("key")?.slice(0, 64) || null;
  const conn = randomUUID();
  const mark = () => {
    if (client) markDisplay(conn, { tv, client, key });
  };

  return sseResponse(
    request,
    (send) => {
      send("hello", {});
      mark();
      const unsubscribe = subscribe((e: RealtimeEvent) => {
        if (e.type === "command" && e.tv && e.tv !== tv) return;
        send(e.type, e);
      });
      return () => {
        unsubscribe();
        if (client) markDisplay(conn, null);
      };
    },
    { onPing: mark },
  );
}
