import { NextResponse } from "next/server";
import { authorize, handleError } from "@/lib/api";
import { query } from "@/lib/db";
import { getFinanceSummary } from "@/lib/finance";
import { can } from "@/lib/permissions";
import { witaDateStr } from "@/lib/time";
import type { AdminSummary } from "@/lib/types";

/** Kartu ringkasan beranda; tiap bagian hanya dikirim bila peran pengguna boleh melihatnya. */
export async function GET() {
  const user = await authorize(null);
  if (user instanceof NextResponse) return user;
  try {
    const today = witaDateStr(Date.now());
    const summary: AdminSummary = {};
    const tasks: Promise<void>[] = [];
    if (can(user.role, "finance")) {
      tasks.push(
        getFinanceSummary(today).then((f) => {
          summary.finance = {
            balance: f.balance,
            monthIn: f.monthIn,
            monthOut: f.monthOut,
            monthLabel: f.monthLabel,
            monthDonors: f.monthDonors,
          };
        }),
      );
    }
    if (can(user.role, "content")) {
      tasks.push(
        Promise.all([
          query<{ announcements: number; kajian: number; slides: number }>(
            `SELECT
               (SELECT count(*)::int FROM announcements WHERE active AND (ends_at IS NULL OR ends_at >= $1::date)) AS announcements,
               (SELECT count(*)::int FROM kajian WHERE active) AS kajian,
               (SELECT count(*)::int FROM slides WHERE active) AS slides`,
            [today],
          ),
          query<{ date: string; khatib: string }>(
            "SELECT to_char(date,'YYYY-MM-DD') AS date, khatib FROM jumat WHERE date >= $1::date ORDER BY date LIMIT 1",
            [today],
          ),
        ]).then(([[counts], [jumat]]) => {
          summary.content = { ...counts, nextJumat: jumat ?? null };
        }),
      );
    }
    await Promise.all(tasks);
    return NextResponse.json(summary);
  } catch (e) {
    return handleError(e);
  }
}
