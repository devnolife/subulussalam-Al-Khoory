import { kajianScheduleLabel, kajianTimeLabel } from "./kajian";
import {
  ZISWAF_LABELS,
  type BoardMember,
  type FinanceCategory,
  type FinanceEntry,
  type Jumat,
  type Kajian,
  type Tarawih,
} from "./types";

/** Data yang bisa diunduh sebagai CSV; nilai = awalan nama file. */
export const EXPORTS = {
  finance: "kas",
  jumat: "petugas-jumat",
  tarawih: "petugas-tarawih",
  kajian: "kajian",
  board_members: "pengurus",
} as const;

export type ExportName = keyof typeof EXPORTS;
export const isExportable = (n: string): n is ExportName => n in EXPORTS;

/** Ekspor yang bisa dibatasi rentang tanggal (`from`/`to`); lainnya selalu berisi semua data. */
export const DATED_EXPORTS: readonly ExportName[] = ["finance", "jumat", "tarawih"];

export type Range = { from?: string; to?: string };
export type Table = { headers: string[]; rows: unknown[][] };

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Validasi "YYYY-MM-DD" yang benar-benar ada di kalender. */
export function isDateStr(s: string): boolean {
  const m = DATE_RE.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

const inRange = (date: string, { from, to }: Range) => (!from || date >= from) && (!to || date <= to);

/** Mis. "kas_2026-11-01_2026-11-30.csv", "kas_mulai-2026-11-01.csv", atau "pengurus_2026-11-27.csv" (tanggal unduh). */
export function exportFilename(name: ExportName, { from, to }: Range, today: string): string {
  const parts = from && to ? [from, to] : from ? [`mulai-${from}`] : to ? [`sampai-${to}`] : [today];
  return `${[EXPORTS[name], ...parts].join("_")}.csv`;
}

/** Buku kas berurutan tanggal dengan saldo berjalan; baris saldo awal bila `from` diisi, baris total di akhir. */
export function financeTable(entries: FinanceEntry[], categories: FinanceCategory[], range: Range): Table {
  const cats = new Map(categories.map((c) => [c.id, c]));
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
  const signed = (e: FinanceEntry) => (e.kind === "in" ? e.amount : -e.amount);
  const opening = range.from ? sorted.filter((e) => e.date < range.from!).reduce((s, e) => s + signed(e), 0) : 0;
  const headers = ["Tanggal", "Jenis", "Kategori", "ZISWAF", "Keterangan", "Donatur", "Nama tampil di layar", "Pemasukan", "Pengeluaran", "Saldo"];
  const rows: unknown[][] = [];
  if (range.from) rows.push([range.from, "Saldo awal", "", "", "", "", "", "", "", opening]);
  let balance = opening;
  let totalIn = 0;
  let totalOut = 0;
  for (const e of sorted.filter((x) => inRange(x.date, range))) {
    balance += signed(e);
    if (e.kind === "in") totalIn += e.amount;
    else totalOut += e.amount;
    const cat = e.categoryId !== null ? cats.get(e.categoryId) : undefined;
    const hasDonor = e.kind === "in" && e.donor.trim() !== "";
    rows.push([
      e.date,
      e.kind === "in" ? "Pemasukan" : "Pengeluaran",
      cat?.name ?? "",
      cat?.ziswaf ? ZISWAF_LABELS[cat.ziswaf] : "",
      e.description,
      hasDonor ? e.donor : "",
      hasDonor ? e.showDonor : "",
      e.kind === "in" ? e.amount : "",
      e.kind === "out" ? e.amount : "",
      balance,
    ]);
  }
  rows.push(["", "Total", "", "", "", "", "", totalIn, totalOut, balance]);
  return { headers, rows };
}

export function jumatTable(list: Jumat[], range: Range): Table {
  return {
    headers: ["Tanggal", "Khatib", "Imam", "Muadzin", "Tema khutbah"],
    rows: list
      .filter((j) => inRange(j.date, range))
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((j) => [j.date, j.khatib, j.imam, j.muadzin, j.theme]),
  };
}

export function tarawihTable(list: Tarawih[], range: Range): Table {
  return {
    headers: ["Malam (tanggal)", "Imam", "Penceramah", "Tema"],
    rows: list
      .filter((t) => inRange(t.date, range))
      .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)
      .map((t) => [t.date, t.imam, t.speaker, t.theme]),
  };
}

export function kajianTable(list: Kajian[]): Table {
  return {
    headers: ["Judul", "Pemateri", "Jadwal", "Waktu", "Lokasi", "Aktif"],
    rows: list.map((k) => [k.title, k.speaker, kajianScheduleLabel(k), kajianTimeLabel(k), k.location, k.active]),
  };
}

export function boardTable(list: BoardMember[]): Table {
  return {
    headers: ["Nama", "Jabatan", "Aktif"],
    rows: list.map((m) => [m.name, m.position, m.active]),
  };
}
