import { strFromU8, unzipSync } from "fflate";

/** Nilai sel: teks (CSV/HTML/teks Excel), angka (sel angka Excel), atau kosong. Sel tanggal Excel menjadi "YYYY-MM-DD". */
export type Cell = string | number | null;
export type SheetData = { name: string; rows: Cell[][] };

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_UNZIPPED_BYTES = 60 * 1024 * 1024;
const MAX_ROWS = 20000;
const MAX_COLUMNS = 200;

export class SpreadsheetError extends Error {}

/** UTF-8 (dengan/tanpa BOM), UTF-16 dari "Unicode Text" Excel, atau Windows-1252 untuk CSV lama. */
export function decodeText(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(bytes.subarray(2));
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder("utf-16be").decode(bytes.subarray(2));
  const body = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? bytes.subarray(3) : bytes;
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(body);
  } catch {
    return new TextDecoder("windows-1252").decode(body);
  }
}

/** CSV RFC 4180: kutip ganda, "" di dalam kutip, baris CRLF/LF/CR, dan baris baru di dalam kutip. */
export function parseCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch !== '"') field += ch;
      else if (text[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = false;
    } else if (ch === '"' && field === "") quoted = true;
    else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\r" || ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      if (ch === "\r" && text[i + 1] === "\n") i++;
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const DELIMITERS = [",", ";", "\t", "|"];

/**
 * Pemisah yang membuat paling banyak baris berjumlah kolom sama (>1).
 * Excel berbahasa Indonesia menyimpan CSV dengan ";" dan koma desimal, jadi tidak bisa diasumsikan ",".
 */
export function detectDelimiter(text: string): string {
  const sample = text.slice(0, 20000);
  let best = ",";
  let bestScore = 0;
  for (const d of DELIMITERS) {
    const widths = new Map<number, number>();
    for (const r of parseCsv(sample, d).slice(0, 30)) {
      if (r.length > 1 && r.some((c) => c.trim())) widths.set(r.length, (widths.get(r.length) ?? 0) + 1);
    }
    let score = 0;
    for (const [width, n] of widths) score = Math.max(score, n * 1000 + width);
    if (score > bestScore) {
      best = d;
      bestScore = score;
    }
  }
  return best;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function unescapeXml(s: string): string {
  return s
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
      if (e[0] !== "#") return ENTITIES[e.toLowerCase()] ?? m;
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m;
    })
    .replace(/_x([0-9a-f]{4})_/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
}

/** Elemen XML `name` (boleh berawalan namespace, mis. `x:c`) beserta atribut dan isinya. */
function elements(xml: string, name: string, ignoreCase = false): { attrs: Record<string, string>; body: string }[] {
  const prefix = "(?:[\\w.-]+:)?";
  const re = new RegExp(`<${prefix}${name}\\b([^>]*?)(?:/>|>([\\s\\S]*?)</${prefix}${name}\\s*>)`, ignoreCase ? "gi" : "g");
  const out: { attrs: Record<string, string>; body: string }[] = [];
  for (const m of xml.matchAll(re)) {
    const attrs: Record<string, string> = {};
    for (const a of m[1].matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) attrs[a[1]] = unescapeXml(a[2] ?? a[3] ?? "");
    out.push({ attrs, body: m[2] ?? "" });
  }
  return out;
}

/** Gabungan semua <t> (teks berformat terdiri dari beberapa run); teks fonetik <rPh> diabaikan. */
function richText(xml: string): string {
  return elements(xml.replace(/<(?:[\w.-]+:)?rPh\b[\s\S]*?<\/(?:[\w.-]+:)?rPh>/g, ""), "t")
    .map((t) => unescapeXml(t.body))
    .join("");
}

const BUILTIN_DATE_FORMATS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58]);

