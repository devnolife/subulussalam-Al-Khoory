export const PRAYER_KEYS = ["imsak", "subuh", "terbit", "dzuhur", "ashar", "maghrib", "isya"] as const;
export type PrayerKey = (typeof PRAYER_KEYS)[number];
export const FARDH_KEYS = ["subuh", "dzuhur", "ashar", "maghrib", "isya"] as const;
export type FardhKey = (typeof FARDH_KEYS)[number];

export const PRAYER_LABELS: Record<PrayerKey, string> = {
  imsak: "Imsak",
  subuh: "Subuh",
  terbit: "Terbit",
  dzuhur: "Dzuhur",
  ashar: "Ashar",
  maghrib: "Maghrib",
  isya: "Isya",
};

/** "HH:MM" per waktu, dalam zona WITA. */
export type PrayerTimes = Record<PrayerKey, string>;
export type DayTimes = { date: string; times: PrayerTimes; source: "kemenag" | "offline" };

export const MODULE_TYPES = ["kabah", "slides", "kajian", "jumat", "kas", "ayat", "qris", "pengumuman", "haribesar"] as const;
export type ModuleType = (typeof MODULE_TYPES)[number];
export const MODULE_LABELS: Record<ModuleType, string> = {
  kabah: "Live Ka'bah",
  slides: "Slide Poster",
  kajian: "Jadwal Kajian",
  jumat: "Imam & Khatib Jumat",
  kas: "Laporan Kas",
  ayat: "Ayat / Hadits",
  qris: "QRIS Donasi",
  pengumuman: "Pengumuman",
  haribesar: "Hari Besar Islam",
};

export type PlaylistItem = {
  id: number;
  type: ModuleType;
  durationSec: number;
  sort: number;
  enabled: boolean;
  pinned: boolean;
};

export type Announcement = {
  id: number;
  title: string;
  body: string;
  showTicker: boolean;
  showPanel: boolean;
  active: boolean;
  endsAt: string | null;
  sort: number;
};

export type Kajian = {
  id: number;
  title: string;
  speaker: string;
  schedule: string;
  time: string;
  location: string;
  active: boolean;
  sort: number;
};

export type Jumat = {
  id: number;
  date: string;
  khatib: string;
  imam: string;
  muadzin: string;
  theme: string;
};

export type FinanceEntry = {
  id: number;
  date: string;
  kind: "in" | "out";
  amount: number;
  description: string;
};

export type Verse = {
  id: number;
  arabic: string;
  translation: string;
  source: string;
  active: boolean;
};

export type Slide = {
  id: number;
  image: string;
  caption: string;
  active: boolean;
  sort: number;
};

export type PrayerConfig = {
  corrections: Record<PrayerKey, number>;
  iqamahMin: Record<FardhKey, number>;
  shalatMin: Record<FardhKey, number>;
  adzanSec: number;
  /** Lama layar doa setelah adzan; 0 = tanpa layar doa. Tidak dipakai saat Jum'at. */
  doaSec: number;
  jumatMin: number;
};

export type HijriMonthStart = { year: number; month: number; start: string };

export type Settings = {
  mosque: { name: string; subtitle: string; address: string; logo: string | null };
  location: { lat: number; lng: number; kemenagCityId: string; cityName: string };
  prayer: PrayerConfig;
  hijriOffset: number;
  /** Tanggal Masehi awal bulan Hijriah sesuai penetapan (mis. Muhammadiyah); menimpa perhitungan Umm al-Qura. */
  hijriMonths: HijriMonthStart[];
  kabah: { youtubeUrl: string; backupUrl: string; sound: boolean };
  qris: { image: string | null; bankName: string; accountNo: string; accountName: string; note: string };
  emergency: { active: boolean; text: string };
  override: { type: ModuleType | null; until: number | null };
  manualPrayer: { prayer: FardhKey | null; startedAt: number | null };
};

export type FinanceSummary = {
  balance: number;
  monthIn: number;
  monthOut: number;
  monthLabel: string;
  recent: FinanceEntry[];
};

export type Weather = { temperature: number; code: number; label: string; updatedAt: number } | null;

export type DisplayState = {
  demo?: { phase: "normal" | "adzan" | "doa" | "iqamah" | "shalat" | "emergency" };
  settings: Omit<Settings, never>;
  playlist: PlaylistItem[];
  announcements: Announcement[];
  kajian: Kajian[];
  jumat: Jumat[];
  finance: FinanceSummary;
  verse: Verse | null;
  slides: Slide[];
  prayer: { today: DayTimes; tomorrow: DayTimes };
  weather: Weather;
  serverTime: number;
  version: number;
};
