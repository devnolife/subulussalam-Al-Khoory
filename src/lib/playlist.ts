import type { DisplayState, ModuleType, PlaylistItem } from "./types";
import { youtubeSources } from "./youtube";

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

/** Modul mana yang punya konten untuk ditampilkan. */
export function contentAvailability(state: DisplayState): Record<ModuleType, boolean> {
  const q = state.settings.qris;
  return {
    kabah: youtubeSources([state.settings.kabah.youtubeUrl, state.settings.kabah.backupUrl]).length > 0,
    slides: state.slides.length > 0,
    kajian: state.kajian.length > 0,
    jumat: state.jumat.length > 0,
    kas: state.finance.recent.length > 0,
    ayat: !!state.verse,
    qris: !!(q.image || q.accountNo),
    pengumuman: state.announcements.some((a) => a.showPanel),
  };
}