function isDateFormat(id: number, code: string | undefined): boolean {
  if (BUILTIN_DATE_FORMATS.has(id)) return true;
  if (!code || /general/i.test(code)) return false;
  const bare = code.replace(/"[^"]*"|\\.|_.|\*.|\[[^\]]*\]/g, "");
  return /[dmyhs]/i.test(bare);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Nomor seri tanggal Excel → "YYYY-MM-DD" (atau "HH:MM" untuk sel jam saja). */
export function excelSerialToString(serial: number, date1904 = false): string {
  if (serial >= 0 && serial < 1) {
    const minutes = Math.round(serial * 1440);
    return `${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`;
  }
  const days = Math.floor(serial) + (date1904 ? 1462 : 0);
  const d = new Date(Date.UTC(1899, 11, 30) + days * 86400000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function columnIndex(ref: string | undefined): number | null {
  const letters = /^[A-Z]+/i.exec(ref ?? "")?.[0];
  if (!letters) return null;
  let n = 0;
  for (const ch of letters.toUpperCase()) n = n * 26 + ch.charCodeAt(0) - 64;
  return n - 1;
}

/** Huruf kolom Excel untuk indeks 0-based (0 → A, 26 → AA). */
export function columnLetter(index: number): string {
  let s = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

function setCell(rows: Cell[][], r: number, c: number, value: Cell) {
  if (r >= MAX_ROWS) throw new SpreadsheetError(`File berisi lebih dari ${MAX_ROWS.toLocaleString("id-ID")} baris. Pecah per tahun lalu impor bertahap.`);
  if (c >= MAX_COLUMNS) return;
  while (rows.length <= r) rows.push([]);
  const row = rows[r];
  while (row.length < c) row.push(null);
  row[c] = value;
}

function readXlsx(bytes: Uint8Array): SheetData[] {
  let total = 0;
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes, {
      filter: (f) => {
        const wanted =
          f.name === "xl/workbook.xml" ||
          f.name === "xl/_rels/workbook.xml.rels" ||
          f.name === "xl/sharedStrings.xml" ||
          f.name === "xl/styles.xml" ||
          (f.name.startsWith("xl/worksheets/") && f.name.endsWith(".xml"));
        if (wanted) total += f.originalSize;
        if (total > MAX_UNZIPPED_BYTES) throw new SpreadsheetError("Isi file terlalu besar untuk dibaca");
        return wanted;
      },
    });
  } catch (e) {
    if (e instanceof SpreadsheetError) throw e;
    throw new SpreadsheetError("File tidak bisa dibuka. Pastikan file Excel (.xlsx) tidak rusak atau terkunci kata sandi.");
  }
  const text = (name: string) => (files[name] ? strFromU8(files[name]) : "");
  const workbook = text("xl/workbook.xml");
  if (!workbook) throw new SpreadsheetError("Bukan file Excel .xlsx. Buka file di Excel/Google Sheets lalu simpan sebagai .xlsx atau CSV.");

  const date1904 = elements(workbook, "workbookPr").some((w) => /^(1|true)$/i.test(w.attrs.date1904 ?? ""));
  const shared = elements(text("xl/sharedStrings.xml"), "si").map((si) => richText(si.body));

  const styles = text("xl/styles.xml");
  const formats = new Map(elements(styles, "numFmt").map((f) => [Number(f.attrs.numFmtId), f.attrs.formatCode]));
  const cellXfs = elements(styles, "cellXfs")[0]?.body ?? "";
  const dateStyles = new Set<number>();
  elements(cellXfs, "xf").forEach((xf, i) => {
    const id = Number(xf.attrs.numFmtId ?? 0);
    if (isDateFormat(id, formats.get(id))) dateStyles.add(i);
  });

  const targets = new Map(
    elements(text("xl/_rels/workbook.xml.rels"), "Relationship").map((r) => {
      const target = r.attrs.Target ?? "";
      return [r.attrs.Id, target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`];
    }),
  );
  const declared = elements(workbook, "sheet").map((s) => ({
    name: s.attrs.name ?? "Sheet",
    hidden: /hidden/i.test(s.attrs.state ?? ""),
    path: targets.get(s.attrs["r:id"] ?? Object.entries(s.attrs).find(([k]) => k.endsWith(":id"))?.[1] ?? ""),
  }));
  const visible = declared.filter((s) => !s.hidden);

  const sheets: SheetData[] = [];
  for (const sheet of visible.length ? visible : declared) {
    const xml = sheet.path ? text(sheet.path) : "";
    if (!xml) continue;
    const rows: Cell[][] = [];
    let nextRow = 0;
    for (const row of elements(xml, "row")) {
      const r = row.attrs.r ? Number(row.attrs.r) - 1 : nextRow;
      nextRow = r + 1;
      let nextCol = 0;
      for (const c of elements(row.body, "c")) {
        const col = columnIndex(c.attrs.r) ?? nextCol;
        nextCol = col + 1;
        const v = elements(c.body, "v")[0]?.body;
        let value: Cell = null;
        switch (c.attrs.t) {
          case "s":
            value = shared[Number(v)] ?? null;
            break;
          case "inlineStr":
            value = richText(elements(c.body, "is")[0]?.body ?? "");
            break;
          case "b":
            value = v === undefined ? null : v.trim() === "1" ? "TRUE" : "FALSE";
            break;
          case "str":
          case "e":
          case "d":
            value = v === undefined ? null : unescapeXml(v);
            break;
          default: {
            const n = v === undefined || v.trim() === "" ? NaN : Number(v);
            if (!Number.isNaN(n)) value = dateStyles.has(Number(c.attrs.s ?? 0)) ? excelSerialToString(n, date1904) : n;
          }
        }
        if (value !== null && value !== "") setCell(rows, r, col, value);
      }
    }
    sheets.push({ name: sheet.name, rows: rows.map((row) => Array.from(row, (v) => v ?? null)) });
  }
  if (!sheets.length) throw new SpreadsheetError("Tidak ada lembar kerja yang bisa dibaca di file ini");
  return sheets;
}

/** Banyak aplikasi web mengekspor tabel HTML dengan akhiran .xls. */
function readHtmlTables(html: string): SheetData[] {
  const cellText = (s: string) =>
    unescapeXml(s.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, ""))
      .replace(/\s+/g, " ")
      .trim();
  const sheets = elements(html, "table", true).map((table, i) => ({
    name: `Tabel ${i + 1}`,
    rows: elements(table.body, "tr", true).map((tr) => elements(tr.body, "t[dh]", true).map((td) => cellText(td.body) || null)),
  }));
  const filled = sheets.filter((s) => s.rows.some((r) => r.length > 1));
  if (!filled.length) throw new SpreadsheetError("Tidak ada tabel yang bisa dibaca di file ini");
  return filled;
}

/** Baca file unggahan (CSV/TSV, XLSX, atau tabel HTML berakhiran .xls) menjadi daftar lembar. */
export function readSpreadsheet(filename: string, bytes: Uint8Array): SheetData[] {
  if (bytes.length > MAX_FILE_BYTES) throw new SpreadsheetError("Ukuran file maksimal 5 MB");
  if (bytes.length === 0) throw new SpreadsheetError("File kosong");
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) {
    throw new SpreadsheetError("File .xls versi lama belum didukung. Buka di Excel lalu simpan sebagai .xlsx atau CSV.");
  }
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) return readXlsx(bytes);
  const text = decodeText(bytes);
  if (/^\s*</.test(text) && /<table\b/i.test(text)) return readHtmlTables(text);
  const name = filename.replace(/\.[^.]+$/, "") || "Data";
  return [{ name, rows: parseCsv(text, detectDelimiter(text)) }];
}
