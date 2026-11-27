"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { CrudPage } from "@/components/admin/CrudPage";
import { ZISWAF_KINDS, ZISWAF_LABELS, type FinanceCategory } from "@/lib/types";

export default function KategoriKasAdmin() {
  return (
    <CrudPage<FinanceCategory>
      resource="finance_categories"
      title="Kategori kas"
      description="Tandai jenis ZISWAF agar penerimaan dan penyalurannya terekap di layar. Nonaktifkan kategori yang tidak dipakai lagi; menghapusnya membuat transaksi lama menjadi tanpa kategori."
      defaults={() => ({ name: "", kind: "in", ziswaf: "", active: true, sort: 0 })}
      fields={[
        { name: "name", label: "Nama kategori", type: "text", placeholder: "Kotak amal Jumat" },
        {
          name: "kind",
          label: "Untuk",
          type: "select",
          options: [
            { value: "in", label: "Pemasukan" },
            { value: "out", label: "Pengeluaran" },
          ],
        },
        {
          name: "ziswaf",
          label: "Jenis ZISWAF",
          type: "select",
          options: [{ value: "", label: "Bukan ZISWAF" }, ...ZISWAF_KINDS.map((k) => ({ value: k, label: ZISWAF_LABELS[k] }))],
          help: "Pemasukan dihitung sebagai penerimaan, pengeluaran sebagai penyaluran.",
        },
        { name: "active", label: "Aktif (bisa dipilih saat mencatat)", type: "bool" },
        { name: "sort", label: "Urutan", type: "number" },
      ]}
      header={() => (
        <Link href="/admin/kas" className="mb-4 inline-flex items-center gap-1 text-sm font-bold text-sky-300">
          <ChevronLeft className="size-4" aria-hidden="true" /> Kembali ke Kas
        </Link>
      )}
      renderItem={(c) => (
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-medium">
            <span className="truncate">{c.name}</span>
            {!c.active && <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/60">Nonaktif</span>}
          </p>
          <p className="text-xs text-white/50">
            {c.kind === "in" ? "Pemasukan" : "Pengeluaran"}
            {c.ziswaf ? ` · ${ZISWAF_LABELS[c.ziswaf]} (${c.kind === "in" ? "penerimaan" : "penyaluran"})` : ""}
          </p>
        </div>
      )}
    />
  );
}
