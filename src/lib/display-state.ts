import { query } from "./db";
import { listResource } from "./resources";
import { getSettings } from "./settings";
import { getTodayTomorrow } from "./prayer/service";
import { applyCorrections } from "./prayer/schedule";
import { getWeather } from "./weather";
import { contentVersion } from "./realtime";
import { monthLabel, witaDateStr } from "./time";
import type {
  Announcement,
  DisplayState,
  FinanceEntry,
  FinanceSummary,
  Jumat,
  Kajian,
  PlaylistItem,
  Slide,
  Verse,
} from "./types";

async function financeSummary(today: string): Promise<FinanceSummary> {
  const month = today.slice(0, 7);
  const [totals] = await query<{ balance: string; month_in: string; month_out: string }>(
    `SELECT
       COALESCE(SUM(CASE WHEN kind='in' THEN amount ELSE -amount END),0) AS balance,
       COALESCE(SUM(amount) FILTER (WHERE kind='in' AND to_char(date,'YYYY-MM')=$1),0) AS month_in,
       COALESCE(SUM(amount) FILTER (WHERE kind='out' AND to_char(date,'YYYY-MM')=$1),0) AS month_out
     FROM finance`,
    [month],
  );
  const recent = (await listResource<FinanceEntry>("finance")).slice(0, 6);
  return {
    balance: Number(totals.balance),
    monthIn: Number(totals.month_in),
    monthOut: Number(totals.month_out),
    monthLabel: monthLabel(today),
    recent,
  };
}

/** Ayat/hadits berganti harian, deterministik berdasarkan tanggal. */
function verseOfDay(verses: Verse[], today: string): Verse | null {
  if (!verses.length) return null;
  const dayNumber = Math.floor(Date.parse(today) / 86_400_000);
  return verses[dayNumber % verses.length];
}

export async function getDisplayState(): Promise<DisplayState> {
  const now = Date.now();
  const today = witaDateStr(now);
  const settings = await getSettings();
  const [playlist, announcements, kajian, jumat, verses, slides, finance, prayerRaw, weather] = await Promise.all([
    listResource<PlaylistItem>("playlist"),
    listResource<Announcement>("announcements", `WHERE active AND (ends_at IS NULL OR ends_at >= '${today}'::date)`),
    listResource<Kajian>("kajian", "WHERE active"),
    listResource<Jumat>("jumat", `WHERE date >= '${today}'::date`),
    listResource<Verse>("verses", "WHERE active"),
    listResource<Slide>("slides", "WHERE active"),
    financeSummary(today),
    getTodayTomorrow(today, settings.location.kemenagCityId, settings.location.lat, settings.location.lng),
    getWeather(settings.location.lat, settings.location.lng),
  ]);
  const c = settings.prayer.corrections;
  return {
    settings,
    playlist,
    announcements,
    kajian,
    jumat: jumat.slice(0, 4),
    finance,
    verse: verseOfDay(verses, today),
    slides,
    prayer: { today: applyCorrections(prayerRaw.today, c), tomorrow: applyCorrections(prayerRaw.tomorrow, c) },
    weather,
    serverTime: now,
    version: contentVersion(),
  };
}
