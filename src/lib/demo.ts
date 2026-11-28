import { DEFAULT_SETTINGS } from "./settings";
import { defaultDisplay } from "./displays";
import { computeOfflineTimes } from "./prayer/offline";
import { hijriCalendar, hijriParts } from "./hijri";
import { upcomingIslamicDays } from "./islamic-days";
import { addDays, witaDateStr, witaParts, witaToMs } from "./time";
import { MODULE_TYPES, type DisplayState, type DisplayTarawih, type ModuleType, type SpeakerCard } from "./types";

const PHASES = ["normal", "adzan", "doa", "iqamah", "shalat", "emergency"] as const;
type DemoPhase = (typeof PHASES)[number];
const PHASE_ELAPSED_MS: Partial<Record<DemoPhase, number>> = {
  adzan: 30_000,
  doa: DEFAULT_SETTINGS.prayer.adzanSec * 1000 + 20_000,
  iqamah: 5 * 60_000,
  shalat: 11 * 60_000,
};

const PRESENTER: SpeakerCard = { name: "Ustaz Ahmad (contoh)", profile: "Pengajar tafsir · data contoh", photo: "/demo-avatar.svg" };
const GUEST: SpeakerCard = { name: "Ustaz Yusuf (contoh)", profile: "", photo: null };

/**
 * Modul Ramadhan hanya muncul di musimnya. Di luar Ramadhan, demo memakai waktu simulasi:
 * hari ke-12 Ramadhan berikutnya pukul 15.00 WITA (sebelum berbuka, Idul Fitri < 30 hari lagi).
 */
function demoSeason(now: number): { seasonNow?: number; date: string; iedDate: string | null } {
  const calendar = hijriCalendar(DEFAULT_SETTINGS);
  const inRamadhan = hijriParts(now, calendar).month === 9;
  const start = inRamadhan ? null : upcomingIslamicDays(now, calendar, 9).find((d) => d.key === "ramadhan")?.date;
  const seasonNow = start ? witaToMs(addDays(start, 11), "15:00") : undefined;
  const at = seasonNow ?? now;
  const iedDate = upcomingIslamicDays(at, calendar, 9).find((d) => d.key === "idul-fitri")?.date ?? null;
  return { seasonNow, date: witaDateStr(at), iedDate };
}

