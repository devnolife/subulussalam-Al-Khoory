"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, CircleCheck, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/components/admin/api";
import { Button, Card, Field, PageHeader, Select, TextInput, Toggle } from "@/components/admin/ui";
import {
  autoConfig,
  buildImportRows,
  categoryNeeds,
  cellText,
  FIELD_LABELS,
  fieldsFor,
  KIND_MODE_LABELS,
  KIND_MODES,
  matchCategory,
  MAX_IMPORT_ROWS,
  type CategoryNeed,
  type ImportConfig,
  type ImportField,
  type ImportRow,
  type ImportStatus,
  type KindMode,
} from "@/lib/finance-import";
import { columnLetter, MAX_FILE_BYTES, readSpreadsheet, SpreadsheetError, type Cell, type SheetData } from "@/lib/spreadsheet";
import { formatDateStr, rupiah } from "@/lib/time";
import type { FinanceCategory } from "@/lib/types";

type Loaded = { filename: string; sheets: SheetData[] };
type Result = { inserted: number; duplicate: number; similarSkipped: number; created: number };

const EMPTY: Cell[][] = [];
const ACCEPT =
  ".csv,.tsv,.txt,.xlsx,.xls,text/csv,text/tab-separated-values,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel";
const REQUIRED = new Set<ImportField>(["date", "kind", "amount", "amountIn", "amountOut"]);
const FIELD_HELP: Partial<Record<ImportField, string>> = {
  amountIn: "Debet/Kredit tidak dipilih otomatis: di buku kas Debet = pemasukan, di rekening koran bank Kredit = pemasukan.",
  kind: "Isinya Pemasukan/Pengeluaran, Masuk/Keluar, atau In/Out.",
  category: "Nama kategori di file akan dicocokkan dengan kategori kas pada langkah berikutnya.",
  donor: "Hanya untuk pemasukan.",
  showDonor: "Isi Ya/Tidak. Bila tidak ada kolom ini, donatur tampil sebagai Hamba Allah.",
  ref: "Bila ada, dipakai untuk mengenali transaksi yang sudah pernah diimpor. Tanpa kolom ini dipakai tanggal, nominal, dan keterangan.",
};
const STATUS: Record<ImportStatus, { label: string; cls: string }> = {
  new: { label: "Baru", cls: "bg-emerald-400/15 text-emerald-200" },
  duplicate: { label: "Sudah ada", cls: "bg-white/10 text-white/55" },
  similar: { label: "Mirip", cls: "bg-amber-400/15 text-amber-200" },
};
const PREVIEW_ROWS = 20;

const fetchCategories = () => api<FinanceCategory[]>("/api/admin/finance_categories");
const kindLabel = (kind: "in" | "out") => (kind === "in" ? "Pemasukan" : "Pengeluaran");
const sum = (rows: ImportRow[], kind: "in" | "out") => rows.reduce((s, r) => s + (r.kind === kind ? r.amount : 0), 0);

