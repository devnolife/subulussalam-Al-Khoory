import { arrangeKajian, kajianScheduleLabel, kajianTimeLabel, WEEKDAYS, weekdayOf } from "./kajian";
import type { FinanceLine, FinanceReport } from "./finance-report";
import { addDays, formatDateStr, rupiah, witaDateStr } from "./time";
import { IED_LABELS, type Ied, type Jumat, type Kajian } from "./types";

/*
 * Teks siap kirim ke grup WhatsApp jamaah (format WhatsApp: *tebal*).
 * Nama donatur tidak pernah ikut dibagikan.
 */

type Part = string | false | null | undefined;
const lines = (...xs: Part[]) => xs.filter(Boolean).join("\n");
const paragraphs = (...xs: Part[]) => xs.filter(Boolean).join("\n\n");
const dayDate = (date: string) => `${WEEKDAYS[weekdayOf(date)]}, ${formatDateStr(date)}`;

export function waLink(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** Kajian aktif dalam 7 hari ke depan (termasuk hari ini) plus jadwal teks bebas; null bila kosong. */
export function kajianWeekText(list: Kajian[], now: number, mosque: string): string | null {
  const today = witaDateStr(now);
  const end = addDays(today, 6);
  const arranged = arrangeKajian(
    list.filter((k) => k.active),
    now,
  );
  const dated = arranged.filter((k) => k.nextDate && k.nextDate <= end);
  const free = arranged.filter((k) => !k.nextDate);
  if (!dated.length && !free.length) return null;

  const block = (k: (typeof arranged)[number]) => {
    const day = k.nextDate ? dayDate(k.nextDate) : kajianScheduleLabel(k);
    const when = [day, kajianTimeLabel(k)].filter(Boolean).join(" · ");
    return lines(`📖 *${k.title}*`, when && `🗓 ${when}`, k.speaker && `👤 ${k.speaker}`, k.location && `📍 ${k.location}`);
  };

  return paragraphs(
    lines("*Jadwal Kajian Pekan Ini*", mosque, `${formatDateStr(today)} – ${formatDateStr(end)}`),
    ...dated.map(block),
    free.length > 0 && "*Jadwal lainnya*",
    ...free.map(block),
    "Mari hadir dan ajak keluarga serta sahabat.",
  );
}

/** Petugas Jum'at terdekat mulai hari ini; null bila belum dijadwalkan. */
export function jumatText(list: Jumat[], today: string, mosque: string): string | null {
  const next = list.filter((j) => j.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
  if (!next) return null;
  return paragraphs(
    lines("*Petugas Sholat Jum'at*", mosque, `🗓 ${dayDate(next.date)}`),
    lines(
      next.khatib && `🎙 Khatib: ${next.khatib}`,
      next.imam && `👤 Imam: ${next.imam}`,
      next.muadzin && `📢 Muadzin: ${next.muadzin}`,
      next.theme && `📝 Tema khutbah: ${next.theme}`,
    ),
  );
}

/** Rekap kas per kategori (tanpa nama donatur). */
export function financeReportText(report: FinanceReport, mosque: string): string {
  const list = (items: FinanceLine[], empty: string) =>
    items.length ? items.map((l) => `• ${l.name}: ${rupiah(l.amount)}`).join("\n") : `• ${empty}`;
  return paragraphs(
    lines(`*Laporan Kas · ${report.period.label}*`, mosque),
    `Saldo awal: ${rupiah(report.opening)}`,
    lines(`*Pemasukan: ${rupiah(report.totalIn)}*`, list(report.incomes, "Belum ada pemasukan")),
    lines(`*Pengeluaran: ${rupiah(report.totalOut)}*`, list(report.expenses, "Belum ada pengeluaran")),
    `*Saldo akhir: ${rupiah(report.closing)}*`,
    "Jazakumullahu khairan kepada seluruh donatur.",
  );
}

export function iedText(ied: Ied, mosque: string): string {
  return paragraphs(
    lines(`*Sholat ${IED_LABELS[ied.kind]}*`, mosque),
    lines(
      `🗓 ${dayDate(ied.date)}`,
      ied.time && `🕖 Pukul ${ied.time} WITA`,
      ied.location && `📍 ${ied.location}`,
      ied.khatib && `🎙 Khatib: ${ied.khatib}`,
      ied.imam && `👤 Imam: ${ied.imam}`,
    ),
    ied.note,
  );
}
