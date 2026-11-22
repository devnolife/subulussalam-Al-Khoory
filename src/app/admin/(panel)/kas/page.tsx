"use client";

import { CrudPage } from "@/components/admin/CrudPage";
import { Card } from "@/components/admin/ui";
import { formatDateStr, rupiah, witaDateStr } from "@/lib/time";
import type { FinanceEntry } from "@/lib/types";

export default function KasAdmin() {
  return (
    <CrudPage<FinanceEntry>
      resource="finance"
      title="Kas & Infaq"
      description="Catat pemasukan dan pengeluaran. Saldo dihitung otomatis."
      defaults={() => ({ date: witaDateStr(Date.now()), kind: "in", amount: "", description: "" })}
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
        { name: "amount", label: "Nominal (Rp)", type: "number", placeholder: "500000" },
        { name: "description", label: "Keterangan", type: "text", placeholder: "Kotak amal Jum'at" },
      ]}
      header={(items) => {
        const balance = items.reduce((s, r) => s + (r.kind === "in" ? r.amount : -r.amount), 0);
        return (
          <Card className="card-brand relative mb-4 overflow-hidden">
            <div className="pattern pattern-fade absolute inset-0" />
            <p className="relative text-sm font-bold text-sky-100">Saldo kas saat ini</p>
            <p className="relative mt-1 text-3xl font-extrabold tracking-[-0.02em] tabular-nums">{rupiah(balance)}</p>
          </Card>
        );
      }}
      renderItem={(r) => (
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium">{r.description || (r.kind === "in" ? "Pemasukan" : "Pengeluaran")}</p>
            <p className="text-xs text-white/50">{formatDateStr(r.date)}</p>
          </div>
          <p className={`shrink-0 font-bold tabular-nums ${r.kind === "in" ? "text-emerald-300" : "text-rose-300"}`}>
            {r.kind === "in" ? "+" : "−"}
            {rupiah(r.amount)}
          </p>
        </div>
      )}
    />
  );
}