export default function ImporKasPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [config, setConfig] = useState<ImportConfig | null>(null);
  const [statuses, setStatuses] = useState<ImportStatus[] | null>(null);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [includeSimilar, setIncludeSimilar] = useState(false);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [busy, setBusy] = useState<"read" | "check" | "import" | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch((e) => toast.error(e.message));
  }, []);

  const sheet = loaded?.sheets[sheetIndex];
  const rows = sheet?.rows ?? EMPTY;
  const hint = `${loaded?.filename ?? ""} ${sheet?.name ?? ""}`;
  const built = useMemo(() => (config ? buildImportRows(rows, config) : null), [rows, config]);

  const reset = () => {
    setLoaded(null);
    setSheetIndex(0);
    setConfig(null);
    setStatuses(null);
    setChoices({});
    setIncludeSimilar(false);
    setResult(null);
  };

  const pick = async (file?: File) => {
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      toast.error("Ukuran file maksimal 5 MB");
      return;
    }
    setBusy("read");
    try {
      const sheets = readSpreadsheet(file.name, new Uint8Array(await file.arrayBuffer()));
      const index = Math.max(
        sheets.findIndex((s) => s.rows.length > 1),
        0,
      );
      reset();
      setLoaded({ filename: file.name, sheets });
      setSheetIndex(index);
      setConfig(autoConfig(sheets[index].rows, `${file.name} ${sheets[index].name}`));
    } catch (e) {
      toast.error(e instanceof SpreadsheetError ? e.message : "File tidak bisa dibaca. Gunakan file CSV atau Excel (.xlsx).");
    } finally {
      setBusy(null);
    }
  };

  /** Pemetaan berubah → hasil pemeriksaan lama tidak berlaku lagi. */
  const changeConfig = (next: ImportConfig) => {
    setConfig(next);
    setStatuses(null);
  };
  const changeSheet = (index: number) => {
    if (!loaded) return;
    setSheetIndex(index);
    changeConfig(autoConfig(loaded.sheets[index].rows, `${loaded.filename} ${loaded.sheets[index].name}`));
  };

  const willImport = (status: ImportStatus | undefined) => !status || status === "new" || (status === "similar" && includeSimilar);
  const importRows = built && statuses ? built.rows.filter((_, i) => willImport(statuses[i])) : (built?.rows ?? []);
  const allNeeds = built ? categoryNeeds(built.rows) : [];
  const shownNeeds = categoryNeeds(importRows);
  const targetOf = (need: CategoryNeed) => choices[need.key] ?? String(matchCategory(need, categories)?.id ?? "new");

  const check = async () => {
    if (!built || !loaded) return;
    setBusy("check");
    try {
      const res = await api<{ statuses: ImportStatus[] }>("/api/admin/import/finance", {
        method: "POST",
        body: { commit: false, filename: loaded.filename, rows: built.rows },
      });
      setStatuses(res.statuses);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const commit = async () => {
    if (!built || !loaded) return;
    setBusy("import");
    try {
      const res = await api<Result>("/api/admin/import/finance", {
        method: "POST",
        body: {
          commit: true,
          filename: loaded.filename,
          includeSimilar,
          rows: built.rows,
          categories: allNeeds.map((n) => {
            const target = targetOf(n);
            return { kind: n.kind, name: n.name, target: target === "new" || target === "none" ? target : Number(target) };
          }),
        },
      });
      setResult(res);
      toast.success(`${res.inserted} transaksi diimpor`);
      fetchCategories()
        .then(setCategories)
        .catch(() => {});
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const back = (
    <Link href="/admin/kas" className="mb-4 inline-flex items-center gap-1 text-sm font-bold text-sky-300">
      <ChevronLeft className="size-4" aria-hidden="true" /> Kembali ke Kas
    </Link>
  );

  if (result) {
    const details = [
      result.duplicate > 0 && `${result.duplicate} transaksi sudah ada sebelumnya`,
      result.similarSkipped > 0 && `${result.similarSkipped} transaksi mirip dilewati`,
      result.created > 0 && `${result.created} kategori baru dibuat`,
    ].filter(Boolean);
    return (
      <div>
        {back}
        <Card className="space-y-4 text-center">
          <CircleCheck className="mx-auto size-12 text-emerald-300" aria-hidden="true" />
          <div>
            <h1 className="text-xl font-extrabold">Impor selesai</h1>
            <p className="mt-1 text-sky-200/80">{result.inserted} transaksi baru disimpan ke buku kas.</p>
          </div>
          {details.length > 0 && (
            <ul className="space-y-1 text-sm text-white/60">
              {details.map((d) => (
                <li key={String(d)}>{d}</li>
              ))}
            </ul>
          )}
          <div className="grid gap-2">
            <Link href="/admin/kas" className="card-brand inline-flex min-h-12 items-center justify-center rounded-2xl px-5 text-sm font-bold">
              Lihat buku kas
            </Link>
            <Button variant="ghost" onClick={reset}>
              Impor file lain
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const errors = built?.issues.filter((i) => i.level === "error") ?? [];
  const skipped = built?.issues.filter((i) => i.level === "skip") ?? [];
  const width = Math.max(0, ...rows.slice(0, 200).map((r) => r.length));
  const columnOptions = config
    ? [
        { value: "-1", label: "— Tidak ada —" },
        ...Array.from({ length: width }, (_, i) => {
          const header = cellText(rows[config.headerRow]?.[i]).trim();
          const sample = rows.slice(config.headerRow + 1, config.headerRow + 50).find((r) => cellText(r[i]).trim())?.[i];
          const example = sample === undefined ? "" : ` — contoh: ${cellText(sample).slice(0, 24)}`;
          return { value: String(i), label: `${columnLetter(i)} · ${header || "(tanpa judul)"}${example}` };
        }),
      ]
    : [];
  const counts = statuses
    ? (["new", "duplicate", "similar"] as const).map((s) => statuses.filter((x) => x === s).length)
    : [0, 0, 0];
  const tooMany = (built?.rows.length ?? 0) > MAX_IMPORT_ROWS;

  return (
    <div>
      {back}
      <PageHeader title="Impor kas" description="Masukkan banyak transaksi sekaligus dari file CSV atau Excel, misalnya buku kas lama atau ekspor aplikasi keuangan lain." />

      <input ref={fileRef} type="file" accept={ACCEPT} hidden onChange={(e) => pick(e.target.files?.[0])} />
      {!loaded ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy === "read"}
            className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-[24px] border-2 border-dashed border-white/15 text-sm text-white/70 transition-colors hover:border-gold-400 hover:text-white"
          >
            {busy === "read" ? <Loader2 className="size-7 animate-spin" aria-hidden="true" /> : <Upload className="size-7 text-gold-400" aria-hidden="true" />}
            <span className="font-bold">{busy === "read" ? "Membaca file…" : "Pilih file CSV atau Excel"}</span>
            <span className="text-xs text-white/45">.csv · .xlsx · maks. 5 MB</span>
          </button>
          <Card className="space-y-2 text-sm text-white/60">
            <p className="font-bold text-white/80">Yang bisa dibaca</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Satu baris per transaksi, dengan kolom tanggal dan nominal.</li>
              <li>Nominal di satu kolom (bertanda minus untuk pengeluaran) atau dua kolom pemasukan/pengeluaran.</li>
              <li>Baris judul laporan, saldo awal, dan total dilewati otomatis.</li>
              <li>File yang sama aman diimpor ulang: transaksi yang sudah ada tidak dobel.</li>
            </ul>
          </Card>
        </div>
      ) : (
        <Card className="flex items-center gap-3">
          <FileSpreadsheet className="size-6 shrink-0 text-gold-400" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{loaded.filename}</p>
            <p className="text-xs text-white/50">
              {rows.length} baris{loaded.sheets.length > 1 ? ` · ${loaded.sheets.length} lembar` : ""}
            </p>
          </div>
          <Button variant="ghost" className="min-h-10 px-3" onClick={() => fileRef.current?.click()} disabled={!!busy}>
            Ganti
          </Button>
        </Card>
      )}

      {loaded && config && built && (
        <div className="mt-4 space-y-4">
          <Card>
            <fieldset disabled={!!busy} className="space-y-4">
              <legend className="mb-3 font-bold">Cocokkan kolom</legend>
              {loaded.sheets.length > 1 && (
                <Field label="Lembar">
                  <Select
                    value={String(sheetIndex)}
                    onChange={(e) => changeSheet(Number(e.target.value))}
                    options={loaded.sheets.map((s, i) => ({ value: String(i), label: `${s.name} (${s.rows.length} baris)` }))}
                  />
                </Field>
              )}
              <Field label="Baris judul kolom" help="Nomor baris yang berisi judul seperti Tanggal, Keterangan, Nominal.">
                <TextInput
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={Math.max(rows.length, 1)}
                  value={config.headerRow + 1}
                  onChange={(e) => {
                    const n = Math.round(Number(e.target.value));
                    if (n >= 1 && n <= rows.length) changeConfig(autoConfig(rows, hint, n - 1));
                  }}
                />
              </Field>
              <Field label="Cara membaca pemasukan dan pengeluaran">
                <Select
                  value={config.kindMode}
                  onChange={(e) => {
                    const kindMode = e.target.value as KindMode;
                    const columns = { ...config.columns };
                    if (kindMode !== "split" && columns.amount < 0) columns.amount = columns.amountIn >= 0 ? columns.amountIn : columns.amountOut;
                    changeConfig({ ...config, kindMode, columns });
                  }}
                  options={KIND_MODES.map((m) => ({ value: m, label: KIND_MODE_LABELS[m] }))}
                />
              </Field>
              {fieldsFor(config.kindMode).map((field) => (
                <Field
                  key={field}
                  label={`${FIELD_LABELS[field]}${REQUIRED.has(field) ? "" : " (opsional)"}`}
                  help={field === "amountOut" ? undefined : FIELD_HELP[field]}
                >
                  <Select
                    value={String(config.columns[field])}
                    onChange={(e) => changeConfig({ ...config, columns: { ...config.columns, [field]: Number(e.target.value) } })}
                    options={columnOptions}
                  />
                </Field>
              ))}
              {config.columns.date >= 0 && (
                <Field label="Urutan tanggal" help="Untuk tanggal berupa angka seperti 05/03/2026.">
                  <Select
                    value={config.dateOrder}
                    onChange={(e) => changeConfig({ ...config, dateOrder: e.target.value === "mdy" ? "mdy" : "dmy" })}
                    options={[
                      { value: "dmy", label: "Hari/Bulan/Tahun (31/12/2026)" },
                      { value: "mdy", label: "Bulan/Hari/Tahun (12/31/2026)" },
                    ]}
                  />
                </Field>
              )}
            </fieldset>
          </Card>

          <Card className="space-y-3">
            <h2 className="font-bold">{statuses ? "Hasil pemeriksaan" : "Hasil pembacaan"}</h2>
            <dl className="grid grid-cols-2 gap-2 text-center">
              {(statuses
                ? [
                    { label: "Baru", value: counts[0], tone: "text-emerald-300" },
                    { label: "Sudah pernah diimpor", value: counts[1], tone: "text-white/70" },
                    { label: "Mirip data yang ada", value: counts[2], tone: "text-amber-200" },
                    { label: "Tidak terbaca", value: errors.length, tone: errors.length ? "text-rose-300" : "text-white/70" },
                  ]
                : [
                    { label: "Transaksi terbaca", value: built.rows.length, tone: "text-white" },
                    { label: "Tidak terbaca", value: errors.length, tone: errors.length ? "text-rose-300" : "text-white/70" },
                  ]
              ).map((s) => (
                <div key={s.label} className="rounded-2xl bg-white/5 px-1 py-2">
                  <dt className="text-[11px] text-white/50">{s.label}</dt>
                  <dd className={`text-lg font-bold tabular-nums ${s.tone}`}>{s.value}</dd>
                </div>
              ))}
            </dl>
            <p className="text-sm text-white/70 tabular-nums">
              {statuses ? "Akan diimpor: " : ""}
              <span className="font-bold text-emerald-300">+{rupiah(sum(importRows, "in"))}</span> ·{" "}
              <span className="font-bold text-rose-300">−{rupiah(sum(importRows, "out"))}</span>
            </p>
            {statuses && counts[2] > 0 && (
              <div>
                <Toggle
                  checked={includeSimilar}
                  onChange={setIncludeSimilar}
                  label={`Tetap impor ${counts[2]} transaksi yang mirip`}
                />
                <p className="text-xs text-white/45">
                  Mirip = tanggal, jenis, dan nominalnya sama dengan transaksi yang sudah tercatat (mungkin pernah dicatat manual).
                </p>
              </div>
            )}
            {tooMany && (
              <p className="rounded-2xl bg-rose-500/10 p-3 text-sm text-rose-200">
                Maksimal {MAX_IMPORT_ROWS.toLocaleString("id-ID")} transaksi sekali impor. Pecah file menjadi beberapa bagian.
              </p>
            )}
            {errors.length > 0 && (
              <details className="rounded-2xl bg-rose-500/10 p-3 text-sm">
                <summary className="cursor-pointer font-bold text-rose-200">{errors.length} baris tidak terbaca dan tidak akan diimpor</summary>
                <ul className="mt-2 max-h-60 space-y-1 overflow-y-auto text-rose-100/80">
                  {errors.slice(0, 200).map((i) => (
                    <li key={i.line}>
                      Baris {i.line}: {i.message}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {skipped.length > 0 && (
              <details className="rounded-2xl bg-white/5 p-3 text-sm">
                <summary className="cursor-pointer text-white/60">{skipped.length} baris dilewati (saldo, total, atau nominal 0)</summary>
                <ul className="mt-2 max-h-60 space-y-1 overflow-y-auto text-white/50">
                  {skipped.slice(0, 200).map((i) => (
                    <li key={i.line}>
                      Baris {i.line}: {i.message}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </Card>

          {statuses && shownNeeds.length > 0 && (
            <Card className="space-y-4">
              <div>
                <h2 className="font-bold">Kategori</h2>
                <p className="text-xs text-white/45">Kategori baru otomatis ditandai ZISWAF bila namanya mengandung zakat, infaq, sedekah, atau wakaf.</p>
              </div>
              {shownNeeds.map((need) => (
                <Field key={need.key} label={`${need.name} · ${kindLabel(need.kind)} · ${need.count} transaksi`}>
                  <Select
                    value={targetOf(need)}
                    disabled={!!busy}
                    onChange={(e) => setChoices((c) => ({ ...c, [need.key]: e.target.value }))}
                    options={[
                      { value: "new", label: "Buat kategori baru" },
                      { value: "none", label: "Tanpa kategori" },
                      ...categories
                        .filter((c) => c.kind === need.kind && (c.active || String(c.id) === targetOf(need)))
                        .map((c) => ({ value: String(c.id), label: `Masukkan ke: ${c.name}` })),
                    ]}
                  />
                </Field>
              ))}
            </Card>
          )}

          {built.rows.length > 0 && (
            <Card className="p-0">
              <h2 className="px-4 pt-4 font-bold">Contoh transaksi</h2>
              <ul className="divide-y divide-white/5">
                {built.rows.slice(0, PREVIEW_ROWS).map((r, i) => {
                  const status = statuses?.[i];
                  return (
                    <li key={r.ref} className={`flex items-start justify-between gap-2 px-4 py-3 ${willImport(status) ? "" : "opacity-50"}`}>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{r.description || r.category || kindLabel(r.kind)}</p>
                        <p className="truncate text-xs text-white/50">
                          {[formatDateStr(r.date), r.category, r.donor && `Donatur: ${r.donor}`].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`text-sm font-bold tabular-nums ${r.kind === "in" ? "text-emerald-300" : "text-rose-300"}`}>
                          {r.kind === "in" ? "+" : "−"}
                          {rupiah(r.amount)}
                        </p>
                        {status && <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] ${STATUS[status].cls}`}>{STATUS[status].label}</span>}
                      </div>
                    </li>
                  );
                })}
              </ul>
              {built.rows.length > PREVIEW_ROWS && (
                <p className="px-4 pb-4 text-xs text-white/45">dan {built.rows.length - PREVIEW_ROWS} transaksi lainnya</p>
              )}
            </Card>
          )}

          {statuses ? (
            <Button variant="gold" className="w-full" loading={busy === "import"} disabled={!importRows.length || tooMany} onClick={commit}>
              {importRows.length ? `Impor ${importRows.length} transaksi` : "Tidak ada transaksi baru"}
            </Button>
          ) : (
            <Button className="w-full" loading={busy === "check"} disabled={!built.rows.length || tooMany} onClick={check}>
              Periksa data
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
