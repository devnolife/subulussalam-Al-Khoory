import { NextResponse } from "next/server";
import { authorize } from "@/lib/api";
import { listen } from "@/lib/realtime";
import { attachCamera } from "@/lib/camera";
import type { CameraMessage } from "@/lib/camera-protocol";
import { sseResponse } from "@/lib/sse";

/** Kanal sinyal untuk halaman kamera: layar yang bergabung/keluar dan jawaban WebRTC dari layar. */
export async function GET(request: Request) {
  const user = await authorize("remote");
  if (user instanceof NextResponse) return user;
  const session = new URL(request.url).searchParams.get("session") ?? "";

  return sseResponse(request, (send, close) => {
    const unlisten = listen<CameraMessage>(`camera:${session}`, (msg) => {
      send(msg.type, msg);
      if (msg.type === "ended") close();
    });
    const attached = attachCamera(session);
    if ("ended" in attached) {
      send("ended", { type: "ended", reason: attached.ended } satisfies CameraMessage);
      close();
      return unlisten;
    }
    send("viewers", { type: "viewers", viewers: attached.viewers } satisfies CameraMessage);
    return () => {
      unlisten();
      attached.detach();
    };
  });
}
