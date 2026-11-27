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

export const MODULE_TYPES = [
  "kabah",
  "slides",
  "kajian",
  "jumat",
  "kas",
  "ayat",
  "qris",
  "pengumuman",
  "haribesar",
  "donatur",
  "pengurus",
  "ramadhan",
] as const;
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
  donatur: "Donatur & ZISWAF",
  pengurus: "Pengurus Masjid",
  ramadhan: "Ramadhan & Hari Raya",
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

export type Speaker = {
  id: number;
  name: string;
  /** Profil singkat, mis. "Dosen Fakultas Agama Islam". */
  profile: string;
  photo: string;
  active: boolean;
  sort: number;
};

/** Pemateri siap tampil: dari daftar pembicara bila terhubung, atau nama yang diketik manual. */
export type SpeakerCard = { name: string; profile: string; photo: string | null };

/** weekly = rutin tiap pekan, once = sekali pada tanggal tertentu, text = jadwal teks bebas (data lama). */
export const KAJIAN_RECURRENCES = ["weekly", "once", "text"] as const;
export type KajianRecurrence = (typeof KAJIAN_RECURRENCES)[number];

export type Kajian = {
  id: number;
  title: string;
  /** Nama pemateri; bila `speakerId` terisi, berisi salinan nama dari daftar pembicara. */
  speaker: string;
  speakerId: number | null;
  recurrence: KajianRecurrence;
  /** 0 = Ahad … 6 = Sabtu (untuk kajian rutin). */
  dayOfWeek: number | null;
  /** Tanggal kajian sekali ("YYYY-MM-DD"). */
  date: string | null;
  /** "HH:MM" WITA, boleh kosong. */
  startTime: string;
  endTime: string;
  /** Jadwal teks bebas (kajian lama). */
  schedule: string;
  /** Keterangan waktu, mis. "Ba'da Maghrib". */
  time: string;
  location: string;
  banner: string;
  active: boolean;
  sort: number;
};

export type Jumat = {
  id: number;
  date: string;
  khatib: string;
  khatibSpeakerId: number | null;
  imam: string;
  muadzin: string;
  theme: string;
};

export type BoardMember = {
  id: number;
  name: string;
  position: string;
  photo: string;
  active: boolean;
  sort: number;
};

/** Petugas tarawih pada malam tanggal `date` (malam sebelum hari puasa berikutnya). */
export type Tarawih = {
  id: number;
  date: string;
  imam: string;
  speaker: string;
  speakerId: number | null;
  theme: string;
};

export const IED_KINDS = ["fitri", "adha"] as const;
export type IedKind = (typeof IED_KINDS)[number];
export const IED_LABELS: Record<IedKind, string> = { fitri: "Idul Fitri", adha: "Idul Adha" };

export type Ied = {
  id: number;
  kind: IedKind;
  date: string;
  /** "HH:MM" WITA. */
  time: string;
  location: string;
  khatib: string;
  imam: string;
  note: string;
};

export const ZISWAF_KINDS = ["zakat", "infaq", "sedekah", "wakaf"] as const;
export type ZiswafKind = (typeof ZISWAF_KINDS)[number];
export const ZISWAF_LABELS: Record<ZiswafKind, string> = {
  zakat: "Zakat",
  infaq: "Infaq",
  sedekah: "Sedekah",
  wakaf: "Wakaf",
};

export type FinanceCategory = {
  id: number;
  name: string;
  kind: "in" | "out";
  ziswaf: ZiswafKind | null;
  active: boolean;
  sort: number;
};

export type FinanceEntry = {
  id: number;
  date: string;
  kind: "in" | "out";
  amount: number;
  description: string;
  categoryId: number | null;
  /** Nama donatur (opsional, hanya pemasukan). */
  donor: string;
  /** false = tampil sebagai "Hamba Allah" di layar. */
  showDonor: boolean;
  /** Kunci baris hasil impor CSV/Excel; null untuk transaksi yang dicatat manual. */
  externalRef?: string | null;
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

/** Transaksi untuk layar publik: tanpa nama donatur. */
export type FinanceRecent = {
  id: number;
  date: string;
  kind: "in" | "out";
  amount: number;
  description: string;
  category: string | null;
};

export type FinanceSummary = {
  balance: number;
  monthIn: number;
  monthOut: number;
  monthLabel: string;
  year: number;
  recent: FinanceRecent[];
  /** Total per kategori bulan ini, terbesar dulu. */
  categories: { name: string; kind: "in" | "out"; amount: number }[];
  /** Donatur terbaru (60 hari terakhir); nama yang tidak boleh tampil sudah diganti "Hamba Allah". */
  donors: { id: number; date: string; name: string; amount: number; category: string | null }[];
  /** Jumlah donatur berbeda (menurut nama yang dicatat) pada pemasukan bulan ini. */
  monthDonors: number;
  /** Penerimaan (pemasukan) dan penyaluran (pengeluaran) per jenis ZISWAF. */
  ziswaf: { kind: ZiswafKind; monthIn: number; monthOut: number; yearIn: number; yearOut: number }[];
};

export type Weather = { temperature: number; code: number; label: string; updatedAt: number } | null;

/** Kartu ringkasan di beranda panel; bagian tanpa izin tidak dikirim. */
export type AdminSummary = {
  finance?: Pick<FinanceSummary, "balance" | "monthIn" | "monthOut" | "monthLabel" | "monthDonors">;
  content?: {
    announcements: number;
    kajian: number;
    slides: number;
    nextJumat: { date: string; khatib: string } | null;
  };
};

export type DisplayKajian = Kajian & { presenter: SpeakerCard | null };
export type DisplayJumat = Jumat & { khatibCard: SpeakerCard | null };
export type DisplayTarawih = Tarawih & { presenter: SpeakerCard | null };

export type DisplayState = {
  demo?: {
    phase: "normal" | "adzan" | "doa" | "iqamah" | "shalat" | "emergency";
    /** Waktu simulasi untuk modul musiman (Ramadhan) agar contoh tetap bisa dilihat di luar musimnya. */
    seasonNow?: number;
  };
  settings: Omit<Settings, never>;
  playlist: PlaylistItem[];
  announcements: Announcement[];
  /** Kajian aktif; kajian sekali yang tanggalnya sudah lewat tidak dikirim. */
  kajian: DisplayKajian[];
  jumat: DisplayJumat[];
  board: BoardMember[];
  /** Petugas tarawih mulai malam ini. */
  tarawih: DisplayTarawih[];
  /** Sholat Ied mulai hari ini. */
  ied: Ied[];
  finance: FinanceSummary;
  verse: Verse | null;
  slides: Slide[];
  prayer: { today: DayTimes; tomorrow: DayTimes };
  weather: Weather;
  serverTime: number;
  version: number;
};
