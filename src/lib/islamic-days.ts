import { hijriParts, type HijriCalendar, type HijriDate } from "./hijri";
import { witaDateStr } from "./time";

export type IslamicDay = { key: string; month: number; day: number; name: string; note: string };

/** Hari besar Islam yang ditampilkan di layar, berdasarkan tanggal Hijriah. */
export const ISLAMIC_DAYS: IslamicDay[] = [
  { key: "tahun-baru", month: 1, day: 1, name: "Tahun Baru Hijriah", note: "1 Muharram" },
  { key: "maulid", month: 3, day: 12, name: "Maulid Nabi Muhammad ﷺ", note: "12 Rabiul Awal" },
  { key: "isra-miraj", month: 7, day: 27, name: "Isra Mi'raj", note: "27 Rajab" },
  { key: "nisfu-syaban", month: 8, day: 15, name: "Nisfu Sya'ban", note: "15 Sya'ban" },
  { key: "ramadhan", month: 9, day: 1, name: "Awal Ramadhan", note: "1 Ramadhan" },
  { key: "nuzulul-quran", month: 9, day: 17, name: "Nuzulul Qur'an", note: "17 Ramadhan" },
  { key: "idul-fitri", month: 10, day: 1, name: "Idul Fitri", note: "1 Syawal" },
  { key: "arafah", month: 12, day: 9, name: "Hari Arafah", note: "9 Dzulhijjah" },
  { key: "idul-adha", month: 12, day: 10, name: "Idul Adha", note: "10 Dzulhijjah" },
];

export type UpcomingIslamicDay = IslamicDay & { date: string; daysLeft: number; hijri: HijriDate };

const DAY_MS = 86_400_000;

/** Hari besar terdekat mulai hari ini (WITA), terurut menurut tanggal; tiap acara sekali. */
export function upcomingIslamicDays(now: number, calendar: number | HijriCalendar, count = 4, horizonDays = 400): UpcomingIslamicDay[] {
  const found: UpcomingIslamicDay[] = [];
  const seen = new Set<string>();
  for (let d = 0; d <= horizonDays && found.length < count; d++) {
    const ms = now + d * DAY_MS;
    const hijri = hijriParts(ms, calendar);
    for (const event of ISLAMIC_DAYS) {
      if (seen.has(event.key) || event.month !== hijri.month || event.day !== hijri.day) continue;
      seen.add(event.key);
      found.push({ ...event, date: witaDateStr(ms), daysLeft: d, hijri });
    }
  }
  return found.slice(0, count);
}
