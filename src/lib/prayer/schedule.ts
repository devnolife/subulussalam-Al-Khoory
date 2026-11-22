import { FARDH_KEYS, PRAYER_KEYS, type DayTimes, type FardhKey, type PrayerConfig, type PrayerKey } from "../types";
import { shiftHHMM, witaParts, witaToMs } from "../time";

export function applyCorrections(day: DayTimes, corrections: Partial<Record<PrayerKey, number>>): DayTimes {
  const times = { ...day.times };
  for (const k of PRAYER_KEYS) {
    const c = corrections[k] ?? 0;
    if (c) times[k] = shiftHHMM(times[k], c);
  }
  return { ...day, times };
}

export type NextPrayer = { key: PrayerKey; at: number; tomorrow: boolean };

/** Waktu berikutnya (termasuk Imsak & Terbit) setelah `now`. */
export function nextPrayer(now: number, today: DayTimes, tomorrow: DayTimes): NextPrayer {
  for (const key of PRAYER_KEYS) {
    const at = witaToMs(today.date, today.times[key]);
    if (at > now) return { key, at, tomorrow: false };
  }
  return { key: "imsak", at: witaToMs(tomorrow.date, tomorrow.times.imsak), tomorrow: true };
}

/** Awal rentang menuju waktu berikutnya; sebelum Imsak dipakai perkiraan Isya kemarin. */
export function previousPrayerAt(now: number, today: DayTimes): number {
  let last = witaToMs(today.date, today.times.isya) - 86_400_000;
  for (const key of PRAYER_KEYS) {
    const at = witaToMs(today.date, today.times[key]);
    if (at <= now) last = at;
  }
  return last;
}

/** Waktu yang sedang berlangsung (untuk highlight), atau null sebelum Subuh. */
export function currentPrayer(now: number, today: DayTimes): PrayerKey | null {
  let current: PrayerKey | null = null;
  for (const key of PRAYER_KEYS) {
    if (key === "imsak") continue;
    if (witaToMs(today.date, today.times[key]) <= now) current = key;
  }
  return current;
}

export type PrayerPhase =
  | { kind: "normal" }
  | { kind: "adzan"; prayer: FardhKey; isJumat: boolean; endsAt: number }
  | { kind: "iqamah"; prayer: FardhKey; startsAt: number; endsAt: number }
  | { kind: "shalat"; prayer: FardhKey; isJumat: boolean; endsAt: number };

function phaseFor(now: number, prayer: FardhKey, start: number, cfg: PrayerConfig, isJumat: boolean): PrayerPhase | null {
  const adzanEnd = start + cfg.adzanSec * 1000;
  if (now < start) return null;
  if (now < adzanEnd) return { kind: "adzan", prayer, isJumat, endsAt: adzanEnd };
  if (isJumat) {
    const end = start + cfg.jumatMin * 60_000;
    return now < end ? { kind: "shalat", prayer, isJumat, endsAt: end } : null;
  }
  const iqamahAt = Math.max(adzanEnd, start + cfg.iqamahMin[prayer] * 60_000);
  if (now < iqamahAt) return { kind: "iqamah", prayer, startsAt: adzanEnd, endsAt: iqamahAt };
  const end = iqamahAt + cfg.shalatMin[prayer] * 60_000;
  return now < end ? { kind: "shalat", prayer, isJumat, endsAt: end } : null;
}

/**
 * Fase layar sholat: Adzan → hitung mundur Iqamah → layar shaf/sholat.
 * Hari Jum'at, Dzuhur diganti alur Jum'at (adzan → khutbah & sholat).
 */
export function prayerPhase(
  now: number,
  today: DayTimes,
  cfg: PrayerConfig,
  manual?: { prayer: FardhKey | null; startedAt: number | null },
): PrayerPhase {
  if (manual?.prayer && manual.startedAt) {
    const p = phaseFor(now, manual.prayer, manual.startedAt, cfg, false);
    if (p) return p;
  }
  const isFriday = witaParts(now).weekday === 5;
  for (const prayer of FARDH_KEYS) {
    const start = witaToMs(today.date, today.times[prayer]);
    const p = phaseFor(now, prayer, start, cfg, isFriday && prayer === "dzuhur");
    if (p) return p;
  }
  return { kind: "normal" };
}