/** Data contoh sepenuhnya terpisah dari database dan bukan informasi masjid sebenarnya. */
export function createDemoState(now: number, module: string | null, phase: string | null): DisplayState {
  const today = witaDateStr(now);
  const day = witaParts(now).weekday;
  const friday = addDays(today, (5 - day + 7) % 7);
  const selected: ModuleType = MODULE_TYPES.find((item) => item === module) ?? "kajian";
  const selectedPhase: DemoPhase = PHASES.find((item) => item === phase) ?? "normal";
  const settings = structuredClone(DEFAULT_SETTINGS);
  const display = { ...defaultDisplay(1), override: { type: selected, until: null } };
  settings.qris.note = "Contoh tampilan donasi — bukan QRIS atau rekening asli";
  settings.qris.image = "/demo-qris.svg";
  settings.emergency = { active: selectedPhase === "emergency", text: "SIMULASI: Pengumuman darurat dari pengurus masjid." };

  const elapsed = PHASE_ELAPSED_MS[selectedPhase];
  if (elapsed !== undefined) {
    settings.manualPrayer = { prayer: "dzuhur", startedAt: now - elapsed };
  }
  const season = demoSeason(now);
  const tarawih = (offset: number, imam: string, presenter: SpeakerCard | null, theme: string, id: number): DisplayTarawih => ({
    id,
    date: addDays(season.date, offset),
    imam,
    speaker: presenter?.name ?? "",
    speakerId: null,
    theme,
    presenter,
  });
  const kajianBase = { speakerId: null, location: "Ruang utama masjid", active: true, endTime: "", banner: "" };

  return {
    demo: { phase: selectedPhase, seasonNow: season.seasonNow },
    settings,
    display,
    camera: null,
    playlist: MODULE_TYPES.map((type, index) => ({
      id: index + 1, type, durationSec: 20, sort: index, enabled: true, pinned: false,
    })),
    announcements: [
      { id: 1, title: "Informasi contoh", body: "Kajian hari ini setelah Maghrib. Data ini hanya untuk simulasi.", showTicker: true, showPanel: true, active: true, endsAt: null, sort: 0 },
      { id: 2, title: "Kegiatan contoh", body: "Silakan menjaga kebersihan dan kerapian masjid.", showTicker: true, showPanel: true, active: true, endsAt: null, sort: 1 },
    ],
    kajian: [
      {
        ...kajianBase, id: 1, title: "Kajian Akhlak dan Kehidupan Kampus", speaker: PRESENTER.name, presenter: PRESENTER,
        recurrence: "weekly", dayOfWeek: day, date: null, startTime: "18:45", schedule: "", time: "Ba'da Maghrib", sort: 0,
      },
      {
        ...kajianBase, id: 2, title: "Tabligh Akbar: Menyambut Bulan Mulia", speaker: GUEST.name, presenter: GUEST,
        recurrence: "once", dayOfWeek: null, date: addDays(today, 1), startTime: "08:00", endTime: "10:00", schedule: "", time: "", sort: 1,
      },
      {
        ...kajianBase, id: 3, title: "Tahsin Al-Qur'an untuk Pemula", speaker: "Pengurus masjid (contoh)",
        presenter: { name: "Pengurus masjid (contoh)", profile: "", photo: null },
        recurrence: "text", dayOfWeek: null, date: null, startTime: "", schedule: "Setiap Ahad pagi", time: "Ba'da Subuh", sort: 2,
      },
    ],
    jumat: [
      {
        id: 1, date: friday, khatib: PRESENTER.name, khatibSpeakerId: null, khatibCard: PRESENTER,
        imam: "Ustaz Hasan (contoh)", muadzin: "Pengurus (contoh)", theme: "Menjaga amanah",
      },
      {
        id: 2, date: addDays(friday, 7), khatib: GUEST.name, khatibSpeakerId: null, khatibCard: GUEST,
        imam: "Ustaz Hasan (contoh)", muadzin: "Pengurus (contoh)", theme: "",
      },
    ],
    board: [
      { id: 1, name: "H. Abdul Karim (contoh)", position: "Ketua", photo: "/demo-avatar.svg", active: true, sort: 0 },
      { id: 2, name: "Muhammad Rizal (contoh)", position: "Sekretaris", photo: "", active: true, sort: 1 },
      { id: 3, name: "Siti Aminah (contoh)", position: "Bendahara", photo: "", active: true, sort: 2 },
      { id: 4, name: "Ahmad Fauzi (contoh)", position: "Seksi Peribadatan", photo: "/demo-avatar.svg", active: true, sort: 3 },
      { id: 5, name: "Nurul Huda (contoh)", position: "Seksi Pendidikan", photo: "", active: true, sort: 4 },
      { id: 6, name: "Hasanuddin (contoh)", position: "Seksi Pemeliharaan", photo: "", active: true, sort: 5 },
    ],
    tarawih: [
      tarawih(0, "Ustaz Hasan (contoh)", PRESENTER, "Keutamaan sepuluh malam terakhir", 1),
      tarawih(1, "Ustaz Abdullah (contoh)", GUEST, "Zakat fitrah dan hikmahnya", 2),
      tarawih(2, "Ustaz Hasan (contoh)", null, "", 3),
      tarawih(3, "Ustaz Abdullah (contoh)", PRESENTER, "Menjaga amalan setelah Ramadhan", 4),
    ],
    ied: season.iedDate
      ? [{
          id: 1, kind: "fitri", date: season.iedDate, time: "07:00", location: "Lapangan depan masjid (contoh)",
          khatib: "Ustaz Abdullah (contoh)", imam: "Ustaz Hasan (contoh)", note: "Data contoh. Jamaah dianjurkan membawa sajadah.",
        }]
      : [],
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
