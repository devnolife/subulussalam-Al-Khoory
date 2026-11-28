import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, handleError, jsonError } from "@/lib/api";
import { audit } from "@/lib/auth";
import { publish } from "@/lib/realtime";
import { getDisplay, rotateDisplayKey, updateDisplay } from "@/lib/displays";
import { dropViewers } from "@/lib/camera";
import { CAMERA_MODES, displayLabel, parseDisplayId } from "@/lib/types";

const schema = z.object({
  name: z.string().trim().max(40).optional(),
  cameraMode: z.enum(CAMERA_MODES).optional(),
  sound: z.boolean().optional(),
  /** Ganti kunci tautan layar; perangkat dengan tautan lama berhenti menerima siaran kamera. */
  rotateKey: z.literal(true).optional(),
});

const FIELD_LABELS: Record<string, string> = { name: "nama", cameraMode: "siaran kamera", sound: "suara" };

export async function PUT(request: Request, ctx: RouteContext<"/api/admin/displays/[id]">) {
  const id = parseDisplayId((await ctx.params).id);
  if (!id) return jsonError("Layar TV tidak dikenal", 404);
  const user = await authorize("playlist");
  if (user instanceof NextResponse) return user;
  try {
    const { rotateKey, ...patch } = schema.parse(await request.json());
    await updateDisplay(id, patch);
    if (rotateKey) {
      await rotateDisplayKey(id);
      dropViewers(id);
    }
    const record = await getDisplay(id);
    if (!record) return jsonError("Layar TV tidak dikenal", 404);
    publish({ type: "update", topics: ["displays"] });
    const changes = [
      ...Object.entries(patch)
        .filter(([, v]) => v !== undefined)
        .map(([k]) => FIELD_LABELS[k] ?? k),
      ...(rotateKey ? ["kunci tautan"] : []),
    ];
    await audit(user, "update", `displays:${id}`, `${displayLabel(record)} — ubah: ${changes.join(", ") || "-"}`);
    return NextResponse.json(record);
  } catch (e) {
    return handleError(e);
  }
}
