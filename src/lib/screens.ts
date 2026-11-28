import { keyMatches } from "./access-key";
import { cameraStatus } from "./camera";
import type { CameraStatus } from "./camera-protocol";
import { defaultDisplay, listDisplays, publicDisplay } from "./displays";
import { connectedScreens } from "./realtime";
import { DISPLAY_IDS, type ScreenStatus } from "./types";

export type ScreensOverview = {
  /** Jumlah perangkat layar berbeda yang sedang terhubung ke semua TV. */
  connected: number;
  displays: ScreenStatus[];
  camera: CameraStatus;
};

/** Layar yang terhubung per TV + status siaran kamera, untuk Remote, Kamera, dan beranda. */
export async function screensOverview(): Promise<ScreensOverview> {
  const records = await listDisplays();
  const screens = connectedScreens();
  const displays: ScreenStatus[] = DISPLAY_IDS.map((id) => {
    const record = records.find((r) => r.id === id);
    const mine = screens.filter((s) => s.tv === id);
    const keyed = mine.filter((s) => record && keyMatches(record.accessKey, s.key));
    return {
      ...(record ? publicDisplay(record) : defaultDisplay(id)),
      connected: new Set(mine.map((s) => s.client)).size,
      keyed: new Set(keyed.map((s) => s.client)).size,
      lastSeen: mine.length ? Math.max(...mine.map((s) => s.lastSeen)) : null,
    };
  });
  return {
    connected: new Set(screens.map((s) => `${s.tv}:${s.client}`)).size,
    displays,
    camera: cameraStatus(),
  };
}
