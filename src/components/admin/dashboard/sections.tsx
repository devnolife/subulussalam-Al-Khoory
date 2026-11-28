import Link from "next/link";
import type { ReactNode } from "react";
import { describeAudit } from "@/components/admin/audit-label";
import { canOpen } from "@/components/admin/menu";
import type { AgendaItem } from "@/lib/agenda";
import type { Dashboard, DashboardFinance } from "@/lib/dashboard";
import type { UpcomingIslamicDay } from "@/lib/islamic-days";
import { WEEKDAYS, weekdayOf } from "@/lib/kajian";
import { can, type Role } from "@/lib/permissions";
import { addDays, formatClock, formatDateStr, rupiah, shortMonthLabel, witaDateStr } from "@/lib/time";
import { ZISWAF_LABELS, type Announcement } from "@/lib/types";
import type { AuditEntry } from "@/lib/users";
import { CashFlowChart } from "./CashFlowChart";
import { Panel } from "./Panel";

const AMOUNT_TEXT = { in: "text-zamrud-300", out: "text-bata-300" } as const;
const SIGN = { in: "+", out: "−" } as const;

function Empty({ children }: { children: ReactNode }) {
  return <p className="py-4 text-sm leading-relaxed text-muted">{children}</p>;
}

export function CashFlowPanel({ finance }: { finance: DashboardFinance }) {
  const income = finance.series.reduce((sum, m) => sum + m.in, 0);
  const expense = finance.series.reduce((sum, m) => sum + m.out, 0);
  const range = finance.series.length ? `${finance.series[0].label} – ${finance.series[finance.series.length - 1].label}` : undefined;
  return (
    <Panel title="Arus kas 6 bulan terakhir" meta={range} action={{ href: "/admin/kas", label: "Buka kas" }}>
      {income === 0 && expense === 0 ? (
        <Empty>Belum ada transaksi pada periode ini.</Empty>
      ) : (
        <>
          <CashFlowChart series={finance.series} />
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
            <div>
              <dt className="text-muted">Total pemasukan</dt>
              <dd className={`mt-0.5 font-bold tabular-nums ${AMOUNT_TEXT.in}`}>{rupiah(income)}</dd>
            </div>
            <div>
              <dt className="text-muted">Total pengeluaran</dt>
              <dd className={`mt-0.5 font-bold tabular-nums ${AMOUNT_TEXT.out}`}>{rupiah(expense)}</dd>
            </div>
          </dl>
        </>
      )}
    </Panel>
  );
}

