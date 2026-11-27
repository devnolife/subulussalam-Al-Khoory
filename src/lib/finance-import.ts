import type { Cell } from "./spreadsheet";
import type { FinanceCategory, ZiswafKind } from "./types";

export const MAX_IMPORT_ROWS = 5000;
export const MAX_IMPORT_AMOUNT = 10_000_000_000_000;

export const IMPORT_FIELDS = ["date", "kind", "amount", "amountIn", "amountOut", "category", "description", "donor", "showDonor", "ref"] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];
/** Indeks kolom (0-based) untuk tiap isian; -1 = tidak dipakai. */
export type ColumnMap = Record<ImportField, number>;

export const FIELD_LABELS: Record<ImportField, string> = {
  date: "Tanggal",
  kind: "Jenis (masuk/keluar)",
  amount: "Nominal",
  amountIn: "Nominal pemasukan",
  amountOut: "Nominal pengeluaran",
  category: "Kategori",
  description: "Keterangan",
  donor: "Nama donatur",
  showDonor: "Tampilkan nama donatur (Ya/Tidak)",
  ref: "Nomor transaksi/bukti",
};

export const KIND_MODES = ["split", "column", "sign", "in", "out"] as const;
export type KindMode = (typeof KIND_MODES)[number];
export const KIND_MODE_LABELS: Record<KindMode, string> = {
  split: "Kolom pemasukan dan pengeluaran terpisah",
  column: "Ada kolom jenis (masuk/keluar)",
  sign: "Satu kolom nominal: positif masuk, negatif keluar",
  in: "Semua baris adalah pemasukan",
  out: "Semua baris adalah pengeluaran",
};

export type DateOrder = "dmy" | "mdy";
export type ImportConfig = { headerRow: number; columns: ColumnMap; kindMode: KindMode; dateOrder: DateOrder };

export type Kind = "in" | "out";
export type ImportRow = {
  /** Nomor baris di file (1-based), untuk pesan galat. */
  line: number;
  /** Kunci unik agar file yang sama tidak terimpor dua kali (kolom finance.external_ref). */
  ref: string;
  date: string;
  kind: Kind;
  amount: number;
  description: string;
  category: string;
  donor: string;
  showDonor: boolean;
};
export type RowIssue = { line: number; level: "error" | "skip"; message: string };

/** Isian yang perlu dipetakan untuk tiap cara membaca jenis transaksi. */
export function fieldsFor(mode: KindMode): ImportField[] {
  const amounts: ImportField[] = mode === "split" ? ["amountIn", "amountOut"] : mode === "column" ? ["kind", "amount"] : ["amount"];
  return ["date", ...amounts, "category", "description", "donor", "showDonor", "ref"];
}

export const emptyColumns = (): ColumnMap => Object.fromEntries(IMPORT_FIELDS.map((f) => [f, -1])) as ColumnMap;

export function cellText(v: Cell | undefined): string {
  return v === null || v === undefined ? "" : String(v);
}

