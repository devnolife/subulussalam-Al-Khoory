import type { DisplayState, ModuleType, PlaylistItem } from "./types";
import { youtubeSources } from "./youtube";
import { arrangeKajian } from "./kajian";
import { ramadhanView } from "./ramadhan";
import { hijriCalendar } from "./hijri";

/** Waktu untuk modul musiman: di mode contoh memakai waktu simulasi yang tetap berjalan. */
export function seasonTime(state: DisplayState, now: number): number {
  const simulated = state.demo?.seasonNow;
  return simulated ? simulated + (now - state.serverTime) : now;
}

/** Isi modul Ramadhan & hari raya, atau null di luar musimnya. */
export function ramadhanFor(state: DisplayState, now: number) {
  return ramadhanView(seasonTime(state, now), hijriCalendar(state.settings), state.prayer, state.tarawih, state.ied);
}

/**
 * Item yang boleh tampil di panel utama, terurut.
 * - Override dari admin ("tampilkan sekarang") menang selama belum kedaluwarsa.
 * - Jika ada item yang di-pin, hanya item pin yang berputar (tampil terus-menerus).
 * - Modul tanpa konten dilewati.
 */
export function activeItems(
  items: PlaylistItem[],
  hasContent: Record<ModuleType, boolean>,
  override: { type: ModuleType | null; until: number | null },
  now: number,
): PlaylistItem[] {
  if (override.type && (!override.until || override.until > now)) {
    const item = items.find((i) => i.type === override.type);
    if (item) return [{ ...item, enabled: true }];
  }
  const usable = items
    .filter((i) => i.enabled && hasContent[i.type])
    .sort((a, b) => a.sort - b.sort || a.id - b.id);
  const pinned = usable.filter((i) => i.pinned);
  return pinned.length ? pinned : usable;
}

/** Modul mana yang punya konten untuk ditampilkan pada waktu `now`. */
export function contentAvailability(state: DisplayState, now: number = state.serverTime): Record<ModuleType, boolean> {
  const q = state.settings.qris;
  return {
    kabah: youtubeSources([state.settings.kabah.youtubeUrl, state.settings.kabah.backupUrl]).length > 0,
    slides: state.slides.length > 0,
    kajian: arrangeKajian(state.kajian, now).length > 0,
    jumat: state.jumat.length > 0,
    kas: state.finance.recent.length > 0,
    ayat: !!state.verse,
    qris: !!(q.image || q.accountNo),
    pengumuman: state.announcements.some((a) => a.showPanel),
    // Selalu ada hari besar berikutnya yang bisa dihitung mundur.
    haribesar: true,
    donatur: state.finance.donors.length > 0 || state.finance.ziswaf.some((z) => z.yearIn > 0 || z.yearOut > 0),
    pengurus: state.board.length > 0,
    ramadhan: ramadhanFor(state, now) !== null,
  };
}
