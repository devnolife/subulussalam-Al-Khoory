import { WITA_OFFSET_MS } from "./time";
import type { HijriMonthStart } from "./types";

export const HIJRI_MONTHS = [
  "Muharram",
  "Safar",
  "Rabiul Awal",
  "Rabiul Akhir",
  "Jumadil Awal",
  "Jumadil Akhir",
  "Rajab",
  "Sya'ban",
  "Ramadhan",
  "Syawal",
  "Dzulqa'dah",
  "Dzulhijjah",
];

const formatter = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
  timeZone: "UTC",
  day: "numeric",
  month: "numeric",
  year: "numeric",
});

export type HijriDate = { day: number; month: number; year: number };

/** Koreksi hari untuk seluruh kalender + awal bulan yang ditetapkan (mis. Ramadhan, Syawal, Dzulhijjah). */
export type HijriCalendar = { offset: number; months?: HijriMonthStart[] };

const DAY_MS = 86_400_000;

function dayStartUtc(ms: number): number {
  const wita = new Date(ms + WITA_OFFSET_MS);
  return Date.UTC(wita.getUTCFullYear(), wita.getUTCMonth(), wita.getUTCDate());
}

function dateStrToUtc(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function ummAlQura(dayUtc: number): HijriDate {
  const parts = formatter.formatToParts(new Date(dayUtc));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value.replace(/\D/g, ""));
  return { day: get("day"), month: get("month"), year: get("year") };
}

/** Penetapan awal bulan berlaku sehari sebelumnya (akhir bulan lalu) hingga sekitar satu tahun Hijriah. */
const LEAD_DAYS = 1;
const SPAN_DAYS = 354;
const MAX_SHIFT_DAYS = 5;
const shiftCache = new Map<string, number | null>();

/** Geseran hari agar Umm al-Qura jatuh pada 1 bulan yang ditetapkan, atau null bila terlalu jauh/tidak valid. */
export function hijriStartShift(month: HijriMonthStart): number | null {
  const start = dateStrToUtc(month.start);
  return Number.isNaN(start) ? null : shiftFor(month, start);
}

function shiftFor(month: HijriMonthStart, start: number): number | null {
  const key = `${month.year}-${month.month}-${month.start}`;
  const cached = shiftCache.get(key);
  if (cached !== undefined) return cached;
  let found: number | null = null;
  for (let k = 0; k <= MAX_SHIFT_DAYS && found === null; k++) {
    for (const shift of k ? [k, -k] : [0]) {
      const h = ummAlQura(start + shift * DAY_MS);
      if (h.day === 1 && h.month === month.month && h.year === month.year) {
        found = shift;
        break;
      }
    }
  }
  shiftCache.set(key, found);
  return found;
}

/**
 * Tanggal Hijriah untuk hari WITA dari `ms`.
 * Bila pengurus mengisi awal bulan (mis. sesuai maklumat Muhammadiyah), kalender Umm al-Qura digeser
 * agar tanggal itu menjadi hari ke-1, dan geseran tersebut berlaku sampai penetapan berikutnya
 * (paling lama ±1 tahun). Tanpa penetapan, dipakai Umm al-Qura + koreksi hari.
 */
export function hijriParts(ms: number, calendar: number | HijriCalendar = 0): HijriDate {
  const cal = typeof calendar === "number" ? { offset: calendar } : calendar;
  const day = dayStartUtc(ms);
  let best: { start: number; shift: number } | null = null;
  for (const m of cal.months ?? []) {
    const start = dateStrToUtc(m.start);
    if (Number.isNaN(start) || day < start - LEAD_DAYS * DAY_MS || day >= start + SPAN_DAYS * DAY_MS) continue;
    if (best && start <= best.start) continue;
    const shift = shiftFor(m, start);
    if (shift !== null) best = { start, shift };
  }
  return ummAlQura(day + (best ? best.shift : cal.offset) * DAY_MS);
}

export function formatHijri(ms: number, calendar: number | HijriCalendar = 0): string {
  const h = hijriParts(ms, calendar);
  return `${h.day} ${HIJRI_MONTHS[h.month - 1]} ${h.year} H`;
}

export function hijriCalendar(settings: { hijriOffset: number; hijriMonths?: HijriMonthStart[] }): HijriCalendar {
  return { offset: settings.hijriOffset, months: settings.hijriMonths ?? [] };
}