/** Huruf kecil, tanpa diakritik dan tanda baca: "Nominal (Rp)" → "nominal rp". */
export function norm(v: Cell | undefined): string {
  return cellText(v)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Tebakan kolom dari judulnya, urut dari yang paling spesifik. "Debet/Kredit" sengaja tidak ditebak:
 * di buku kas debet = masuk, di rekening koran bank debet = keluar.
 */
const GUESS: [ImportField, RegExp][] = [
  ["date", /^(tanggal|tgl|date)\b/],
  ["ref", /^((no|nomor|kode|id) (transaksi|bukti|kwitansi|kuitansi|referensi|ref)|referensi|ref|kwitansi|kuitansi|kode transaksi)$/],
  ["amountIn", /^(pemasukan|penerimaan|uang masuk|kas masuk|masuk|income)( rp)?$/],
  ["amountOut", /^(pengeluaran|uang keluar|kas keluar|keluar|expense)( rp)?$/],
  ["kind", /^(jenis|tipe|type|arus)( transaksi| kas)?$/],
  ["showDonor", /^(nama tampil|tampilkan nama|tampil di layar)/],
  ["donor", /^(nama )?(donatur|donor|muzakki|munfiq|penyetor|penyumbang|wakif)\b|^(dari|atas nama)$/],
  ["category", /^(kategori|category|akun|pos|sumber dana|mata anggaran|golongan)\b|^jenis (pemasukan|pengeluaran|penerimaan|dana|infaq|infak|biaya)$/],
  ["description", /^(keterangan|uraian|deskripsi|catatan|description|memo|perihal|nama transaksi|transaksi)\b/],
  ["amount", /^(nominal|jumlah|nilai|amount|besaran|total)\b/],
];

const looksLikeHeader = (v: Cell) => {
  const n = norm(v);
  return !!n && GUESS.some(([, re]) => re.test(n));
};

/** Baris judul kolom: baris (dari 30 teratas) dengan judul yang paling banyak dikenali; laporan sering diawali judul/periode. */
export function findHeaderRow(rows: Cell[][]): number {
  let best = -1;
  let bestScore = 1;
  for (let r = 0; r < Math.min(rows.length, 30); r++) {
    const score = (rows[r] ?? []).filter(looksLikeHeader).length;
    if (score > bestScore) {
      best = r;
      bestScore = score;
    }
  }
  if (best >= 0) return best;
  return Math.max(
    rows.findIndex((row) => (row ?? []).filter((c) => norm(c)).length >= 2),
    0,
  );
}

export function guessColumns(headers: Cell[]): ColumnMap {
  const columns = emptyColumns();
  const used = new Set<number>();
  const names = headers.map(norm);
  for (const [field, re] of GUESS) {
    const i = names.findIndex((n, idx) => n && !used.has(idx) && re.test(n));
    if (i >= 0) {
      columns[field] = i;
      used.add(i);
    }
  }
  return columns;
}

const IN_WORDS = /\b(in|income|masuk|pemasukan|penerimaan|terima|diterima)\b/;
const OUT_WORDS = /\b(out|expense|keluar|pengeluaran|penyaluran|dikeluarkan|biaya|belanja)\b/;

export function parseKind(value: Cell | undefined): Kind | null {
  const n = norm(value);
  const isIn = IN_WORDS.test(n);
  const isOut = OUT_WORDS.test(n);
  return isIn === isOut ? null : isIn ? "in" : "out";
}

export function parseBool(value: Cell | undefined): boolean {
  return /^(ya|y|yes|true|1|benar|tampil|tampilkan)$/.test(norm(value));
}

/**
 * Nominal rupiah (bulat, bertanda). Mengenali "Rp 1.500.000", "1.500.000,00", "1,500,000.00",
 * "150.000,-", "(50.000)" dan "-50.000". null bila kosong atau bukan angka.
 */
export function parseAmount(value: Cell | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? Math.round(value) : null;
  let s = value.replace(/rp\.?|idr/gi, "").replace(/[\s\u00a0']/g, "");
  // Format Akuntansi Rupiah: nol tampil "Rp -" atau "-,-", minus tampil "Rp (350.000)".
  if (/^[-\u2012-\u2015\u2212]+([.,][-\u2012-\u2015\u2212]+)?$/.test(s)) return 0;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  s = s.replace(/[.,]-$/, "");
  if (/^[-\u2212]/.test(s)) {
    negative = true;
    s = s.slice(1);
  } else if (/[-\u2212]$/.test(s)) {
    negative = true;
    s = s.slice(0, -1);
  }
  if (!/^\d[\d.,]*$/.test(s)) return null;
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  let plain: string;
  if (lastDot >= 0 && lastComma >= 0) {
    const decimal = lastDot > lastComma ? "." : ",";
    plain = s
      .split(decimal === "." ? "," : ".")
      .join("")
      .replace(decimal, ".");
  } else if (lastDot >= 0 || lastComma >= 0) {
    const parts = s.split(lastDot >= 0 ? "." : ",");
    if (parts[0].length <= 3 && parts.slice(1).every((p) => p.length === 3)) plain = parts.join("");
    else if (parts.length === 2) plain = `${parts[0]}.${parts[1]}`;
    else return null;
  } else plain = s;
  const n = Number(plain);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  return negative && rounded !== 0 ? -rounded : rounded;
}

const MONTHS: Record<string, number> = {
  jan: 1, januari: 1, january: 1,
  feb: 2, peb: 2, februari: 2, pebruari: 2, february: 2,
  mar: 3, maret: 3, march: 3,
  apr: 4, april: 4,
  mei: 5, may: 5,
  jun: 6, juni: 6, june: 6,
  jul: 7, juli: 7, july: 7,
  agu: 8, agt: 8, ags: 8, agus: 8, agustus: 8, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  okt: 10, oct: 10, oktober: 10, october: 10,
  nov: 11, nop: 11, november: 11, nopember: 11,
  des: 12, dec: 12, desember: 12, december: 12,
};

const pad = (n: number) => String(n).padStart(2, "0");

export function isRealDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return y >= 1990 && y <= 2100 && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

function ymd(y: number, m: number, d: number): string | null {
  const s = `${y}-${pad(m)}-${pad(d)}`;
  return isRealDate(s) ? s : null;
}

const fullYear = (s: string) => (s.length === 2 ? 2000 + Number(s) : Number(s));

function serialDate(n: number): string | null {
  if (n < 20000 || n > 80000) return null;
  const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(n) * 86400000);
  return ymd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** Tanggal → "YYYY-MM-DD". Format angka D/M/Y kecuali `order` = "mdy"; nama bulan Indonesia/Inggris dikenali. */
export function parseDate(value: Cell | undefined, order: DateOrder = "dmy"): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return serialDate(value);
  const s = value.trim().toLowerCase();
  if (!s) return null;
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:$|[\st])/.exec(s);
  if (m) return ymd(Number(m[1]), Number(m[2]), Number(m[3]));
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})(?:$|\s)/.exec(s);
  if (m) {
    const [a, b, y] = [Number(m[1]), Number(m[2]), fullYear(m[3])];
    return order === "mdy" ? ymd(y, a, b) : ymd(y, b, a);
  }
  m = /(\d{1,2})[\s\-/.]+([a-z]{3,9})\.?[\s\-/.,]+(\d{4}|\d{2})\b/.exec(s);
  if (m && MONTHS[m[2]]) return ymd(fullYear(m[3]), MONTHS[m[2]], Number(m[1]));
  m = /\b([a-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})\b/.exec(s);
  if (m && MONTHS[m[1]]) return ymd(Number(m[3]), MONTHS[m[1]], Number(m[2]));
  if (/^\d{5}(\.\d+)?$/.test(s)) return serialDate(Number(s));
  return null;
}

