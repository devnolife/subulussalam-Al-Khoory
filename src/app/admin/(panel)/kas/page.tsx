"use client";

import Link from "next/link";
import { ChevronRight, Tags } from "lucide-react";
import { CrudPage, type Lookups } from "@/components/admin/CrudPage";
import { Card } from "@/components/admin/ui";
import { formatDateStr, rupiah, witaDateStr } from "@/lib/time";
import { ZISWAF_LABELS, type FinanceCategory, type FinanceEntry } from "@/lib/types";

const categoriesOf = (l: Lookups) => (l.finance_categories ?? []) as unknown as FinanceCategory[];
const today = () => witaDateStr(Date.now());
const categoryLabel = (c: FinanceCategory) => {
  const tag = c.ziswaf ? ZISWAF_LABELS[c.ziswaf] : "";
  return tag && !c.name.toLowerCase().includes(tag.toLowerCase()) ? `${c.name} (${tag})` : c.name;
};

export default function KasAdmin() {
  return (
    <CrudPage<FinanceEntry>
      resource="finance"
      title="Kas & Infaq"
      description="Catat pemasukan dan pengeluaran. Saldo dihitung otomatis."
      lookups={["finance_categories"]}
      defaults={() => ({ date: today(), kind: "in", categoryId: "", amount: "", description: "", donor: "", showDonor: false })}
      fields={[
        { name: "date", label: "Tanggal", type: "date" },
        {
          name: "kind",
          label: "Jenis",
          type: "select",
          options: [
            { value: "in", label: "Pemasukan" },
            { value: "out", label: "Pengeluaran" },
          ],
        },
        {
          name: "categoryId",
          label: "Kategori",
          type: "select",
          options: (record, lookups) => [
            { value: "", label: "Tanpa kategori" },
            ...categoriesOf(lookups)
              .filter((c) => c.kind === record.kind && (c.active || c.id === Number(record.categoryId)))
              .map((c) => ({ value: String(c.id), label: categoryLabel(c) })),
          ],
        },
        { name: "amount", label: "Nominal (Rp)", type: "number", placeholder: "500000" },
        { name: "description", label: "Keterangan", type: "text", placeholder: "Kotak amal Jum'at" },
        {
          name: "donor",
          label: "Nama donatur (opsional)",
          type: "text",
          placeholder: "Bapak Ahmad",
          help: "Untuk apresiasi donatur di layar TV.",
          show: (r) => r.kind === "in",
        },
        {
          name: "showDonor",
          label: "Tampilkan nama di layar (bila tidak: Hamba Allah)",
          type: "bool",
          show: (r) => r.kind === "in" && !!String(r.donor ?? "").trim(),
        },
      ]}
      prepare={(p, lookups) => {
        const out = { ...p };
        if (p.kind === "out") {
          out.donor = "";
          out.showDonor = false;
        }
        const category = categoriesOf(lookups).find((c) => c.id === Number(p.categoryId));
        if (category && category.kind !== p.kind) out.categoryId = "";
        return out;
      }}
      header={(items) => {
        const month = today().slice(0, 7);
        const balance = items.reduce((s, r) => s + (r.kind === "in" ? r.amount : -r.amount), 0);
        const sum = (kind: "in" | "out") =>
          items.filter((r) => r.kind === kind && r.date.startsWith(month)).reduce((s, r) => s + r.amount, 0);
        const donors = new Set(
          items
            .filter((r) => r.kind === "in" && r.date.startsWith(month) && r.donor?.trim())
            .map((r) => r.donor.trim().toLowerCase()),
        ).size;
        return (
          <div className="mb-4 space-y-3">
            <Card className="card-brand relative overflow-hidden">
              <div className="pattern pattern-fade absolute inset-0" />
              <p className="relative text-sm font-bold text-sky-100">Saldo kas saat ini</p>
              <p className="relative mt-1 text-3xl font-extrabold tracking-[-0.02em] tabular-nums">{rupiah(balance)}</p>
              <p className="relative mt-2 text-sm text-sky-100/80 tabular-nums">
                Bulan ini <span className="font-bold text-emerald-300">+{rupiah(sum("in"))}</span> ·{" "}
                <span className="font-bold text-rose-300">−{rupiah(sum("out"))}</span>
              </p>
              {donors > 0 && <p className="relative mt-0.5 text-xs text-sky-100/70">{donors} donatur tercatat bulan ini</p>}
            </Card>
            <Link
              href="/admin/kas/kategori"
              className="card flex items-center gap-3 rounded-[20px] px-4 py-3 text-sm font-bold transition-[scale,background-color] duration-150 hover:bg-white/10 active:scale-[0.98]"
            >
              <Tags className="size-5 text-gold-400" aria-hidden="true" />
              <span className="flex-1">Kategori kas &amp; ZISWAF</span>
              <ChevronRight className="size-5 text-white/30" aria-hidden="true" />
            </Link>
          </div>
        );
      }}
      renderItem={(r, lookups) => {
        const category = categoriesOf(lookups).find((c) => c.id === r.categoryId);
        const donor = r.kind === "in" && r.donor ? (r.showDonor ? r.donor : `${r.donor} (tampil: Hamba Allah)`) : "";
        return (
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-medium">
                {r.description || category?.name || (r.kind === "in" ? "Pemasukan" : "Pengeluaran")}
              </p>
              <p className="text-xs text-white/50">{[formatDateStr(r.date), category?.name].filter(Boolean).join(" · ")}</p>
              {donor && <p className="truncate text-xs text-sky-200/70">Donatur: {donor}</p>}
            </div>
            <p className={`shrink-0 font-bold tabular-nums ${r.kind === "in" ? "text-emerald-300" : "text-rose-300"}`}>
              {r.kind === "in" ? "+" : "−"}
              {rupiah(r.amount)}
            </p>
          </div>
        );
      }}
    />
  );
}
