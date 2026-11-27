import { query } from "./db";
import { financeWindowStart, summarizeFinance } from "./finance-summary";
import { monthLabel } from "./time";
import type { FinanceSummary, ZiswafKind } from "./types";

type Row = {
  id: number;
  date: string;
  kind: "in" | "out";
  amount: string;
  description: string;
  donor: string;
  show_donor: boolean;
  category: string | null;
  ziswaf: ZiswafKind | null;
};

const FROM = "FROM finance f LEFT JOIN finance_categories c ON c.id = f.category_id";

/** Ringkasan kas untuk layar TV dan beranda panel. Tidak memuat nama donatur yang disembunyikan. */
export async function getFinanceSummary(today: string): Promise<FinanceSummary> {
  const [[totals], rows, recent] = await Promise.all([
    query<{ balance: string }>("SELECT COALESCE(SUM(CASE WHEN kind='in' THEN amount ELSE -amount END),0) AS balance FROM finance"),
    query<Row>(
      `SELECT f.id, to_char(f.date,'YYYY-MM-DD') AS date, f.kind, f.amount, f.donor, f.show_donor, c.name AS category, c.ziswaf
       ${FROM} WHERE f.date >= $1::date`,
      [financeWindowStart(today)],
    ),
    query<Row>(
      `SELECT f.id, to_char(f.date,'YYYY-MM-DD') AS date, f.kind, f.amount, f.description, c.name AS category
       ${FROM} ORDER BY f.date DESC, f.id DESC LIMIT 6`,
    ),
  ]);
  const summary = summarizeFinance(
    rows.map((r) => ({
      id: r.id,
      date: r.date,
      kind: r.kind,
      amount: Number(r.amount),
      donor: r.donor,
      showDonor: r.show_donor,
      category: r.category,
      ziswaf: r.ziswaf,
    })),
    today,
  );
  return {
    ...summary,
    balance: Number(totals.balance),
    monthLabel: monthLabel(today),
    recent: recent.map((r) => ({
      id: r.id,
      date: r.date,
      kind: r.kind,
      amount: Number(r.amount),
      description: r.description,
      category: r.category,
    })),
  };
}
