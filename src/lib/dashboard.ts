import { buildAgenda, type AgendaItem } from "./agenda";
import { query } from "./db";
import { getFinanceSummary } from "./finance";
import { monthlySeries, monthlySeriesStart, type MonthTotals } from "./finance-summary";
import { formatHijri, hijriCalendar } from "./hijri";
import { upcomingIslamicDays, type UpcomingIslamicDay } from "./islamic-days";
import { arrangeKajian } from "./kajian";
import { can, type Role } from "./permissions";
import { applyCorrections } from "./prayer/schedule";
import { getTodayTomorrow } from "./prayer/service";
import { listResource } from "./resources";
import { screensOverview, type ScreensOverview } from "./screens";
import { getSettings } from "./settings";
import { formatGregorian, witaDateStr } from "./time";
import type { Announcement, DayTimes, FinanceSummary, Ied, Jumat, Kajian, Settings, Tarawih } from "./types";
import type { AuditEntry } from "./users";

export type DashboardFinance = FinanceSummary & { series: MonthTotals[] };

export type Dashboard = {
  now: number;
  today: string;
  gregorian: string;
  hijri: string;
  mosque: Settings["mosque"];
  city: string;
  emergency: Settings["emergency"];
  /** null bila jadwal belum bisa dimuat. */
  prayer: { today: DayTimes; tomorrow: DayTimes } | null;
  agenda: AgendaItem[];
  islamicDays: UpcomingIslamicDay[];
  /** Pengumuman aktif yang belum berakhir. */
  announcements: Announcement[];
  counts: { announcements: number; kajian: number; slides: number; speakers: number; board: number; verses: number };
  /** Hanya untuk peran yang mengelola kas. */
  finance?: DashboardFinance;
  /** Hanya untuk peran yang memegang remote layar. */
  screens?: ScreensOverview;
  /** Hanya untuk peran yang boleh membaca riwayat aktivitas. */
  activity?: AuditEntry[];
};

async function financeWithSeries(today: string): Promise<DashboardFinance> {
  const [summary, rows] = await Promise.all([
    getFinanceSummary(today),
    query<{ month: string; kind: "in" | "out"; total: string }>(
      "SELECT to_char(date, 'YYYY-MM') AS month, kind, SUM(amount) AS total FROM finance WHERE date >= $1::date GROUP BY 1, 2",
      [monthlySeriesStart(today)],
    ),
  ]);
  return { ...summary, series: monthlySeries(rows.map((r) => ({ ...r, total: Number(r.total) })), today) };
}

async function recentActivity(limit: number): Promise<AuditEntry[]> {
  const rows = await query<Omit<AuditEntry, "id" | "at"> & { id: string; at: Date | string }>(
    `SELECT a.id, a.at, a.username, COALESCE(u.name, '') AS name, a.action, a.target, a.detail
     FROM audit_log a LEFT JOIN users u ON u.id = a.user_id ORDER BY a.id DESC LIMIT ${limit}`,
  );
  return rows.map((r) => ({ ...r, id: Number(r.id), at: new Date(r.at).toISOString() }));
}

/**
 * Ringkasan beranda panel pengurus. Informasi yang juga tampil di layar TV (jadwal sholat, agenda, pengumuman)
 * untuk semua peran; kas, status layar, dan riwayat hanya untuk peran yang berwenang.
 */
export async function getDashboard(role: Role, now = Date.now()): Promise<Dashboard> {
  const today = witaDateStr(now);
  const settings = await getSettings();
  const calendar = hijriCalendar(settings);
  const prayerLoad = getTodayTomorrow(today, settings.location.kemenagCityId, settings.location.lat, settings.location.lng)
    .then(({ today: t, tomorrow }) => {
      const c = settings.prayer.corrections;
      return { today: applyCorrections(t, c), tomorrow: applyCorrections(tomorrow, c) };
    })
    .catch((e: unknown) => {
      console.warn("[dashboard] jadwal sholat gagal dimuat:", (e as Error).message);
      return null;
    });
  const [prayer, announcements, kajian, jumat, tarawih, ied, [counts], finance, screens, activity] = await Promise.all([
    prayerLoad,
    listResource<Announcement>("announcements", `WHERE active AND (ends_at IS NULL OR ends_at >= '${today}'::date)`),
    listResource<Kajian>("kajian", `WHERE active AND (recurrence <> 'once' OR date IS NULL OR date >= '${today}'::date)`),
    listResource<Jumat>("jumat", `WHERE date >= '${today}'::date`),
    listResource<Tarawih>("tarawih", `WHERE date >= '${today}'::date`),
    listResource<Ied>("ied", `WHERE date >= '${today}'::date`),
    query<{ slides: number; speakers: number; verses: number; board: number }>(
      `SELECT (SELECT count(*)::int FROM slides WHERE active) AS slides,
              (SELECT count(*)::int FROM speakers WHERE active) AS speakers,
              (SELECT count(*)::int FROM verses WHERE active) AS verses,
              (SELECT count(*)::int FROM board_members WHERE active) AS board`,
    ),
    can(role, "finance") ? financeWithSeries(today) : undefined,
    can(role, "remote") ? screensOverview() : undefined,
    can(role, "audit") ? recentActivity(6) : undefined,
  ]);
  const arranged = arrangeKajian(kajian, now);
  return {
    now,
    today,
    gregorian: formatGregorian(now),
    hijri: formatHijri(now, calendar),
    mosque: settings.mosque,
    city: settings.location.cityName,
    emergency: settings.emergency,
    prayer,
    agenda: buildAgenda({ jumat, kajian: arranged, ied, tarawih, today }),
    islamicDays: upcomingIslamicDays(now, calendar, 3),
    announcements,
    counts: { ...counts, announcements: announcements.length, kajian: arranged.length },
    finance,
    screens,
    activity,
  };
}
