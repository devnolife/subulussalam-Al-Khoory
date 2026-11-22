import { NextResponse } from "next/server";
import { z } from "zod";
import { setSetting } from "@/lib/settings";
import { handleError, requireAdmin } from "@/lib/api";
import { publish } from "@/lib/realtime";
import { clearPrayerCache } from "@/lib/prayer/service";
import { FARDH_KEYS, MODULE_TYPES } from "@/lib/types";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("reload") }),
  z.object({
    action: z.literal("show"),
    type: z.enum(MODULE_TYPES),
    minutes: z.coerce.number().int().min(0).max(1440).default(0),
  }),
  z.object({ action: z.literal("clearShow") }),
  z.object({ action: z.literal("emergency"), text: z.string().trim().min(1).max(500) }),
  z.object({ action: z.literal("clearEmergency") }),
  z.object({ action: z.literal("prayer"), prayer: z.enum(FARDH_KEYS) }),
  z.object({ action: z.literal("clearPrayer") }),
  z.object({ action: z.literal("refreshPrayer") }),
]);

/** Remote cepat dari HP admin. */
export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const cmd = schema.parse(await request.json());
    switch (cmd.action) {
      case "reload":
        publish({ type: "command", command: "reload" });
        return NextResponse.json({ ok: true });
      case "show":
        await setSetting("override", { type: cmd.type, until: cmd.minutes ? Date.now() + cmd.minutes * 60_000 : null });
        break;
      case "clearShow":
        await setSetting("override", { type: null, until: null });
        break;
      case "emergency":
        await setSetting("emergency", { active: true, text: cmd.text });
        break;
      case "clearEmergency":
        await setSetting("emergency", { active: false, text: "" });
        break;
      case "prayer":
        await setSetting("manualPrayer", { prayer: cmd.prayer, startedAt: Date.now() });
        break;
      case "clearPrayer":
        await setSetting("manualPrayer", { prayer: null, startedAt: null });
        break;
      case "refreshPrayer":
        await clearPrayerCache();
        break;
    }
    publish({ type: "update", topics: ["settings"] });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
