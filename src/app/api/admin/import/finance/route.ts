import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, handleError, jsonError } from "@/lib/api";
import { audit } from "@/lib/auth";
import { transaction, type TxQuery } from "@/lib/db";
import {
  categoryKey,
  classifyRows,
  guessZiswaf,
  isRealDate,
  MAX_IMPORT_AMOUNT,
  MAX_IMPORT_ROWS,
  norm,
  type ImportStatus,
} from "@/lib/finance-import";
import { publish } from "@/lib/realtime";

const kind = z.enum(["in", "out"]);
const Row = z.object({
  ref: z.string().min(1).max(160),
  date: z.string().refine(isRealDate, "Tanggal transaksi tidak valid"),
  kind,
  amount: z
    .number()
    .int("Nominal harus bilangan bulat")
    .positive("Nominal harus lebih dari 0")
    .max(MAX_IMPORT_AMOUNT, "Nominal terlalu besar"),
  description: z.string().max(200).default(""),
  category: z.string().max(80).default(""),
  donor: z.string().max(120).default(""),
  showDonor: z.boolean().default(false),
});
const Body = z.object({
  commit: z.boolean().default(false),
  filename: z.string().max(120).default(""),
  includeSimilar: z.boolean().default(false),
  rows: z
    .array(Row)
    .min(1, "Tidak ada transaksi untuk diimpor")
    .max(MAX_IMPORT_ROWS, `Maksimal ${MAX_IMPORT_ROWS} transaksi sekali impor`),
  categories: z
    .array(z.object({ kind, name: z.string().min(1).max(80), target: z.union([z.enum(["new", "none"]), z.number().int().positive()]) }))
    .max(500)
    .default([]),
});
type ImportBody = z.infer<typeof Body>;

class ImportError extends Error {}

async function classify(q: TxQuery, rows: ImportBody["rows"]): Promise<ImportStatus[]> {
  const refs = await q<{ external_ref: string }>("SELECT external_ref FROM finance WHERE external_ref = ANY($1::text[])", [
    rows.map((r) => r.ref),
  ]);
  const dates = rows.map((r) => r.date).sort();
  const similar = await q<{ key: string }>(
    "SELECT DISTINCT to_char(date, 'YYYY-MM-DD') || '|' || kind || '|' || amount::text AS key FROM finance WHERE date BETWEEN $1 AND $2",
    [dates[0], dates[dates.length - 1]],
  );
  return classifyRows(rows, new Set(refs.map((r) => r.external_ref)), new Set(similar.map((r) => r.key)));
}

type CategoryRow = { id: number; name: string; kind: "in" | "out"; active: boolean; sort: number };

/** id kategori per nama di file, sesuai pilihan pengurus: kategori yang ada, buat baru, atau tanpa kategori. */
async function resolveCategories(q: TxQuery, rows: ImportBody["rows"], choices: ImportBody["categories"]) {
  const existing = await q<CategoryRow>("SELECT id, name, kind, active, sort FROM finance_categories ORDER BY active DESC, sort, id");
  const targets = new Map(choices.map((c) => [categoryKey(c.kind, c.name), c.target]));
  const resolved = new Map<string, number | null>();
  let nextSort = existing.reduce((max, c) => Math.max(max, c.sort), -1) + 1;
  let created = 0;
  for (const row of rows) {
    if (!row.category) continue;
    const key = categoryKey(row.kind, row.category);
    if (resolved.has(key)) continue;
    const target = targets.get(key);
    if (target === undefined) throw new ImportError(`Kategori “${row.category}” belum dipetakan`);
    if (target === "none") {
      resolved.set(key, null);
    } else if (target === "new") {
      const same = existing.find((c) => c.kind === row.kind && norm(c.name) === norm(row.category));
      if (same) {
        resolved.set(key, same.id);
        continue;
      }
      const [inserted] = await q<{ id: number }>(
        "INSERT INTO finance_categories (name, kind, ziswaf, sort) VALUES ($1, $2, $3, $4) RETURNING id",
        [row.category, row.kind, guessZiswaf(row.category), nextSort],
      );
      existing.push({ id: inserted.id, name: row.category, kind: row.kind, active: true, sort: nextSort++ });
      resolved.set(key, inserted.id);
      created++;
    } else {
      const chosen = existing.find((c) => c.id === target);
      if (!chosen) throw new ImportError("Kategori tujuan sudah tidak ada, muat ulang halaman");
      if (chosen.kind !== row.kind) {
        throw new ImportError(`Kategori “${chosen.name}” bukan untuk ${row.kind === "in" ? "pemasukan" : "pengeluaran"}`);
      }
      resolved.set(key, chosen.id);
    }
  }
  return { resolved, created };
}

/**
 * POST /api/admin/import/finance
 * commit=false → status tiap baris (baru / sudah diimpor / mirip transaksi yang ada).
 * commit=true → simpan baris baru (dan yang mirip bila includeSimilar) dalam satu transaksi.
 */
export async function POST(request: Request) {
  const user = await authorize("finance");
  if (user instanceof NextResponse) return user;
  const raw = await request.json().catch(() => undefined);
  if (raw === undefined) return jsonError("Data impor tidak valid", 400);

  try {
    const body = Body.parse(raw);
    if (!body.commit) {
      const statuses = await transaction((q) => classify(q, body.rows));
      return NextResponse.json({ statuses });
    }

    const result = await transaction(async (q) => {
      const statuses = await classify(q, body.rows);
      const picked = body.rows.filter((_, i) => statuses[i] === "new" || (statuses[i] === "similar" && body.includeSimilar));
      const { resolved, created } = await resolveCategories(q, picked, body.categories);
      const inserted = picked.length
        ? await q<{ id: number }>(
            `INSERT INTO finance (date, kind, amount, description, category_id, donor, show_donor, external_ref)
             SELECT * FROM unnest($1::date[], $2::text[], $3::bigint[], $4::text[], $5::int[], $6::text[], $7::bool[], $8::text[])
             ON CONFLICT (external_ref) DO NOTHING RETURNING id`,
            [
              picked.map((r) => r.date),
              picked.map((r) => r.kind),
              picked.map((r) => r.amount),
              picked.map((r) => r.description),
              picked.map((r) => (r.category ? (resolved.get(categoryKey(r.kind, r.category)) ?? null) : null)),
              picked.map((r) => (r.kind === "in" ? r.donor : "")),
              picked.map((r) => r.kind === "in" && r.donor !== "" && r.showDonor),
              picked.map((r) => r.ref),
            ],
          )
        : [];
      return {
        inserted: inserted.length,
        // Baris dengan kunci ganda di file yang sama juga dihitung "sudah ada".
        duplicate: statuses.filter((s) => s === "duplicate").length + (picked.length - inserted.length),
        similarSkipped: body.includeSimilar ? 0 : statuses.filter((s) => s === "similar").length,
        created,
      };
    });

    if (result.inserted || result.created) publish({ type: "update", topics: ["finance", "finance_categories"] });
    const detail = [
      body.filename,
      `${result.inserted} baru`,
      result.duplicate && `${result.duplicate} sudah ada`,
      result.similarSkipped && `${result.similarSkipped} mirip dilewati`,
      result.created && `${result.created} kategori baru`,
    ]
      .filter(Boolean)
      .join(" · ");
    await audit(user, "import", "finance", detail);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof ImportError) return jsonError(e.message, 422);
    return handleError(e);
  }
}
