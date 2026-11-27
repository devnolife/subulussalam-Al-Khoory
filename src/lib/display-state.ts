import { listResource } from "./resources";
import { getSettings } from "./settings";
import { getTodayTomorrow } from "./prayer/service";
import { applyCorrections } from "./prayer/schedule";
import { getWeather } from "./weather";
import { contentVersion } from "./realtime";
import { getFinanceSummary } from "./finance";
import { witaDateStr } from "./time";
import type {
  Announcement,
  BoardMember,
  DisplayState,
  Ied,
  Jumat,
  Kajian,
  PlaylistItem,
  Slide,
  Speaker,
  SpeakerCard,
  Tarawih,
  Verse,
} from "./types";

/** Ayat/hadits berganti harian, deterministik berdasarkan tanggal. */
function verseOfDay(verses: Verse[], today: string): Verse | null {
  if (!verses.length) return null;
  const dayNumber = Math.floor(Date.parse(today) / 86_400_000);
  return verses[dayNumber % verses.length];
}

/** Data pembicara bila terhubung (nama terbaru + foto), atau nama yang diketik manual. */
function speakerCard(speakers: Map<number, Speaker>, id: number | null, fallback: string): SpeakerCard | null {
  const s = id !== null ? speakers.get(id) : undefined;
  if (s) return { name: s.name, profile: s.profile, photo: s.photo || null };
  return fallback ? { name: fallback, profile: "", photo: null } : null;
}

export async function getDisplayState(): Promise<DisplayState> {
  const now = Date.now();
  const today = witaDateStr(now);
  const settings = await getSettings();
  const [playlist, announcements, kajian, jumat, verses, slides, finance, prayerRaw, weather, speakerList, board, tarawih, ied] =
    await Promise.all([
      listResource<PlaylistItem>("playlist"),
      listResource<Announcement>("announcements", `WHERE active AND (ends_at IS NULL OR ends_at >= '${today}'::date)`),
      listResource<Kajian>("kajian", `WHERE active AND (recurrence <> 'once' OR date IS NULL OR date >= '${today}'::date)`),
      listResource<Jumat>("jumat", `WHERE date >= '${today}'::date`),
      listResource<Verse>("verses", "WHERE active"),
      listResource<Slide>("slides", "WHERE active"),
      getFinanceSummary(today),
      getTodayTomorrow(today, settings.location.kemenagCityId, settings.location.lat, settings.location.lng),
      getWeather(settings.location.lat, settings.location.lng),
      listResource<Speaker>("speakers"),
      listResource<BoardMember>("board_members", "WHERE active"),
      listResource<Tarawih>("tarawih", `WHERE date >= '${today}'::date`),
      listResource<Ied>("ied", `WHERE date >= '${today}'::date`),
    ]);
  const speakers = new Map(speakerList.map((s) => [s.id, s]));
  const c = settings.prayer.corrections;
  return {
    settings,
    playlist,
    announcements,
    kajian: kajian.map((k) => ({ ...k, presenter: speakerCard(speakers, k.speakerId, k.speaker) })),
    jumat: jumat.slice(0, 4).map((j) => ({ ...j, khatibCard: speakerCard(speakers, j.khatibSpeakerId, j.khatib) })),
    board,
    tarawih: tarawih.slice(0, 10).map((t) => ({ ...t, presenter: speakerCard(speakers, t.speakerId, t.speaker) })),
    ied,
    finance,
    verse: verseOfDay(verses, today),
    slides,
    prayer: { today: applyCorrections(prayerRaw.today, c), tomorrow: applyCorrections(prayerRaw.tomorrow, c) },
    weather,
    serverTime: now,
    version: contentVersion(),
  };
}
