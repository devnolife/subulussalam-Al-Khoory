import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, handleError } from "@/lib/api";
import { audit } from "@/lib/auth";
import { cameraStatus, startCamera, stopCamera } from "@/lib/camera";
import { iceServers } from "@/lib/ice";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), audio: z.boolean().default(false) }),
  z.object({ action: z.literal("stop"), session: z.string().max(64).optional() }),
]);

export async function GET() {
  const user = await authorize("remote");
  if (user instanceof NextResponse) return user;
  return NextResponse.json(cameraStatus());
}

/** Mulai/hentikan siaran kamera. Memulai saat siaran lain berjalan akan menggantikannya. */
export async function POST(request: Request) {
  const user = await authorize("remote");
  if (user instanceof NextResponse) return user;
  try {
    const cmd = schema.parse(await request.json());
    if (cmd.action === "start") {
      const previous = cameraStatus();
      const session = startCamera({
        by: user.name || user.username,
        audio: cmd.audio,
        onLost: () => void audit(null, "camera", "lost", "Siaran kamera berhenti karena perangkat kamera terputus"),
      });
      await audit(
        user,
        "camera",
        "start",
        `Mulai siaran kamera${cmd.audio ? " dengan suara" : ""}${previous.live ? ` (menggantikan siaran oleh ${previous.by})` : ""}`,
      );
      return NextResponse.json({ session: session.id, startedAt: session.startedAt, iceServers: iceServers(Date.now()) });
    }
    const stopped = stopCamera(cmd.session);
    if (stopped) await audit(user, "camera", "stop", "Hentikan siaran kamera");
    return NextResponse.json({ ok: stopped });
  } catch (e) {
    return handleError(e);
  }
}
