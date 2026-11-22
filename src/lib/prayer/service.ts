import { query } from "../db";
import { addDays } from "../time";
import type { DayTimes, PrayerTimes } from "../types";
import { computeOfflineTimes } from "./offline";

type MyQuranDay = PrayerTimes & { date: string };

const KEYS = ["imsak", "subuh", "terbit", "dzuhur", "ashar", "maghrib", "isya"] as const;

/** Ambil jadwal sebulan dari API Kemenag (myQuran) lalu simpan ke cache DB. */
async function fetchMonth(cityId: string, year: number, month: number): Promise<MyQuranDay[]> {
  const url = `https://api.myquran.com/v2/sholat/jadwal/${cityId}/${year}/${String(month).padStart(2, "0")}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000), cache: "no-store" });
  if (!res.ok) throw new Error(`myQuran ${res.status}`);
  const json = await res.json();
  const rows: MyQuranDay[] = (json?.data?.jadwal ?? []).filter((r: Record<string, string>) =>
    KEYS.every((k) => /^\d{2}:\d{2}$/.test(r[k] ?? "")),
  );
  if (!rows.length) throw new Error("myQuran: data kosong");
  for (const r of rows) {
    const times = Object.fromEntries(KEYS.map((k) => [k, r[k]]));
    await query(
      `INSERT INTO prayer_cache (date, times) VALUES ($1, $2)
       ON CONFLICT (date) DO UPDATE SET times = EXCLUDED.times, fetched_at = now()`,
      [r.date, JSON.stringify(times)],
    );
  }
  return rows;
}

const g = globalThis as typeof globalThis & { __prayerFetchFail?: number };

/**
 * Jadwal untuk satu tanggal: cache DB → API Kemenag → perhitungan offline.
 * Kegagalan API di-throttle 10 menit agar layar tidak tertahan saat offline.
 */
export async function getDayTimes(dateStr: string, cityId: string, lat: number, lng: number): Promise<DayTimes> {
  const cached = await query<{ times: PrayerTimes }>("SELECT times FROM prayer_cache WHERE date = $1", [dateStr]);
  if (cached[0]) return { date: dateStr, times: cached[0].times, source: "kemenag" };

  if (!g.__prayerFetchFail || Date.now() - g.__prayerFetchFail > 10 * 60_000) {
    try {
      const [y, m] = dateStr.split("-").map(Number);
      const rows = await fetchMonth(cityId, y, m);
      const hit = rows.find((r) => r.date === dateStr);
      if (hit) {
        const times = Object.fromEntries(KEYS.map((k) => [k, hit[k]])) as PrayerTimes;
        return { date: dateStr, times, source: "kemenag" };
      }
    } catch (e) {
      g.__prayerFetchFail = Date.now();
      console.warn("[prayer] API Kemenag gagal, memakai perhitungan offline:", (e as Error).message);
    }
  }
  return computeOfflineTimes(dateStr, lat, lng);
}

export async function getTodayTomorrow(today: string, cityId: string, lat: number, lng: number) {
  const [t, tm] = await Promise.all([
    getDayTimes(today, cityId, lat, lng),
    getDayTimes(addDays(today, 1), cityId, lat, lng),
  ]);
  return { today: t, tomorrow: tm };
}

export async function clearPrayerCache(): Promise<void> {
  await query("DELETE FROM prayer_cache");
}
