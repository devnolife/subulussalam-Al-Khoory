import { addDays, monthLabel } from "./time";
import type { FinanceCategory, FinanceEntry } from "./types";

/** Rentang laporan kas, tanggal inklusif ("YYYY-MM-DD"). */
export type Period = { key: string; from: string; to: string; label: string };

export function monthPeriod(month: string): Period {
  const from = `${month}-01`;
  const [y, m] = month.split("-").map(Number);
  const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  return { key: month, from, to: addDays(nextMonth, -1), label: monthLabel(from) };
}

export function yearPeriod(year: number): Period {
  return { key: String(year), from: `${year}-01-01`, to: `${year}-12-31`, label: `Tahun ${year}` };
}

/** Pilihan periode: bulan berjalan dan bulan yang punya transaksi (terbaru dulu), lalu per tahun. */
export function financePeriods(entries: Pick<FinanceEntry, "date">[], today: string): Period[] {
  const months = new Set([today.slice(0, 7), ...entries.map((e) => e.date.slice(0, 7))]);
  const years = new Set([...months].map((m) => Number(m.slice(0, 4))));
  return [
    ...[...months].sort().reverse().map(monthPeriod),
    ...[...years].sort((a, b) => b - a).map(yearPeriod),
  ];
}

export type FinanceLine = { name: string; amount: number };

export type FinanceReport = {
  period: Period;
  opening: number;
  totalIn: number;
  totalOut: number;
  closing: number;
  incomes: FinanceLine[];
  expenses: FinanceLine[];
};

const OTHER = "Lainnya";

/** Rekap kas per kategori untuk satu periode, dengan saldo awal dari semua transaksi sebelumnya. */
export function financeReport(
  entries: Pick<FinanceEntry, "date" | "kind" | "amount" | "categoryId">[],
  categories: Pick<FinanceCategory, "id" | "name">[],
  period: Period,
): FinanceReport {
  const names = new Map(categories.map((c) => [c.id, c.name]));
  const signed = (e: { kind: string; amount: number }) => (e.kind === "in" ? e.amount : -e.amount);
  const opening = entries.filter((e) => e.date < period.from).reduce((s, e) => s + signed(e), 0);
  const inRange = entries.filter((e) => e.date >= period.from && e.date <= period.to);
  const group = (kind: "in" | "out"): FinanceLine[] => {
    const totals = new Map<string, number>();
    for (const e of inRange.filter((x) => x.kind === kind)) {
      const name = (e.categoryId !== null && names.get(e.categoryId)) || OTHER;
      totals.set(name, (totals.get(name) ?? 0) + e.amount);
    }
    return [...totals]
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => (a.name === OTHER ? 1 : b.name === OTHER ? -1 : b.amount - a.amount || a.name.localeCompare(b.name)));
  };
  const incomes = group("in");
  const expenses = group("out");
  const totalIn = incomes.reduce((s, l) => s + l.amount, 0);
  const totalOut = expenses.reduce((s, l) => s + l.amount, 0);
  return { period, opening, totalIn, totalOut, closing: opening + totalIn - totalOut, incomes, expenses };
}
