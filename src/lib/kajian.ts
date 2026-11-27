import { addDays, formatDateStr, witaDateStr, witaParts } from "./time";
import type { Kajian } from "./types";

export const WEEKDAYS = ["Ahad", "Senin", "Selasa", "Rabu", "Kamis", "Jum'at", "Sabtu"];

const pad = (n: number) => String(n).padStart(2, "0");

export function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

type Schedulable = Pick<Kajian, "recurrence" | "dayOfWeek" | "date" | "startTime" | "endTime" | "schedule" | "time" | "sort" | "id">;

export type ArrangedKajian<T> = T & {
  /** Tanggal pertemuan berikutnya; null untuk jadwal teks bebas. */
  nextDate: string | null;
  /** "Hari ini" / "Besok", atau null. */
  relative: string | null;
};

/** Hari/tanggal kajian tanpa memperhitungkan hari ini, mis. "Setiap Kamis" atau "Sabtu, 29 November 2025". */
export function kajianScheduleLabel(k: Pick<Kajian, "recurrence" | "dayOfWeek" | "date" | "schedule">): string {
  if (k.recurrence === "weekly" && k.dayOfWeek !== null) return `Setiap ${WEEKDAYS[k.dayOfWeek]}`;
  if (k.recurrence === "once" && k.date) return `${WEEKDAYS[weekdayOf(k.date)]}, ${formatDateStr(k.date)}`;
  return k.schedule;
}

/** Jam dan keterangan waktu, mis. "16:00–17:30 · Ba'da Ashar". */
export function kajianTimeLabel(k: Pick<Kajian, "recurrence" | "startTime" | "endTime" | "time">): string {
  const range = k.recurrence === "text" ? "" : k.startTime && k.endTime ? `${k.startTime}–${k.endTime}` : k.startTime;
  return [range, k.time].filter(Boolean).join(" · ");
}

/**
 * Kajian yang masih akan berlangsung, terurut untuk layar:
 * kajian bertanggal terdekat dulu (hari ini paling depan), lalu jadwal teks bebas sesuai urutan.
 * Kajian rutin yang jam selesainya sudah lewat pindah ke pekan berikutnya; kajian sekali yang sudah selesai disembunyikan.
 */
export function arrangeKajian<T extends Schedulable>(list: T[], now: number): ArrangedKajian<T>[] {
  const today = witaDateStr(now);
  const p = witaParts(now);
  const clock = `${pad(p.hour)}:${pad(p.minute)}`;
  const tomorrow = addDays(today, 1);
  const out: ArrangedKajian<T>[] = [];
  for (const k of list) {
    let nextDate: string | null = null;
    if (k.recurrence === "once" && k.date) {
      if (k.date < today || (k.date === today && k.endTime && clock >= k.endTime)) continue;
      nextDate = k.date;
    } else if (k.recurrence === "weekly" && k.dayOfWeek !== null) {
      let diff = (k.dayOfWeek - p.weekday + 7) % 7;
      if (diff === 0 && k.endTime && clock >= k.endTime) diff = 7;
      nextDate = addDays(today, diff);
    }
    const relative = nextDate === today ? "Hari ini" : nextDate === tomorrow ? "Besok" : null;
    out.push({ ...k, nextDate, relative });
  }
  return out.sort((a, b) => {
    if (a.nextDate && b.nextDate) {
      return a.nextDate.localeCompare(b.nextDate) || (a.startTime || "99").localeCompare(b.startTime || "99") || a.sort - b.sort || a.id - b.id;
    }
    if (a.nextDate || b.nextDate) return a.nextDate ? -1 : 1;
    return a.sort - b.sort || a.id - b.id;
  });
}
