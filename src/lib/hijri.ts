import { WITA_OFFSET_MS } from "./time";

const HIJRI_MONTHS = [
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

/** Tanggal Hijriah (Umm al-Qura) untuk hari WITA dari `ms`, dengan koreksi hari. */
export function hijriParts(ms: number, offsetDays = 0) {
  const wita = new Date(ms + WITA_OFFSET_MS);
  const dayUtc = Date.UTC(wita.getUTCFullYear(), wita.getUTCMonth(), wita.getUTCDate()) + offsetDays * 86_400_000;
  const parts = formatter.formatToParts(new Date(dayUtc));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value.replace(/\D/g, ""));
  return { day: get("day"), month: get("month"), year: get("year") };
}

export function formatHijri(ms: number, offsetDays = 0): string {
  const h = hijriParts(ms, offsetDays);
  return `${h.day} ${HIJRI_MONTHS[h.month - 1]} ${h.year} H`;
}
