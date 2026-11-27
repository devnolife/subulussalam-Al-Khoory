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
      year: witaParts(now).year,
      recent: [
        { id: 1, date: today, kind: "in", amount: 1000000, description: "Infaq Jumat (contoh)", category: "Kotak amal Jumat" },
        { id: 2, date: today, kind: "out", amount: 500000, description: "Kebersihan (contoh)", category: "Kebersihan" },
        { id: 3, date: addDays(today, -2), kind: "in", amount: 750000, description: "", category: "Zakat mal" },
      ],
      categories: [
        { name: "Kotak amal Jumat", kind: "in", amount: 2500000 },
        { name: "Zakat mal", kind: "in", amount: 1500000 },
        { name: "Listrik & air", kind: "out", amount: 1200000 },
        { name: "Kebersihan", kind: "out", amount: 800000 },
      ],
      donors: [
        { id: 3, date: addDays(today, -2), name: "Bapak Fulan (contoh)", amount: 750000, category: "Zakat mal" },
        { id: 4, date: addDays(today, -3), name: "Hamba Allah", amount: 500000, category: "Infaq pembangunan" },
        { id: 5, date: addDays(today, -6), name: "Ibu Fulanah (contoh)", amount: 250000, category: "Sedekah" },
      ],
      monthDonors: 3,
      ziswaf: [
        { kind: "zakat", monthIn: 1500000, monthOut: 1000000, yearIn: 9000000, yearOut: 7500000 },
        { kind: "infaq", monthIn: 3000000, monthOut: 0, yearIn: 21000000, yearOut: 4000000 },
        { kind: "sedekah", monthIn: 250000, monthOut: 0, yearIn: 3100000, yearOut: 1500000 },
        { kind: "wakaf", monthIn: 0, monthOut: 0, yearIn: 5000000, yearOut: 0 },
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
