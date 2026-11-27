import { query } from "./db";
import type { Settings } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  mosque: {
    name: "Masjid Subulussalam Al-Khoory",
    subtitle: "Universitas Muhammadiyah Makassar",
    address: "Jl. Sultan Alauddin No. 259, Makassar",
    logo: null,
  },
  location: { lat: -5.1834, lng: 119.4445, kemenagCityId: "2622", cityName: "Kota Makassar" },
  prayer: {
    corrections: { imsak: 0, subuh: 0, terbit: 0, dzuhur: 0, ashar: 0, maghrib: 0, isya: 0 },
    iqamahMin: { subuh: 10, dzuhur: 10, ashar: 10, maghrib: 7, isya: 10 },
    shalatMin: { subuh: 10, dzuhur: 10, ashar: 10, maghrib: 10, isya: 10 },
    adzanSec: 180,
    doaSec: 60,
    jumatMin: 45,
  },
  hijriOffset: 0,
  hijriMonths: [],
  kabah: {
    youtubeUrl: "https://www.youtube.com/watch?v=l43w1oD0B8g",
    backupUrl: "https://www.youtube.com/watch?v=NGJ2z3cIKHI",
    sound: true,
  },
  qris: { image: null, bankName: "", accountNo: "", accountName: "", note: "Infaq & sedekah untuk kemakmuran masjid" },
  emergency: { active: false, text: "" },
  override: { type: null, until: null },
  manualPrayer: { prayer: null, startedAt: null },
};

export type SettingKey = keyof Settings;
export const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS) as SettingKey[];

function merge<T>(base: T, value: unknown): T {
  if (value && typeof value === "object" && !Array.isArray(value) && base && typeof base === "object") {
    const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    for (const [k, v] of Object.entries(value)) {
      out[k] = k in out ? merge(out[k], v) : v;
    }
    return out as T;
  }
  return (value === undefined ? base : value) as T;
}

export async function getSettings(): Promise<Settings> {
  const rows = await query<{ key: string; value: unknown }>("SELECT key, value FROM settings WHERE key = ANY($1)", [
    SETTING_KEYS,
  ]);
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return merge(DEFAULT_SETTINGS, stored);
}

export async function setSetting<K extends SettingKey>(key: K, value: Settings[K]): Promise<void> {
  await query(
    "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
    [key, JSON.stringify(value)],
  );
}

export async function getRaw<T>(key: string): Promise<T | null> {
  const rows = await query<{ value: T }>("SELECT value FROM settings WHERE key = $1", [key]);
  return rows[0]?.value ?? null;
}

export async function setRaw(key: string, value: unknown): Promise<void> {
  await query(
    "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
    [key, JSON.stringify(value)],
  );
}
