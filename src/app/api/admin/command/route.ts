import { NextResponse } from "next/server";
import { z } from "zod";
import { setSetting } from "@/lib/settings";
import { authorize, handleError } from "@/lib/api";
import { audit } from "@/lib/auth";
import { publish } from "@/lib/realtime";
import { clearPrayerCache } from "@/lib/prayer/service";
import { FARDH_KEYS, MODULE_LABELS, MODULE_TYPES, PRAYER_LABELS } from "@/lib/types";

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

/** Remote cepat dari HP pengurus. */
export async function POST(request: Request) {
  const user = await authorize("remote");
  if (user instanceof NextResponse) return user;
  try {
    const cmd = schema.parse(await request.json());
    const log = (detail: string) => audit(user, "command", cmd.action, detail);
    switch (cmd.action) {
      case "reload":
        publish({ type: "command", command: "reload" });
        await log("Muat ulang layar TV");
        return NextResponse.json({ ok: true });
      case "show":
        await setSetting("override", { type: cmd.type, until: cmd.minutes ? Date.now() + cmd.minutes * 60_000 : null });
        await log(`Tampilkan ${MODULE_LABELS[cmd.type]}${cmd.minutes ? ` selama ${cmd.minutes} menit` : ""}`);
        break;
      case "clearShow":
        await setSetting("override", { type: null, until: null });
        await log("Kembali ke urutan tampilan");
        break;
      case "emergency":
        await setSetting("emergency", { active: true, text: cmd.text });
        await log(`Pesan darurat: ${cmd.text}`);
        break;
      case "clearEmergency":
        await setSetting("emergency", { active: false, text: "" });
        await log("Matikan pesan darurat");
        break;
      case "prayer":
        await setSetting("manualPrayer", { prayer: cmd.prayer, startedAt: Date.now() });
        await log(`Mulai layar sholat ${PRAYER_LABELS[cmd.prayer]}`);
        break;
      case "clearPrayer":
        await setSetting("manualPrayer", { prayer: null, startedAt: null });
        await log("Hentikan layar sholat manual");
        break;
      case "refreshPrayer":
        await clearPrayerCache();
        await log("Muat ulang jadwal sholat");
        break;
    }
    publish({ type: "update", topics: ["settings"] });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
