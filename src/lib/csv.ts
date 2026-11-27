/** Awalan yang bisa dibaca Excel/Sheets sebagai rumus (CSV injection). */
const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (typeof value === "boolean") return value ? "Ya" : "Tidak";
  let s = String(value);
  if (s.length > 1 && FORMULA_START.test(s)) s = `'${s}`;
  return /[",\r\n]|^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV dengan BOM UTF-8 dan baris CRLF agar langsung terbaca benar oleh Excel. */
export function toCsv(headers: string[], rows: unknown[][]): string {
  return "\uFEFF" + [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
