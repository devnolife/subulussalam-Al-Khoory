import { markDisplay, subscribe, type RealtimeEvent } from "@/lib/realtime";

/** Server-Sent Events: TV menerima notifikasi perubahan konten & perintah remote. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const displayId = url.searchParams.get("display");
  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream({
    start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };
      send("retry: 3000\n\n");
      send(`event: hello\ndata: {}\n\n`);
      const unsubscribe = subscribe((e: RealtimeEvent) => send(`event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`));
      const ping = setInterval(() => {
        send(`: ping\n\n`);
        if (displayId) markDisplay(displayId, true);
      }, 20_000);
      if (displayId) markDisplay(displayId, true);

      cleanup = () => {
        clearInterval(ping);
        unsubscribe();
        if (displayId) markDisplay(displayId, false);
        cleanup = () => {};
        try {
          controller.close();
        } catch {}
      };
      request.signal.addEventListener("abort", () => cleanup());
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