/** "mdy" hanya bila ada tanggal yang bagian keduanya > 12 (mis. 11/27/2026) dan tidak ada yang sebaliknya lebih banyak. */
export function detectDateOrder(values: (Cell | undefined)[]): DateOrder {
  let dmy = 0;
  let mdy = 0;
  for (const v of values) {
    const m = /^\s*(\d{1,2})[-/.](\d{1,2})[-/.]\d{2,4}/.exec(cellText(v));
    if (!m) continue;
    if (Number(m[1]) > 12) dmy++;
    else if (Number(m[2]) > 12) mdy++;
  }
  return mdy > dmy ? "mdy" : "dmy";
}

/** Konfigurasi awal dari isi file; `hint` = nama file/lembar untuk menebak pemasukan atau pengeluaran. */
export function autoConfig(rows: Cell[][], hint = "", headerRow = findHeaderRow(rows)): ImportConfig {
  const columns = guessColumns(rows[headerRow] ?? []);
  const body = rows.slice(headerRow + 1);
  if (columns.kind >= 0) {
    // Kolom "Jenis" yang isinya bukan masuk/keluar (mis. "Infaq Jumat") adalah kategori.
    const values = body.map((r) => r[columns.kind]).filter((v) => norm(v));
    if (values.length && values.filter((v) => parseKind(v)).length < values.length / 2) {
      if (columns.category < 0) columns.category = columns.kind;
      columns.kind = -1;
    }
  }
  const text = norm(`${hint} ${rows.slice(0, headerRow).flat().map(cellText).join(" ")}`);
  const inHint = /\b(pemasukan|penerimaan)\b/.test(text);
  const outHint = /\bpengeluaran\b/.test(text);
  let kindMode: KindMode;
  if (columns.amountIn >= 0 && columns.amountOut >= 0) kindMode = "split";
  else if (columns.kind >= 0 && columns.amount >= 0) kindMode = "column";
  else if (columns.amountIn >= 0) kindMode = "in";
  else if (columns.amountOut >= 0) kindMode = "out";
  else if (inHint !== outHint) kindMode = inHint ? "in" : "out";
  else kindMode = "sign";
  if (columns.amount < 0) columns.amount = kindMode === "in" ? columns.amountIn : kindMode === "out" ? columns.amountOut : -1;
  const dateOrder = columns.date >= 0 ? detectDateOrder(body.map((r) => r[columns.date])) : "dmy";
  return { headerRow, columns, kindMode, dateOrder };
}

