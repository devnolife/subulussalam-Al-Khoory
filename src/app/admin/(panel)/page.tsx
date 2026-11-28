import Link from "next/link";
import { redirect } from "next/navigation";
import { BellRing } from "lucide-react";
import { MosqueCover } from "@/components/MosqueCover";
import { AutoRefresh } from "@/components/admin/dashboard/AutoRefresh";
import { Stat } from "@/components/admin/dashboard/Panel";
import { NextPrayerChip, PrayerTodayCard } from "@/components/admin/dashboard/PrayerCard";
import { ScreensCard } from "@/components/admin/dashboard/ScreensCard";
import {
  ActivityPanel,
  AgendaPanel,
  AnnouncementsPanel,
  CashFlowPanel,
  CategoriesPanel,
  ContentCountsPanel,
  IslamicDaysPanel,
  RecentTransactionsPanel,
  ZiswafPanel,
} from "@/components/admin/dashboard/sections";
import { canOpen } from "@/components/admin/menu";
import { currentUser } from "@/lib/auth";
import { getDashboard } from "@/lib/dashboard";
import { can } from "@/lib/permissions";
import { rupiah } from "@/lib/time";

const SHORTCUTS = [
  { href: "/admin/kas", label: "Kas masjid" },
  { href: "/admin/kas/impor", label: "Impor transaksi" },
  { href: "/admin/pengumuman", label: "Pengumuman" },
  { href: "/admin/kajian", label: "Jadwal kajian" },
  { href: "/admin/remote", label: "Remote TV" },
  { href: "/admin/kamera", label: "Siaran kamera" },
];

/** Beranda panel pengurus: ringkasan masjid hari ini, isinya menyesuaikan peran akun. */
export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) redirect("/admin/login");
  const { role } = user;
  const d = await getDashboard(role);
  const f = d.finance;
  const shortcuts = SHORTCUTS.filter((s) => canOpen(role, s.href));
  const linkIf = (href: string) => (canOpen(role, href) ? href : null);

  return (
    <>
      <AutoRefresh today={d.today} />
      <header className="mb-4 overflow-hidden rounded-2xl rounded-tr-[3.5rem]">
        <MosqueCover variant="dashboard">
          <h1 className="text-2xl leading-tight font-bold tracking-tight sm:text-3xl lg:text-4xl">Ringkasan masjid</h1>
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm leading-snug">
            <span className="font-semibold">{d.gregorian}</span>
            <span className="text-ungu-200">{d.hijri}</span>
          </p>
          {d.prayer && <NextPrayerChip prayer={d.prayer} serverNow={d.now} className="mt-2 xl:hidden" />}
        </MosqueCover>
      </header>

      {d.emergency.active && (
        <section role="status" className="card-bata mb-6 flex flex-wrap items-start gap-3 rounded-[24px] p-4">
          <BellRing className="mt-0.5 size-5 shrink-0 text-bata-200" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-bold">Pesan darurat sedang tampil di layar TV</p>
            {d.emergency.text && <p className="mt-1 text-sm whitespace-pre-line text-sky-100">{d.emergency.text}</p>}
          </div>
          {canOpen(role, "/admin/remote") && (
            <Link href="/admin/remote" className="flex min-h-11 items-center rounded-full bg-white/15 px-4 text-sm font-bold hover:bg-white/25">
              Kelola
            </Link>
          )}
        </section>
      )}

      <section aria-label="Ringkasan" className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line xl:grid-cols-4">
        {f ? (
          <>
            <Stat label="Saldo kas" value={rupiah(f.balance)} tone="zamrud" href="/admin/kas" />
            <Stat label="Pemasukan bulan ini" value={rupiah(f.monthIn)} valueClassName="text-zamrud-300" href="/admin/kas" />
            <Stat label="Pengeluaran bulan ini" value={rupiah(f.monthOut)} valueClassName="text-bata-300" href="/admin/kas" />
            <Stat label="Donatur bulan ini" value={`${f.monthDonors} orang`} href="/admin/kas" />
          </>
        ) : (
          <>
            <Stat label="Pengumuman aktif" value={String(d.counts.announcements)} tone={d.counts.announcements ? "bata" : "neutral"} href={linkIf("/admin/pengumuman")} />
            <Stat label="Kajian terjadwal" value={String(d.counts.kajian)} href={linkIf("/admin/kajian")} />
            <Stat label="Poster aktif" value={String(d.counts.slides)} href={linkIf("/admin/slide")} />
            <Stat label="Pengurus" value={String(d.counts.board)} href={linkIf("/admin/pengurus")} />
          </>
        )}
      </section>

      {shortcuts.length > 0 && (
        <nav aria-label="Pintasan" className="mt-3 grid grid-cols-2 gap-x-3 sm:flex sm:flex-wrap sm:gap-x-5 lg:hidden">
          {shortcuts.map(({ href, label }) => (
            <Link key={href} href={href} className="flex min-h-11 items-center text-sm font-semibold text-sky-200 underline underline-offset-4 hover:text-white">
              {label}
            </Link>
          ))}
        </nav>
      )}

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3 xl:items-start">
        <div className="min-w-0 space-y-5 xl:col-span-2">
          {f && (
            <>
              <CashFlowPanel finance={f} />
              {(f.recent.length > 0 || f.categories.length > 0) && (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <CategoriesPanel finance={f} />
                  <RecentTransactionsPanel finance={f} />
                </div>
              )}
            </>
          )}
          <AgendaPanel items={d.agenda} today={d.today} role={role} />
          <AnnouncementsPanel items={d.announcements} role={role} />
          {d.activity && <ActivityPanel items={d.activity} today={d.today} />}
        </div>
        <aside aria-label="Hari ini" className="grid min-w-0 content-start gap-5 md:grid-cols-2 xl:grid-cols-1">
          <PrayerTodayCard prayer={d.prayer} serverNow={d.now} city={d.city} />
          {d.screens && <ScreensCard initial={d.screens} serverNow={d.now} />}
          <IslamicDaysPanel days={d.islamicDays} />
          {f && <ZiswafPanel finance={f} />}
          {f && can(role, "content") && <ContentCountsPanel counts={d.counts} role={role} />}
        </aside>
      </div>
    </>
  );
}
