import { query } from "./db";
import { newAccessKey } from "./access-key";
import { DISPLAY_IDS, type CameraMode, type DisplayConfig, type DisplayId, type DisplayOverride, type ModuleType } from "./types";

type Row = {
  id: number;
  name: string;
  camera_mode: CameraMode;
  sound: boolean;
  access_key: string;
  override_type: ModuleType | null;
  override_until: string | null;
};

/** Pengaturan layar beserta kuncinya; kunci hanya untuk panel pengurus. */
export type DisplayRecord = DisplayConfig & { accessKey: string };

export const defaultDisplay = (id: DisplayId): DisplayConfig => ({
  id,
  name: `TV ${id}`,
  cameraMode: "replace",
  sound: true,
  override: { type: null, until: null },
});

function toRecord(r: Row): DisplayRecord {
  return {
    id: r.id as DisplayId,
    name: r.name || `TV ${r.id}`,
    cameraMode: r.camera_mode,
    sound: r.sound,
    override: { type: r.override_type, until: r.override_until === null ? null : Number(r.override_until) },
    accessKey: r.access_key,
  };
}

export function publicDisplay(r: DisplayRecord): DisplayConfig {
  return { id: r.id, name: r.name, cameraMode: r.cameraMode, sound: r.sound, override: r.override };
}

export async function listDisplays(): Promise<DisplayRecord[]> {
  const rows = await query<Row>("SELECT * FROM displays WHERE id = ANY($1) ORDER BY id", [[...DISPLAY_IDS]]);
  return rows.map(toRecord);
}

export async function getDisplay(id: DisplayId): Promise<DisplayRecord | null> {
  const rows = await query<Row>("SELECT * FROM displays WHERE id = $1", [id]);
  return rows[0] ? toRecord(rows[0]) : null;
}

export async function updateDisplay(
  id: DisplayId,
  patch: { name?: string; cameraMode?: CameraMode; sound?: boolean },
): Promise<void> {
  const columns: [string, unknown][] = [];
  if (patch.name !== undefined) columns.push(["name", patch.name]);
  if (patch.cameraMode !== undefined) columns.push(["camera_mode", patch.cameraMode]);
  if (patch.sound !== undefined) columns.push(["sound", patch.sound]);
  if (!columns.length) return;
  await query(
    `UPDATE displays SET ${columns.map(([c], i) => `${c} = $${i + 1}`).join(", ")} WHERE id = $${columns.length + 1}`,
    [...columns.map(([, v]) => v), id],
  );
}

/** Kunci baru: layar yang masih memakai tautan lama tidak lagi menerima siaran kamera. */
export async function rotateDisplayKey(id: DisplayId): Promise<string> {
  const key = newAccessKey();
  await query("UPDATE displays SET access_key = $1 WHERE id = $2", [key, id]);
  return key;
}

export async function setDisplayOverride(ids: readonly DisplayId[], override: DisplayOverride): Promise<void> {
  await query("UPDATE displays SET override_type = $1, override_until = $2 WHERE id = ANY($3)", [
    override.type,
    override.until,
    [...ids],
  ]);
}