/** Baris saldo/total di laporan; bukan transaksi. */
const SUMMARY_CELL = /^(sub ?total|grand total|total|jumlah|saldo)( (awal|akhir|pemasukan|pengeluaran|penerimaan|bulan ini|periode ini|kas))*$/;
const SUMMARY_START = /^(sub ?total|grand total|total|jumlah|saldo)\b/;

/** Hash 53-bit (cyrb53) untuk sidik jari baris tanpa nomor transaksi. */
export function hash53(text: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

const clip = (s: string, max: number) => s.replace(/\s+/g, " ").trim().slice(0, max);
const quote = (v: Cell | undefined) => `“${clip(cellText(v), 40)}”`;

/** Ubah baris file menjadi transaksi siap impor; baris bermasalah dilaporkan dengan nomor barisnya. */
export function buildImportRows(rows: Cell[][], config: ImportConfig): { rows: ImportRow[]; issues: RowIssue[] } {
  const { columns, kindMode, dateOrder } = config;
  const out: ImportRow[] = [];
  const issues: RowIssue[] = [];
  const seen = new Map<string, number>();
  const get = (row: Cell[], field: ImportField) => (columns[field] >= 0 ? row[columns[field]] : undefined);
  const has = (v: Cell | undefined) => cellText(v).trim() !== "";
  const rowKey = (row: Cell[]) => row.map(norm).join("|").replace(/\|+$/, "");
  const headerKey = rowKey(rows[config.headerRow] ?? []);

  /** Jenis dan nominal satu baris, atau alasan baris itu tidak bisa diimpor. */
  const read = (row: Cell[]): { date: string; kind: Kind; amount: number } | Omit<RowIssue, "line"> => {
    const fail = (message: string, level: RowIssue["level"] = "error") => ({ level, message });
    const rawDate = get(row, "date");
    const date = parseDate(rawDate, dateOrder);
    if (!date) return fail(has(rawDate) ? `Tanggal tidak dikenali: ${quote(rawDate)}` : "Tanggal kosong");
    let kind: Kind | null = null;
    let amount: number | null = null;
    let bad: Cell | undefined;
    if (kindMode === "split") {
      const rawIn = get(row, "amountIn");
      const rawOut = get(row, "amountOut");
      const a = parseAmount(rawIn);
      const b = parseAmount(rawOut);
      if (has(rawIn) && a === null) bad = rawIn;
      else if (has(rawOut) && b === null) bad = rawOut;
      else if (a && b) return fail("Pemasukan dan pengeluaran terisi di baris yang sama");
      else if (a) {
        kind = "in";
        amount = Math.abs(a);
      } else if (b) {
        kind = "out";
        amount = Math.abs(b);
      } else amount = a ?? b;
    } else {
      const raw = get(row, "amount");
      const n = parseAmount(raw);
      if (n === null && has(raw)) bad = raw;
      if (kindMode === "sign") {
        if (n) kind = n > 0 ? "in" : "out";
        amount = n === null ? null : Math.abs(n);
      } else if (kindMode === "column") {
        kind = parseKind(get(row, "kind"));
        amount = n === null ? null : Math.abs(n);
      } else {
        if (n !== null && n < 0) return fail("Nominal negatif. Pilih cara “positif masuk, negatif keluar” bila file memakai tanda minus.");
        kind = kindMode;
        amount = n;
      }
    }
    if (bad !== undefined) return fail(`Nominal tidak dikenali: ${quote(bad)}`);
    if (amount === null) return fail("Nominal kosong");
    if (amount === 0) return fail("Nominal 0", "skip");
    if (amount > MAX_IMPORT_AMOUNT) return fail("Nominal terlalu besar");
    if (!kind) {
      const rawKind = get(row, "kind");
      return fail(has(rawKind) ? `Jenis tidak dikenali: ${quote(rawKind)} (gunakan Pemasukan/Pengeluaran)` : "Jenis kosong");
    }
    return { date, kind, amount };
  };

  for (let i = config.headerRow + 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const line = i + 1;
    // Baris kosong dan judul kolom yang berulang di tiap halaman laporan.
    if (!row.some(has) || rowKey(row) === headerKey) continue;

    const parsed = read(row);
    if ("message" in parsed) {
      // Saldo awal/akhir dan total bukan transaksi; baris bertuliskan "Saldo awal" yang punya nominal tetap diimpor.
      const texts = row.filter((v): v is string => typeof v === "string").map(norm);
      const undated = parseDate(get(row, "date"), dateOrder) === null;
      const summary = texts.some((t) => SUMMARY_CELL.test(t)) || (undated && texts.some((t) => SUMMARY_START.test(t)));
      issues.push(summary ? { line, level: "skip", message: "Baris saldo/total, bukan transaksi" } : { line, ...parsed });
      continue;
    }
    const { date, kind, amount } = parsed;
    const description = clip(cellText(get(row, "description")), 200);
    const category = clip(cellText(get(row, "category")), 80);
    const donor = kind === "in" ? clip(cellText(get(row, "donor")), 120) : "";
    const refText = clip(cellText(get(row, "ref")), 100).toLowerCase();
    // Nomor bukti sering mulai lagi dari 1 tiap bulan/buku, jadi tanggal ikut menjadi bagian kunci.
    const base = refText
      ? `id:${date}:${kind}:${refText}`
      : `fp:${date}:${kind}:${amount}:${hash53([description, category, donor].join("|").toLowerCase())}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    out.push({
      line,
      ref: n > 1 ? `${base}#${n}` : base,
      date,
      kind,
      amount,
      description,
      category,
      donor,
      showDonor: donor !== "" && parseBool(get(row, "showDonor")),
    });
  }
  return { rows: out, issues };
}

