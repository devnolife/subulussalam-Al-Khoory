import { listResource } from "./resources";
import { getSettings } from "./settings";
import { getTodayTomorrow } from "./prayer/service";
import { applyCorrections } from "./prayer/schedule";
import { getWeather } from "./weather";
import { contentVersion } from "./realtime";
import { getFinanceSummary } from "./finance";
import { witaDateStr } from "./time";
import type { Announcement, DisplayState, Jumat, Kajian, PlaylistItem, Slide, Verse } from "./types";

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
    getFinanceSummary(today),
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