export function CategoriesPanel({ finance }: { finance: DashboardFinance }) {
  const totals = { in: finance.monthIn, out: finance.monthOut };
  const rows = finance.categories.slice(0, 5);
  return (
    <Panel title={`Kas per kategori · ${finance.monthLabel}`}>
      {rows.length === 0 ? (
        <Empty>Belum ada transaksi bulan ini.</Empty>
      ) : (
        <ul className="space-y-3">
          {rows.map((c) => {
            const share = totals[c.kind] > 0 ? Math.round((c.amount / totals[c.kind]) * 100) : 0;
            return (
              <li key={`${c.kind}:${c.name}`}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate font-semibold">{c.name}</span>
                  <span className={`shrink-0 font-bold tabular-nums ${AMOUNT_TEXT[c.kind]}`}>
                    {SIGN[c.kind]}
                    {rupiah(c.amount)}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.07]" aria-hidden="true">
                    <span className={`block h-full rounded-full ${c.kind === "in" ? "bg-zamrud-400" : "bg-bata-400"}`} style={{ width: `${share}%` }} />
                  </span>
                  <span className="shrink-0 text-xs text-white/55">
                    {c.kind === "in" ? "Masuk" : "Keluar"} · {share}%
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

export function RecentTransactionsPanel({ finance }: { finance: DashboardFinance }) {
  const rows = finance.recent.slice(0, 5);
  return (
    <Panel title="Transaksi terbaru" action={{ href: "/admin/kas", label: "Semua" }}>
      {rows.length === 0 ? (
        <Empty>Belum ada transaksi.</Empty>
      ) : (
        <ul className="divide-y divide-white/[0.06]">
          {rows.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{t.description || t.category || (t.kind === "in" ? "Pemasukan" : "Pengeluaran")}</p>
                <p className="truncate text-xs text-white/55">{[formatDateStr(t.date), t.category].filter(Boolean).join(" · ")}</p>
              </div>
              <span className={`shrink-0 text-sm font-bold tabular-nums ${AMOUNT_TEXT[t.kind]}`}>
                <span className="sr-only">{t.kind === "in" ? "Pemasukan " : "Pengeluaran "}</span>
                {SIGN[t.kind]}
                {rupiah(t.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function AgendaDate({ date }: { date: string | null }) {
  const cls = "w-16 shrink-0 text-sm font-semibold text-ungu-300";
  if (!date) return <span className={cls}>Rutin</span>;
  return (
    <time dateTime={date} className={cls}>
      <span className="block text-xs">{WEEKDAYS[weekdayOf(date)]}</span>
      {Number(date.slice(8, 10))} {shortMonthLabel(date)}
    </time>
  );
}

export function AgendaPanel({ items, today, role }: { items: AgendaItem[]; today: string; role: Role }) {
  const tomorrow = addDays(today, 1);
  return (
    <Panel
      title="Agenda masjid"
      action={canOpen(role, "/admin/kajian") ? { href: "/admin/kajian", label: "Kajian" } : null}
    >
      {items.length === 0 ? (
        <Empty>Belum ada agenda terjadwal. Isi petugas Jum&apos;at atau jadwal kajian agar tampil di sini dan di layar TV.</Empty>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((a) => {
            const when = a.date === today ? "Hari ini" : a.date === tomorrow ? "Besok" : null;
            const body = (
              <>
                <AgendaDate date={a.date} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-bold">{a.title}</span>
                    {when && <span className="text-xs font-semibold text-gold-300">{when}</span>}
                    {a.weekly && <span className="text-[11px] font-semibold text-ungu-200">Rutin pekanan</span>}
                  </span>
                  {a.detail && (
                    <span className={`mt-0.5 block text-sm ${a.pending ? "font-semibold text-gold-300" : "text-sky-200/80"}`}>{a.detail}</span>
                  )}
                  {(a.time || a.note) && (
                    <span className="mt-0.5 block text-xs text-white/55">{[a.time, a.note && `Tema: ${a.note}`].filter(Boolean).join(" · ")}</span>
                  )}
                </span>
              </>
            );
            const cls = "flex min-h-11 items-start gap-3 py-3";
            return (
              <li key={a.key}>
                {canOpen(role, a.href) ? (
                  <Link href={a.href} className={`${cls} transition-colors hover:bg-white/[0.06]`}>
                    {body}
                  </Link>
                ) : (
                  <div className={cls}>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

export function AnnouncementsPanel({ items, role }: { items: Announcement[]; role: Role }) {
  const shown = items.slice(0, 4);
  return (
    <Panel
      title="Pengumuman aktif"
      action={canOpen(role, "/admin/pengumuman") ? { href: "/admin/pengumuman", label: "Kelola" } : null}
    >
      {shown.length === 0 ? (
        <Empty>Tidak ada pengumuman aktif.</Empty>
      ) : (
        <ul className="divide-y divide-line">
          {shown.map((a) => (
            <li key={a.id} className="py-3">
              <p className="font-bold">{a.title}</p>
              {a.body && <p className="mt-1 line-clamp-2 text-sm text-sky-200/80">{a.body}</p>}
              <p className="mt-2 text-xs text-white/55">
                {[a.showTicker && "Teks berjalan", a.showPanel && "Panel", a.endsAt ? `s/d ${formatDateStr(a.endsAt)}` : "Tanpa batas waktu"]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </li>
          ))}
        </ul>
      )}
      {items.length > shown.length && <p className="mt-3 text-xs text-white/55">+{items.length - shown.length} pengumuman lainnya</p>}
    </Panel>
  );
}

function activityTime(iso: string, today: string): string {
  const ms = Date.parse(iso);
  const date = witaDateStr(ms);
  const clock = formatClock(ms, false);
  if (date === today) return clock;
  if (date === addDays(today, -1)) return `Kemarin ${clock}`;
  return `${Number(date.slice(8, 10))} ${shortMonthLabel(date)} ${clock}`;
}

export function ActivityPanel({ items, today }: { items: AuditEntry[]; today: string }) {
  return (
    <Panel title="Aktivitas pengurus" action={{ href: "/admin/riwayat", label: "Semua" }}>
      {items.length === 0 ? (
        <Empty>Belum ada aktivitas tercatat.</Empty>
      ) : (
        <ul className="divide-y divide-white/[0.06]">
          {items.map((e) => (
            <li key={e.id} className="flex items-center gap-3 py-2.5">
              <p className="min-w-0 flex-1 text-sm">
                <span className="font-bold">{e.name || `@${e.username}`}</span> <span className="text-sky-200/80">{describeAudit(e)}</span>
              </p>
              <time dateTime={e.at} className="shrink-0 text-xs text-white/55 tabular-nums">
                {activityTime(e.at, today)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function IslamicDaysPanel({ days }: { days: UpcomingIslamicDay[] }) {
  return (
    <Panel title="Hari besar Islam" meta="Menurut kalender Hijriah masjid">
      {days.length === 0 ? (
        <Empty>Tidak ada hari besar dalam setahun ke depan.</Empty>
      ) : (
        <ul className="divide-y divide-white/[0.06]">
          {days.map((d) => (
            <li key={d.key} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-bold">{d.name}</p>
                <p className="text-xs text-white/55">
                  {formatDateStr(d.date)} · {d.note}
                </p>
              </div>
              <span
                className={`shrink-0 text-xs font-semibold ${d.daysLeft === 0 ? "text-gold-300" : "text-ungu-300"}`}
              >
                {d.daysLeft === 0 ? "Hari ini" : d.daysLeft === 1 ? "Besok" : `${d.daysLeft} hari lagi`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function ZiswafPanel({ finance }: { finance: DashboardFinance }) {
  const any = finance.ziswaf.some((z) => z.yearIn || z.yearOut);
  return (
    <Panel title={`ZISWAF ${finance.year}`}>
      {!any ? (
        <Empty>
          Belum ada transaksi ZISWAF tahun ini. Tandai kategori sebagai zakat, infaq, sedekah, atau wakaf di{" "}
          <Link href="/admin/kas/kategori" className="font-bold text-sky-300 underline underline-offset-2">
            Kategori kas
          </Link>
          .
        </Empty>
      ) : (
        <ul className="divide-y divide-white/[0.06]">
          {finance.ziswaf.map((z) => (
            <li key={z.kind} className="py-2.5">
              <p className="text-sm font-bold">{ZISWAF_LABELS[z.kind]}</p>
              <p className="mt-0.5 flex flex-wrap gap-x-4 text-xs text-white/60">
                <span>
                  Diterima <span className={`font-bold tabular-nums ${AMOUNT_TEXT.in}`}>{rupiah(z.yearIn)}</span>
                </span>
                <span>
                  Disalurkan <span className={`font-bold tabular-nums ${AMOUNT_TEXT.out}`}>{rupiah(z.yearOut)}</span>
                </span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function ContentCountsPanel({ counts, role }: { counts: Dashboard["counts"]; role: Role }) {
  const rows = [
    { href: "/admin/pengumuman", label: "Pengumuman aktif", value: counts.announcements },
    { href: "/admin/kajian", label: "Kajian terjadwal", value: counts.kajian },
    { href: "/admin/slide", label: "Poster aktif", value: counts.slides },
    { href: "/admin/pembicara", label: "Pembicara", value: counts.speakers },
    { href: "/admin/pengurus", label: "Pengurus", value: counts.board },
    { href: "/admin/ayat", label: "Ayat dan hadis", value: counts.verses },
  ];
  const row = "flex min-h-11 items-center justify-between gap-3 text-sm";
  return (
    <Panel
      title="Konten layar"
      meta="Data aktif yang tampil di TV"
      action={can(role, "content") ? { href: "/admin/konten", label: "Semua" } : null}
    >
      <ul className="divide-y divide-line">
        {rows.map((r) => {
          const body = (
            <>
              <span>{r.label}</span>
              <span className="font-semibold tabular-nums">{r.value}</span>
            </>
          );
          return (
            <li key={r.href}>
              {canOpen(role, r.href) ? (
                <Link href={r.href} className={`${row} hover:bg-navy-800 hover:underline`}>
                  {body}
                </Link>
              ) : (
                <div className={row}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