export const categoryKey = (kind: Kind, name: string) => `${kind}|${norm(name)}`;

export type CategoryNeed = { key: string; kind: Kind; name: string; count: number };

/** Kategori berbeda (per jenis) yang dipakai baris impor, urut dari yang paling sering. */
export function categoryNeeds(rows: ImportRow[]): CategoryNeed[] {
  const needs = new Map<string, CategoryNeed>();
  for (const r of rows) {
    if (!r.category) continue;
    const key = categoryKey(r.kind, r.category);
    const need = needs.get(key);
    if (need) need.count++;
    else needs.set(key, { key, kind: r.kind, name: r.category, count: 1 });
  }
  return [...needs.values()].sort((a, b) => a.kind.localeCompare(b.kind) || b.count - a.count || a.name.localeCompare(b.name));
}

/** Kategori yang sudah ada dengan nama sama (tanpa membedakan huruf besar/tanda baca), utamakan yang aktif. */
export function matchCategory(need: Pick<CategoryNeed, "kind" | "name">, categories: FinanceCategory[]): FinanceCategory | null {
  const same = categories.filter((c) => c.kind === need.kind && norm(c.name) === norm(need.name));
  return same.find((c) => c.active) ?? same[0] ?? null;
}

export function guessZiswaf(name: string): ZiswafKind | null {
  const n = norm(name);
  if (/zakat/.test(n)) return "zakat";
  if (/wakaf/.test(n)) return "wakaf";
  if (/infa[qk]/.test(n)) return "infaq";
  if (/sedekah|shadaqah|sadaqah|shodaqoh|sodaqoh|sedeqah/.test(n)) return "sedekah";
  return null;
}

export type ImportStatus = "new" | "duplicate" | "similar";
export const similarKey = (r: { date: string; kind: Kind; amount: number }) => `${r.date}|${r.kind}|${r.amount}`;

/**
 * duplicate = kunci impor sudah ada (file/baris yang sama pernah diimpor);
 * similar = ada transaksi lain dengan tanggal, jenis, dan nominal sama (mungkin dicatat manual).
 */
export function classifyRows(
  rows: { ref: string; date: string; kind: Kind; amount: number }[],
  existingRefs: Set<string>,
  existingKeys: Set<string>,
): ImportStatus[] {
  return rows.map((r) => (existingRefs.has(r.ref) ? "duplicate" : existingKeys.has(similarKey(r)) ? "similar" : "new"));
}
