import { addDays, monthLabel, shortMonthLabel } from "./time";
import { ZISWAF_KINDS, type FinanceSummary, type ZiswafKind } from "./types";

export const DONOR_WINDOW_DAYS = 60;
export const HIDDEN_DONOR = "Hamba Allah";
const UNCATEGORIZED = "Tanpa kategori";

export type MonthTotals = { month: string; short: string; label: string; in: number; out: number };

/** "YYYY-MM" sebanyak `count` bulan terakhir, berakhir di bulan `today`, urut dari yang terlama. */
function lastMonths(today: string, count: number): string[] {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7)) - 1;
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(year, month - (count - 1 - i), 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

/** Tanggal pertama yang dibutuhkan monthlySeries (awal bulan terlama). */
export function monthlySeriesStart(today: string, count = 6): string {
  return `${lastMonths(today, count)[0]}-01`;
}

/** Pemasukan & pengeluaran per bulan untuk grafik; bulan tanpa transaksi tetap muncul bernilai 0. */
export function monthlySeries(
  rows: { month: string; kind: "in" | "out"; total: number }[],
  today: string,
  count = 6,
): MonthTotals[] {
  const series = new Map(
    lastMonths(today, count).map((month) => [month, { month, short: shortMonthLabel(month), label: monthLabel(month), in: 0, out: 0 }]),
  );
  for (const r of rows) {
    const entry = series.get(r.month);
    if (entry) entry[r.kind] += r.total;
  }
  return [...series.values()];
}

export type FinanceRow = {
  id: number;
  date: string;
  kind: "in" | "out";
  amount: number;
  donor: string;
  showDonor: boolean;
  category: string | null;
  ziswaf: ZiswafKind | null;
};

/** Tanggal paling awal yang dibutuhkan summarizeFinance: awal tahun atau jendela donatur, mana yang lebih dulu. */
export function financeWindowStart(today: string): string {
  const yearStart = `${today.slice(0, 4)}-01-01`;
  const donorStart = addDays(today, -DONOR_WINDOW_DAYS);
  return donorStart < yearStart ? donorStart : yearStart;
}

/**
 * Rincian bulan ini, ZISWAF bulan/tahun ini, dan donatur terbaru dari transaksi sejak financeWindowStart(today).
 * ZISWAF mengikuti jenis transaksi: pemasukan = penerimaan, pengeluaran = penyaluran.
 */
export function summarizeFinance(
  rows: FinanceRow[],
  today: string,
): Pick<FinanceSummary, "monthIn" | "monthOut" | "categories" | "donors" | "monthDonors" | "ziswaf" | "year"> {
  const month = today.slice(0, 7);
  const year = today.slice(0, 4);
  const donorFrom = addDays(today, -DONOR_WINDOW_DAYS);
  let monthIn = 0;
  let monthOut = 0;
  const categories = new Map<string, { name: string; kind: "in" | "out"; amount: number }>();
  const monthDonorNames = new Set<string>();
  const ziswaf = new Map(ZISWAF_KINDS.map((kind) => [kind, { kind, monthIn: 0, monthOut: 0, yearIn: 0, yearOut: 0 }]));
  const donors: FinanceSummary["donors"] = [];

  for (const r of rows) {
    const inMonth = r.date.startsWith(month);
    const isIn = r.kind === "in";
    const donor = r.donor.trim();
    if (inMonth) {
      if (isIn) monthIn += r.amount;
      else monthOut += r.amount;
      const name = r.category ?? UNCATEGORIZED;
      const key = `${r.kind}:${name}`;
      const entry = categories.get(key) ?? { name, kind: r.kind, amount: 0 };
      entry.amount += r.amount;
      categories.set(key, entry);
      if (isIn && donor) monthDonorNames.add(donor.toLowerCase());
    }
    const z = r.ziswaf && r.date.startsWith(year) ? ziswaf.get(r.ziswaf) : undefined;
    if (z) {
      if (isIn) {
        z.yearIn += r.amount;
        if (inMonth) z.monthIn += r.amount;
      } else {
        z.yearOut += r.amount;
        if (inMonth) z.monthOut += r.amount;
      }
    }
    if (isIn && donor && r.date >= donorFrom && r.date <= today) {
      donors.push({ id: r.id, date: r.date, name: r.showDonor ? donor : HIDDEN_DONOR, amount: r.amount, category: r.category });
    }
  }

  const sortedCategories = [...categories.values()].sort((a, b) => b.amount - a.amount);
  return {
    monthIn,
    monthOut,
    year: Number(year),
    // Rincian hanya berguna bila ada transaksi berkategori.
    categories: sortedCategories.some((c) => c.name !== UNCATEGORIZED) ? sortedCategories : [],
    donors: donors.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id).slice(0, 8),
    monthDonors: monthDonorNames.size,
    ziswaf: [...ziswaf.values()],
  };
}
