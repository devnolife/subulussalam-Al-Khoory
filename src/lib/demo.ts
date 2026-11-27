import { DEFAULT_SETTINGS } from "./settings";
import { computeOfflineTimes } from "./prayer/offline";
import { addDays, witaDateStr, witaParts } from "./time";
import { MODULE_TYPES, type DisplayState, type ModuleType } from "./types";

const PHASES = ["normal", "adzan", "doa", "iqamah", "shalat", "emergency"] as const;
type DemoPhase = (typeof PHASES)[number];
const PHASE_ELAPSED_MS: Partial<Record<DemoPhase, number>> = {
  adzan: 30_000,
  doa: DEFAULT_SETTINGS.prayer.adzanSec * 1000 + 20_000,
  iqamah: 5 * 60_000,
  shalat: 11 * 60_000,
};

/** Data contoh sepenuhnya terpisah dari database dan bukan informasi masjid sebenarnya. */
export function createDemoState(now: number, module: string | null, phase: string | null): DisplayState {
  const today = witaDateStr(now);
  const day = witaParts(now).weekday;
  const friday = addDays(today, (5 - day + 7) % 7);
  const selected: ModuleType = MODULE_TYPES.find((item) => item === module) ?? "kajian";
  const selectedPhase: DemoPhase = PHASES.find((item) => item === phase) ?? "normal";
  const settings = structuredClone(DEFAULT_SETTINGS);
  settings.override = { type: selected, until: null };
  settings.qris.note = "Contoh tampilan donasi — bukan QRIS atau rekening asli";
  settings.qris.image = "/demo-qris.svg";
  settings.emergency = { active: selectedPhase === "emergency", text: "SIMULASI: Pengumuman darurat dari pengurus masjid." };

  const elapsed = PHASE_ELAPSED_MS[selectedPhase];
  if (elapsed !== undefined) {
    settings.manualPrayer = { prayer: "dzuhur", startedAt: now - elapsed };
  }

  return {
    demo: { phase: selectedPhase },
    settings,
    playlist: MODULE_TYPES.map((type, index) => ({
      id: index + 1, type, durationSec: 20, sort: index, enabled: true, pinned: false,
    })),
    announcements: [
      { id: 1, title: "Informasi contoh", body: "Kajian hari ini setelah Maghrib. Data ini hanya untuk simulasi.", showTicker: true, showPanel: true, active: true, endsAt: null, sort: 0 },
      { id: 2, title: "Kegiatan contoh", body: "Silakan menjaga kebersihan dan kerapian masjid.", showTicker: true, showPanel: true, active: true, endsAt: null, sort: 1 },
    ],
    kajian: [
      { id: 1, title: "Kajian Akhlak dan Kehidupan Kampus", speaker: "Ustaz Ahmad (contoh)", schedule: "Hari ini", time: "Ba'da Maghrib", location: "Ruang utama masjid", active: true, sort: 0 },
      { id: 2, title: "Tadarus Bersama", speaker: "Pengurus masjid (contoh)", schedule: "Hari ini", time: "Ba'da Isya", location: "Ruang utama masjid", active: true, sort: 1 },
    ],
    jumat: [{ id: 1, date: friday, khatib: "Ustaz Abdullah (contoh)", imam: "Ustaz Hasan (contoh)", muadzin: "Pengurus (contoh)", theme: "Menjaga amanah" }],
    finance: {
      balance: 12500000, monthIn: 5000000, monthOut: 2000000,
      monthLabel: "Contoh bulan ini",
      recent: [
        { id: 1, date: today, kind: "in", amount: 1000000, description: "Infaq (contoh)" },
        { id: 2, date: today, kind: "out", amount: 500000, description: "Kebersihan (contoh)" },
      ],
    },
    verse: { id: 1, arabic: "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا", translation: "Maka sesungguhnya bersama kesulitan ada kemudahan.", source: "QS. Al-Insyirah: 5", active: true },
    slides: [{ id: 1, image: "/demo-poster.svg", caption: "Poster kegiatan contoh", active: true, sort: 0 }],
    prayer: {
      today: computeOfflineTimes(today, settings.location.lat, settings.location.lng),
      tomorrow: computeOfflineTimes(addDays(today, 1), settings.location.lat, settings.location.lng),
    },
    weather: { temperature: 29, code: 2, label: "Contoh cuaca", updatedAt: now },
    serverTime: now,
    version: 1,
  };
}
