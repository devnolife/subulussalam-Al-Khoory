"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronRight, Images, Megaphone, Mic, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { can } from "@/lib/permissions";
import { formatDateStr, rupiah } from "@/lib/time";
import type { AdminSummary } from "@/lib/types";
import { api } from "./api";
import { useAdminUser } from "./AdminUser";

function Stat({ href, icon: Icon, label, value }: { href: string; icon: LucideIcon; label: string; value: number }) {
  return (
    <Link
      href={href}
      className="card flex flex-col gap-1 rounded-[20px] px-3 py-3 transition-[scale,background-color] duration-150 hover:bg-white/10 active:scale-[0.97]"
    >
      <Icon className="size-4.5 text-gold-400" aria-hidden="true" />
      <span className="text-2xl leading-none font-extrabold tabular-nums">{value}</span>
      <span className="text-xs text-white/55">{label}</span>
    </Link>
  );
}

/** Ringkasan kas dan konten aktif di beranda; bagian yang tidak boleh dilihat peran ini tidak tampil. */
export function SummaryCards() {
  const { role } = useAdminUser();
  const relevant = can(role, "finance") || can(role, "content");
  const [data, setData] = useState<AdminSummary | null>(null);

  useEffect(() => {
    if (!relevant) return;
    let alive = true;
    api<AdminSummary>("/api/admin/summary")
      .then((d) => {
        if (alive) setData(d);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [relevant]);

  if (!data || (!data.finance && !data.content)) return null;
  const { finance, content } = data;

  return (
    <section className="space-y-3" aria-label="Ringkasan">
      {finance && (
        <Link
          href="/admin/kas"
          className="card-zamrud relative block overflow-hidden rounded-[24px] p-4 transition-[scale] duration-150 active:scale-[0.98]"
        >
         <p className="relative flex items-center gap-2 text-sm font-bold text-sky-100">
            <Wallet className="size-4 text-gold-400" aria-hidden="true" /> Saldo kas
            <ChevronRight className="ml-auto size-4 text-white/40" aria-hidden="true" />
          </p>
          <p className="relative mt-1 text-2xl font-extrabold tracking-[-0.02em] tabular-nums">{rupiah(finance.balance)}</p>
          <p className="relative mt-1 text-sm text-sky-100/80 tabular-nums">
            {finance.monthLabel}: <span className="font-bold text-white">+{rupiah(finance.monthIn)}</span> ·{" "}
            <span className="font-bold text-bata-200">−{rupiah(finance.monthOut)}</span>
          </p>
          {finance.monthDonors > 0 && (
            <p className="relative mt-0.5 text-xs text-sky-100/70">{finance.monthDonors} donatur tercatat bulan ini</p>
          )}
        </Link>
      )}
      {content && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Stat href="/admin/pengumuman" icon={Megaphone} label="Pengumuman aktif" value={content.announcements} />
            <Stat href="/admin/kajian" icon={BookOpen} label="Kajian aktif" value={content.kajian} />
            <Stat href="/admin/slide" icon={Images} label="Slide aktif" value={content.slides} />
          </div>
          <Link
            href="/admin/jumat"
            className="card flex items-center gap-3 rounded-[20px] px-4 py-3 text-sm transition-[scale,background-color] duration-150 hover:bg-white/10 active:scale-[0.98]"
          >
            <Mic className="size-5 shrink-0 text-gold-400" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block font-bold">Jumat berikutnya</span>
              <span className="block truncate text-white/55">
                {content.nextJumat
                  ? `${formatDateStr(content.nextJumat.date)} · ${content.nextJumat.khatib || "Khatib belum diisi"}`
                  : "Belum dijadwalkan"}
              </span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-white/30" aria-hidden="true" />
          </Link>
        </>
      )}
    </section>
  );
}
