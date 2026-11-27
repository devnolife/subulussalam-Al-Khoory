import { z } from "zod";
import { query } from "./db";
import { ZISWAF_KINDS } from "./types";

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal YYYY-MM-DD");
const optionalDate = z
  .union([dateStr, z.literal(""), z.null()])
  .transform((v) => v || null)
  .optional();
/** Id relasi dari <select>: "" atau null berarti kosong. */
const optionalId = z
  .union([z.literal(""), z.null(), z.coerce.number().int().positive()])
  .transform((v) => (typeof v === "number" ? v : null))
  .optional();
const text = (max = 500) => z.string().trim().max(max);

/** Definisi resource admin: tabel, kolom (camelCase → snake_case), dan validasi. */
export const RESOURCES = {
  announcements: {
    table: "announcements",
    order: "sort, id DESC",
    schema: z.object({
      title: text(120).default(""),
      body: text(1000).min(1, "Isi pengumuman wajib diisi"),
      showTicker: z.boolean().default(true),
      showPanel: z.boolean().default(true),
      active: z.boolean().default(true),
      endsAt: optionalDate,
      sort: z.coerce.number().int().default(0),
    }),
  },
  kajian: {
    table: "kajian",
    order: "sort, id",
    schema: z.object({
      title: text(160).min(1, "Judul wajib diisi"),
      speaker: text(120).default(""),
      schedule: text(120).default(""),
      time: text(60).default(""),
      location: text(120).default(""),
      active: z.boolean().default(true),
      sort: z.coerce.number().int().default(0),
    }),
  },
  jumat: {
    table: "jumat",
    order: "date",
    schema: z.object({
      date: dateStr,
      khatib: text(120).default(""),
      imam: text(120).default(""),
      muadzin: text(120).default(""),
      theme: text(200).default(""),
    }),
  },
  finance: {
    table: "finance",
    order: "date DESC, id DESC",
    schema: z.object({
      date: dateStr,
      kind: z.enum(["in", "out"]),
      amount: z.coerce.number().int().positive("Nominal harus lebih dari 0"),
      description: text(200).default(""),
      categoryId: optionalId,
      donor: text(120).default(""),
      showDonor: z.boolean().default(false),
    }),
  },
  finance_categories: {
    table: "finance_categories",
    order: "kind, sort, name",
    schema: z.object({
      name: text(80).min(1, "Nama kategori wajib diisi"),
      kind: z.enum(["in", "out"]),
      ziswaf: z
        .union([z.enum(ZISWAF_KINDS), z.literal(""), z.null()])
        .transform((v) => v || null)
        .optional(),
      active: z.boolean().default(true),
      sort: z.coerce.number().int().default(0),
    }),
  },
  verses: {
    table: "verses",
    order: "id",
    schema: z.object({
      arabic: text(2000).min(1, "Teks Arab wajib diisi"),
      translation: text(2000).min(1, "Terjemahan wajib diisi"),
      source: text(120).default(""),
      active: z.boolean().default(true),
    }),
  },
  slides: {
    table: "slides",
    order: "sort, id",
    schema: z.object({
      image: text(300).min(1, "Gambar wajib diunggah"),
      caption: text(200).default(""),
      active: z.boolean().default(true),
      sort: z.coerce.number().int().default(0),
    }),
  },
  playlist: {
    table: "playlist_items",
    order: "sort, id",
    schema: z.object({
      durationSec: z.coerce.number().int().min(5).max(3600),
      sort: z.coerce.number().int(),
      enabled: z.boolean(),
      pinned: z.boolean(),
    }),
  },
} as const;

export type ResourceName = keyof typeof RESOURCES;
export const isResource = (n: string): n is ResourceName => n in RESOURCES;

const snake = (s: string) => s.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
const camel = (s: string) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

function toCamel(row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (k.startsWith("__")) continue;
    if (v instanceof Date) out[camel(k)] = v.toISOString();
    else if (typeof v === "string" && /^\d+$/.test(v) && k === "amount") out[camel(k)] = Number(v);
    else out[camel(k)] = v;
  }
  // Alias "__kolom" berisi versi string dari kolom DATE dan menimpa nilai aslinya.
  for (const [k, v] of Object.entries(row)) {
    if (k.startsWith("__")) out[camel(k.slice(2))] = v;
  }
  return out;
}

/** Kolom DATE dikembalikan sebagai string agar tidak bergeser zona waktu. */
function selectList(table: string) {
  if (table === "jumat" || table === "finance") return "*, to_char(date, 'YYYY-MM-DD') AS __date";
  if (table === "announcements") return "*, to_char(ends_at, 'YYYY-MM-DD') AS __ends_at";
  return "*";
}

export async function listResource<T = Record<string, unknown>>(name: ResourceName, where = ""): Promise<T[]> {
  const r = RESOURCES[name];
  const rows = await query(`SELECT ${selectList(r.table)} FROM ${r.table} ${where} ORDER BY ${r.order}`);
  return rows.map(toCamel) as T[];
}

export async function createResource(name: ResourceName, data: Record<string, unknown>) {
  const r = RESOURCES[name];
  const keys = Object.keys(data);
  const rows = await query(
    `INSERT INTO ${r.table} (${keys.map(snake).join(",")}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(",")}) RETURNING id`,
    keys.map((k) => data[k]),
  );
  return rows[0];
}

export async function updateResource(name: ResourceName, id: number, data: Record<string, unknown>) {
  const r = RESOURCES[name];
  const keys = Object.keys(data);
  if (!keys.length) return;
  await query(
    `UPDATE ${r.table} SET ${keys.map((k, i) => `${snake(k)} = $${i + 1}`).join(", ")} WHERE id = $${keys.length + 1}`,
    [...keys.map((k) => data[k]), id],
  );
}

export async function deleteResource(name: ResourceName, id: number) {
  await query(`DELETE FROM ${RESOURCES[name].table} WHERE id = $1`, [id]);
}

export async function getResource(name: ResourceName, id: number) {
  const r = RESOURCES[name];
  const rows = await query(`SELECT ${selectList(r.table)} FROM ${r.table} WHERE id = $1`, [id]);
  return rows[0] ? toCamel(rows[0]) : null;
}

const rupiah = (n: unknown) => `Rp${Number(n || 0).toLocaleString("id-ID")}`;

/** Label singkat sebuah data untuk Riwayat aktivitas. */
export function describeRecord(name: ResourceName, data: Record<string, unknown> | null): string {
  if (!data) return "";
  const s = (k: string) => (typeof data[k] === "string" ? (data[k] as string).trim() : "");
  const parts: Record<ResourceName, string> = {
    announcements: s("title") || s("body"),
    kajian: s("title"),
    jumat: [s("date"), s("khatib")].filter(Boolean).join(" · "),
    finance: [s("date"), data.kind === "out" ? "Pengeluaran" : data.kind === "in" ? "Pemasukan" : "", data.amount != null ? rupiah(data.amount) : "", s("description") || s("donor")]
      .filter(Boolean)
      .join(" · "),
    finance_categories: s("name"),
    verses: s("source") || s("translation"),
    slides: s("caption") || s("image"),
    playlist: s("type"),
  };
  return parts[name].slice(0, 120);
}
