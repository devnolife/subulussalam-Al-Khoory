type Send = (event: string, data: unknown) => void;

/**
 * Response Server-Sent Events dengan ping berkala. `setup` boleh mengembalikan fungsi pembersih
 * yang dipanggil tepat sekali saat koneksi ditutup (oleh klien maupun lewat `close`).
 */
export function sseResponse(
  request: Request,
  setup: (send: Send, close: () => void) => (() => void) | void,
  opts: { pingMs?: number; onPing?: () => void } = {},
): Response {
  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      let teardown: (() => void) | void;
      const write = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };
      const send: Send = (event, data) => write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      const ping = setInterval(() => {
        write(": ping\n\n");
        if (!closed) opts.onPing?.();
      }, opts.pingMs ?? 20_000);

      cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(ping);
        teardown?.();
        try {
          controller.close();
        } catch {}
      };

      write("retry: 3000\n\n");
      const t = setup(send, () => cleanup());
      // `setup` bisa langsung menutup koneksi (mis. siaran sudah berakhir) sebelum pembersihnya tersimpan.
      if (closed) t?.();
      else teardown = t;
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

/** Isi JSON dengan batas ukuran agar sinyal WebRTC palsu yang sangat besar langsung ditolak. */
export async function readJson(request: Request, maxBytes: number): Promise<unknown> {
  const text = await request.text();
  if (text.length > maxBytes) throw new RangeError("Permintaan terlalu besar");
  return JSON.parse(text);
}
