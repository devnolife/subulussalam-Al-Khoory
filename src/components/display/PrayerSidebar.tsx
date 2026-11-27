import { BellRing, CalendarDays, MoonStar } from "lucide-react";
import { PRAYER_LABELS, type DisplayState } from "@/lib/types";
import { nextPrayer, previousPrayerAt } from "@/lib/prayer/schedule";
import { formatClock, formatDuration, formatGregorian } from "@/lib/time";
import { formatHijri, hijriCalendar } from "@/lib/hijri";
import { PRAYER_ICONS } from "./prayerIcons";
import { ProgressRing } from "./ui";

/** Kolom kanan: jam besar dan kartu waktu sholat berikutnya dengan cincin progres. */
export function PrayerSidebar({ state, now }: { state: DisplayState; now: number }) {
  const { today, tomorrow } = state.prayer;
  const next = nextPrayer(now, today, tomorrow);
  const from = previousPrayerAt(now, today);
  const remaining = next.at - now;
  const progress = (now - from) / Math.max(1, next.at - from);
  const soon = remaining < 10 * 60_000;
  const clock = formatClock(now);
  const NextIcon = PRAYER_ICONS[next.key];

  return (
    <aside className="flex w-[520px] shrink-0 flex-col gap-5">
      <section aria-label="Waktu saat ini" className="card rounded-[32px] px-9 pt-8 pb-7">
        <div className="flex items-start gap-3">
          <p className="text-[132px] leading-[0.8] font-extrabold tracking-[-0.05em] tabular-nums">{clock.slice(0, 5)}</p>
          <div className="flex flex-col items-start gap-2.5 pt-1">
            <span className="text-[40px] leading-none font-bold text-sky-200/60 tabular-nums">{clock.slice(6)}</span>
            <span className="rounded-full bg-gold-400 px-3 py-1.5 text-[16px] leading-none font-extrabold tracking-[0.06em] text-navy-950">
              WITA
            </span>
          </div>
        </div>
        <div className="mt-7 space-y-3 text-[23px] font-semibold">
          <p className="flex items-center gap-3">
            <CalendarDays className="size-6.5 shrink-0 text-gold-400" aria-hidden="true" />
            {formatGregorian(now)}
          </p>
          <p className="flex items-center gap-3 text-sky-200/80">
            <MoonStar className="size-6.5 shrink-0 text-gold-400" aria-hidden="true" />
            {formatHijri(now, hijriCalendar(state.settings))}
          </p>
        </div>
      </section>

      <section
        aria-label="Waktu sholat berikutnya"
        className={`relative flex flex-1 flex-col justify-between overflow-hidden rounded-[32px] p-8 ${soon ? "card-gold" : "card-brand"}`}
      >
        <div className="relative flex items-center gap-6">
          <ProgressRing
            size={140}
            stroke={10}
            progress={progress}
            trackClassName={soon ? "text-navy-950/15" : "text-white/15"}
            barClassName={soon ? "text-navy-950" : "text-gold-400"}
          >
            <NextIcon className="size-13" strokeWidth={1.75} aria-hidden="true" />
          </ProgressRing>
          <div className="min-w-0">
            <p className="text-[18px] font-extrabold tracking-[0.16em] uppercase opacity-70">Waktu berikutnya</p>
            <p className="mt-2 text-[54px] leading-none font-extrabold tracking-[-0.025em]">
              {PRAYER_LABELS[next.key]}
              {next.tomorrow && <span className="ml-2 text-[24px] font-bold opacity-70">besok</span>}
            </p>
            <p className="mt-3 flex items-center gap-2 text-[22px] font-semibold opacity-85">
              <BellRing className="size-5.5" aria-hidden="true" />
              Pukul {formatClock(next.at, false)} WITA
            </p>
          </div>
        </div>
        <div className="relative">
          <p className="text-[19px] font-bold opacity-70">{soon ? "Segera masuk waktu" : "Hitung mundur"}</p>
          <p className="mt-1 text-[96px] leading-[0.9] font-extrabold tracking-[-0.045em] tabular-nums">
            −{formatDuration(remaining)}
          </p>
        </div>
      </section>
    </aside>
  );
}
