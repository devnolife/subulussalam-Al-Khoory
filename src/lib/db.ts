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
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY, username TEXT NOT NULL UNIQUE, name TEXT NOT NULL DEFAULT '', password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','bendahara','konten','operator')), active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), last_login_at TIMESTAMPTZ);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id) ON DELETE CASCADE;
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY, at TIMESTAMPTZ NOT NULL DEFAULT now(), user_id INT REFERENCES users(id) ON DELETE SET NULL,
  username TEXT NOT NULL DEFAULT '', action TEXT NOT NULL, target TEXT NOT NULL DEFAULT '', detail TEXT NOT NULL DEFAULT '');
CREATE INDEX IF NOT EXISTS audit_log_at_idx ON audit_log (at DESC);
CREATE TABLE IF NOT EXISTS finance_categories (
  id SERIAL PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL CHECK (kind IN ('in','out')),
  ziswaf TEXT CHECK (ziswaf IN ('zakat','infaq','sedekah','wakaf')), active BOOLEAN NOT NULL DEFAULT TRUE,
  sort INT NOT NULL DEFAULT 0);
ALTER TABLE finance ADD COLUMN IF NOT EXISTS category_id INT REFERENCES finance_categories(id) ON DELETE SET NULL;
ALTER TABLE finance ADD COLUMN IF NOT EXISTS donor TEXT NOT NULL DEFAULT '';
ALTER TABLE finance ADD COLUMN IF NOT EXISTS show_donor BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE finance ADD COLUMN IF NOT EXISTS external_ref TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS finance_external_ref_key ON finance (external_ref);
CREATE INDEX IF NOT EXISTS finance_date_idx ON finance (date DESC, id DESC);
CREATE TABLE IF NOT EXISTS speakers (
  id SERIAL PRIMARY KEY, name TEXT NOT NULL, profile TEXT NOT NULL DEFAULT '', photo TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT TRUE, sort INT NOT NULL DEFAULT 0);
ALTER TABLE kajian ADD COLUMN IF NOT EXISTS speaker_id INT REFERENCES speakers(id) ON DELETE SET NULL;
ALTER TABLE kajian ADD COLUMN IF NOT EXISTS recurrence TEXT NOT NULL DEFAULT 'text' CHECK (recurrence IN ('weekly','once','text'));
ALTER TABLE kajian ADD COLUMN IF NOT EXISTS day_of_week INT CHECK (day_of_week BETWEEN 0 AND 6);
ALTER TABLE kajian ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE kajian ADD COLUMN IF NOT EXISTS start_time TEXT NOT NULL DEFAULT '';
ALTER TABLE kajian ADD COLUMN IF NOT EXISTS end_time TEXT NOT NULL DEFAULT '';
ALTER TABLE kajian ADD COLUMN IF NOT EXISTS banner TEXT NOT NULL DEFAULT '';
ALTER TABLE jumat ADD COLUMN IF NOT EXISTS khatib_speaker_id INT REFERENCES speakers(id) ON DELETE SET NULL;
CREATE TABLE IF NOT EXISTS board_members (
  id SERIAL PRIMARY KEY, name TEXT NOT NULL, position TEXT NOT NULL DEFAULT '', photo TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT TRUE, sort INT NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS tarawih (
  id SERIAL PRIMARY KEY, date DATE NOT NULL, imam TEXT NOT NULL DEFAULT '', speaker TEXT NOT NULL DEFAULT '',
  speaker_id INT REFERENCES speakers(id) ON DELETE SET NULL, theme TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS ied (
  id SERIAL PRIMARY KEY, kind TEXT NOT NULL CHECK (kind IN ('fitri','adha')), date DATE NOT NULL,
  time TEXT NOT NULL DEFAULT '', location TEXT NOT NULL DEFAULT '', khatib TEXT NOT NULL DEFAULT '',
  imam TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '');
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
  ["haribesar", 15],
  ["donatur", 15],
  ["pengurus", 15],
  ["ramadhan", 20],
];

/** Kategori awal; pengurus bisa mengubah, menonaktifkan, atau menambah sendiri. */
const SEED_CATEGORIES: [string, "in" | "out", string | null][] = [
  ["Kotak amal Jumat", "in", "infaq"],
  ["Infaq umum", "in", "infaq"],
  ["Sedekah", "in", "sedekah"],
  ["Zakat mal", "in", "zakat"],
  ["Zakat fitrah", "in", "zakat"],
  ["Wakaf", "in", "wakaf"],
  ["Donasi kegiatan", "in", null],
  ["Pemasukan lain", "in", null],
  ["Listrik, air & internet", "out", null],
  ["Kebersihan & perawatan", "out", null],
  ["Kegiatan dakwah", "out", null],
  ["Honor petugas", "out", null],
  ["Penyaluran zakat", "out", "zakat"],
  ["Santunan & sedekah", "out", "sedekah"],
  ["Pembangunan (wakaf)", "out", "wakaf"],
  ["Pengeluaran lain", "out", null],
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
  // Kategori awal dibuat sekali saja; bila pengurus menghapus semuanya, tidak dibuat ulang.
  const seeded = await p.query("SELECT 1 FROM settings WHERE key = 'seed:financeCategories'");
  if (!seeded.rowCount) {
    const categories = await p.query("SELECT 1 FROM finance_categories LIMIT 1");
    if (!categories.rowCount) {
      for (const [i, [name, kind, ziswaf]] of SEED_CATEGORIES.entries()) {
        await p.query("INSERT INTO finance_categories (name, kind, ziswaf, sort) VALUES ($1,$2,$3,$4)", [name, kind, ziswaf, i]);
      }
    }
    await p.query("INSERT INTO settings (key, value) VALUES ('seed:financeCategories', 'true') ON CONFLICT (key) DO NOTHING");
  }
  const existingUser = await p.query("SELECT 1 FROM users LIMIT 1");
  if (!existingUser.rowCount) {
    // Instalasi lama memakai satu kode unik: hash-nya dipakai ulang sebagai password akun "admin".
    const legacy = await p.query<{ value: unknown }>("SELECT value FROM settings WHERE key = 'pinHash'");
    const legacyHash = legacy.rows[0]?.value;
    let hash = typeof legacyHash === "string" ? legacyHash : undefined;
    if (!hash) {
      const pin = process.env.ADMIN_INITIAL_PIN;
      if (!pin || pin.trim().length < 6 || pin.length > 64) {
        throw new Error("ADMIN_INITIAL_PIN wajib diatur (6–64 karakter) saat inisialisasi database");
      }
      hash = await bcrypt.hash(pin.trim(), 10);
    }
    await p.query(
      "INSERT INTO users (username, name, password_hash, role) VALUES ('admin', 'Administrator', $1, 'admin') ON CONFLICT (username) DO NOTHING",
      [hash],
    );
  }
  // Sesi dari sistem kode unik lama tidak terikat pengguna: semua perangkat login ulang sekali.
  await p.query("DELETE FROM sessions WHERE user_id IS NULL OR expires_at < now()");
  await p.query("DELETE FROM audit_log WHERE at < now() - interval '1 year'");
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

export type TxQuery = <T extends QueryResultRow = QueryResultRow>(sql: string, params?: unknown[]) => Promise<T[]>;

/** Jalankan beberapa query sebagai satu transaksi; dibatalkan seluruhnya bila ada yang gagal. */
export async function transaction<R>(fn: (q: TxQuery) => Promise<R>): Promise<R> {
  await ready();
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(async (sql, params = []) => (await client.query(sql, params)).rows);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
