import { Pool, type QueryResultRow } from "pg";
import bcrypt from "bcryptjs";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value JSONB NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, expires_at TIMESTAMPTZ NOT NULL);
CREATE TABLE IF NOT EXISTS playlist_items (
  id SERIAL PRIMARY KEY, type TEXT UNIQUE NOT NULL, duration_sec INT NOT NULL DEFAULT 20,
  sort INT NOT NULL DEFAULT 0, enabled BOOLEAN NOT NULL DEFAULT TRUE, pinned BOOLEAN NOT NULL DEFAULT FALSE);
CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY, title TEXT NOT NULL DEFAULT '', body TEXT NOT NULL,
  show_ticker BOOLEAN NOT NULL DEFAULT TRUE, show_panel BOOLEAN NOT NULL DEFAULT TRUE,
  active BOOLEAN NOT NULL DEFAULT TRUE, ends_at DATE, sort INT NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS kajian (
  id SERIAL PRIMARY KEY, title TEXT NOT NULL, speaker TEXT NOT NULL DEFAULT '', schedule TEXT NOT NULL DEFAULT '',
  time TEXT NOT NULL DEFAULT '', location TEXT NOT NULL DEFAULT '', active BOOLEAN NOT NULL DEFAULT TRUE, sort INT NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS jumat (
  id SERIAL PRIMARY KEY, date DATE NOT NULL, khatib TEXT NOT NULL DEFAULT '', imam TEXT NOT NULL DEFAULT '',
  muadzin TEXT NOT NULL DEFAULT '', theme TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS finance (
  id SERIAL PRIMARY KEY, date DATE NOT NULL, kind TEXT NOT NULL CHECK (kind IN ('in','out')),
  amount BIGINT NOT NULL, description TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS verses (
  id SERIAL PRIMARY KEY, arabic TEXT NOT NULL, translation TEXT NOT NULL, source TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT TRUE);
CREATE TABLE IF NOT EXISTS slides (
  id SERIAL PRIMARY KEY, image TEXT NOT NULL, caption TEXT NOT NULL DEFAULT '', active BOOLEAN NOT NULL DEFAULT TRUE,
  sort INT NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS prayer_cache (date DATE PRIMARY KEY, times JSONB NOT NULL, fetched_at TIMESTAMPTZ NOT NULL DEFAULT now());
`;

const SEED_PLAYLIST: [string, number][] = [
  ["kabah", 60],
  ["slides", 10],
  ["kajian", 15],
  ["jumat", 15],
  ["ayat", 20],
  ["kas", 15],
  ["qris", 15],
  ["pengumuman", 15],
];

const SEED_VERSES: [string, string, string][] = [
  [
    "إِنَّمَا يَعْمُرُ مَسَاجِدَ اللَّهِ مَنْ آمَنَ بِاللَّهِ وَالْيَوْمِ الْآخِرِ",
    "Hanyalah yang memakmurkan masjid-masjid Allah ialah orang-orang yang beriman kepada Allah dan hari kemudian.",
    "QS. At-Taubah: 18",
  ],
  [
    "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا ۝ إِنَّ مَعَ الْعُسْرِ يُسْرًا",
    "Maka sesungguhnya bersama kesulitan ada kemudahan. Sesungguhnya bersama kesulitan ada kemudahan.",
    "QS. Al-Insyirah: 5–6",
  ],
  [
    "وَأَقِيمُوا الصَّلَاةَ وَآتُوا الزَّكَاةَ وَارْكَعُوا مَعَ الرَّاكِعِينَ",
    "Dan dirikanlah shalat, tunaikanlah zakat, dan rukuklah beserta orang-orang yang rukuk.",
    "QS. Al-Baqarah: 43",
  ],
  [
    "طَلَبُ الْعِلْمِ فَرِيضَةٌ عَلَى كُلِّ مُسْلِمٍ",
    "Menuntut ilmu itu wajib atas setiap muslim.",
    "HR. Ibnu Majah",
  ],
  [
    "خَيْرُ النَّاسِ أَنْفَعُهُمْ لِلنَّاسِ",
    "Sebaik-baik manusia adalah yang paling bermanfaat bagi manusia lainnya.",
    "HR. Ahmad & Ath-Thabrani",
  ],
];

type G = typeof globalThis & { __pgPool?: Pool; __schemaReady?: Promise<void> };
const g = globalThis as G;

function pool(): Pool {
  if (!g.__pgPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL belum diatur (lihat .env.example)");
    g.__pgPool = new Pool({ connectionString, max: 10 });
  }
  return g.__pgPool;
}

async function init(): Promise<void> {
  const p = pool();
  await p.query(SCHEMA);
  for (const [i, [type, dur]] of SEED_PLAYLIST.entries()) {
    await p.query(
      "INSERT INTO playlist_items (type, duration_sec, sort) VALUES ($1,$2,$3) ON CONFLICT (type) DO NOTHING",
      [type, dur, i],
    );
  }
  const { rows } = await p.query("SELECT count(*)::int AS n FROM verses");
  if (rows[0].n === 0) {
    for (const [arabic, translation, source] of SEED_VERSES) {
      await p.query("INSERT INTO verses (arabic, translation, source) VALUES ($1,$2,$3)", [arabic, translation, source]);
    }
  }
  const existingPin = await p.query("SELECT 1 FROM settings WHERE key = 'pinHash'");
  if (!existingPin.rowCount) {
    const pin = process.env.ADMIN_INITIAL_PIN;
    if (!pin || pin.trim().length < 6 || pin.length > 64) {
      throw new Error("ADMIN_INITIAL_PIN wajib diatur (6–64 karakter) saat inisialisasi database");
    }
    await p.query("INSERT INTO settings (key, value) VALUES ('pinHash', $1) ON CONFLICT (key) DO NOTHING", [
      JSON.stringify(await bcrypt.hash(pin.trim(), 10)),
    ]);
  }
}

/** Skema dibuat otomatis (idempotent) pada akses pertama. */
export function ready(): Promise<void> {
  if (!g.__schemaReady) {
    g.__schemaReady = init().catch((e) => {
      g.__schemaReady = undefined;
      throw e;
    });
  }
  return g.__schemaReady;
}

export async function query<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
  await ready();
  const res = await pool().query<T>(sql, params);
  return res.rows;
}
