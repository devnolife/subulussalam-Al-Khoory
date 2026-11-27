import { hijriParts, type HijriCalendar } from "./hijri";
import { addDays, witaDateStr, witaParts, witaToMs } from "./time";
import type { DayTimes, Ied, Tarawih } from "./types";

/** Info sholat Ied mulai tampil sekian hari sebelumnya. */
export const IED_LEAD_DAYS = 30;

const pad = (n: number) => String(n).padStart(2, "0");
const noon = (date: string) => witaToMs(date, "12:00");
const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);

/** Malam ke-berapa Ramadhan untuk tarawih pada malam tanggal `date` (malam termasuk hari Hijriah berikutnya). */
export function ramadhanNight(date: string, calendar: number | HijriCalendar): number | null {
  const h = hijriParts(noon(addDays(date, 1)), calendar);
  return h.month === 9 ? h.day : null;
}

export type FastingDay = { when: "today" | "tomorrow"; date: string; day: number; imsak: string; maghrib: string };
export type NightTarawih<T extends Tarawih> = T & { night: number | null };

export type RamadhanView<T extends Tarawih> = {
  /** Tahun Hijriah bila sedang/menjelang Ramadhan. */
  ramadhanYear: number | null;
  /** Hari puasa yang relevan: hari ini sampai Maghrib, setelah itu besok (termasuk malam 1 Ramadhan). */
  fasting: FastingDay | null;
  tonight: NightTarawih<T> | null;
  upcoming: NightTarawih<T>[];
  ied: (Ied & { daysLeft: number }) | null;
};

/**
 * Isi modul Ramadhan & hari raya pada waktu `now`, atau null di luar musimnya.
 * Musim: hari ini/besok bulan Ramadhan, ada petugas tarawih malam ini, atau sholat Ied ≤30 hari lagi.
 */
export function ramadhanView<T extends Tarawih>(
  now: number,
  calendar: number | HijriCalendar,
  prayer: { today: DayTimes; tomorrow: DayTimes },
  tarawih: T[],
  ied: Ied[],
): RamadhanView<T> | null {
  const today = witaDateStr(now);
  const tomorrow = addDays(today, 1);
  const hToday = hijriParts(noon(today), calendar);
  const hTomorrow = hijriParts(noon(tomorrow), calendar);
  const p = witaParts(now);
  const clock = `${pad(p.hour)}:${pad(p.minute)}`;
  const timesFor = (date: string) =>
    (prayer.today.date === date ? prayer.today : prayer.tomorrow.date === date ? prayer.tomorrow : prayer.today).times;

  let fasting: FastingDay | null = null;
  const todayTimes = timesFor(today);
  if (hToday.month === 9 && clock < todayTimes.maghrib) {
    fasting = { when: "today", date: today, day: hToday.day, imsak: todayTimes.imsak, maghrib: todayTimes.maghrib };
  } else if (hTomorrow.month === 9) {
    const t = timesFor(tomorrow);
    fasting = { when: "tomorrow", date: tomorrow, day: hTomorrow.day, imsak: t.imsak, maghrib: t.maghrib };
  }

  const withNight = (t: T): NightTarawih<T> => ({ ...t, night: ramadhanNight(t.date, calendar) });
  const nights = tarawih.filter((t) => t.date >= today).sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
  const tonightRaw = nights.find((t) => t.date === today);
  const inSeason = hToday.month === 9 || hTomorrow.month === 9 || !!tonightRaw;

  const nextIed = ied
    .filter((e) => e.date >= today && daysBetween(today, e.date) <= IED_LEAD_DAYS)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)[0];

  if (!inSeason && !nextIed) return null;
  return {
    ramadhanYear: hToday.month === 9 ? hToday.year : hTomorrow.month === 9 ? hTomorrow.year : null,
    fasting,
    tonight: tonightRaw ? withNight(tonightRaw) : null,
    upcoming: inSeason ? nights.filter((t) => t.date > today).slice(0, 3).map(withNight) : [],
    ied: nextIed ? { ...nextIed, daysLeft: daysBetween(today, nextIed.date) } : null,
  };
}
