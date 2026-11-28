import { PRAYER_LABELS, type DisplayState } from "@/lib/types";
import { nextPrayer } from "@/lib/prayer/schedule";
import { formatClock, formatDuration, formatGregorian } from "@/lib/time";
import { formatHijri, hijriCalendar } from "@/lib/hijri";

/** Jam dan hitung mundur dibedakan oleh satuan WITA dan keterangan "lagi". */
export function PrayerSidebar({ state, now }: { state: DisplayState; now: number }) {
  const { today, tomorrow } = state.prayer;
  const next = nextPrayer(now, today, tomorrow);
  const remaining = next.at - now;
  const soon = remaining < 10 * 60_000;
  const clock = formatClock(now);

  return (
    <aside className="card flex w-[520px] shrink-0 flex-col overflow-hidden rounded-2xl">
      <section aria-label="Waktu saat ini" className="px-8 py-6">
        <p className="flex items-center gap-2 leading-none font-bold tracking-[-0.05em] tabular-nums">
          <span className="text-[124px]">{clock.slice(0, 5)}</span>
          <span className="flex flex-col gap-2 text-muted">
            <span className="text-[42px]">:{clock.slice(6)}</span>
            <span className="text-[20px] font-semibold tracking-normal">WITA</span>
          </span>
        </p>
        <div className="mt-4 space-y-1 text-[23px] leading-tight font-medium">
          <p>{formatGregorian(now)}</p>
          <p className="text-muted">{formatHijri(now, hijriCalendar(state.settings))}</p>
        </div>
      </section>

      <section
        aria-label="Waktu sholat berikutnya"
        className={`flex flex-1 flex-col justify-center gap-6 px-8 py-6 ${soon ? "card-gold" : "card-brand text-white"}`}
      >
        <div>
          <h2 className="text-[40px] leading-tight font-semibold tracking-tight">Menuju {PRAYER_LABELS[next.key]}</h2>
          <p className={`mt-2 text-[24px] ${soon ? "" : "text-royal-200"}`}>
            {next.tomorrow ? "Besok pukul" : "Pukul"} {formatClock(next.at, false)} WITA
          </p>
        </div>
        <p className={`flex flex-wrap items-baseline gap-x-3 leading-none ${soon ? "" : "text-gold-300"}`}>
          <span className="text-[76px] font-bold tracking-tight tabular-nums">{formatDuration(remaining)}</span>
          <span className="text-[26px]">lagi</span>
        </p>
        {soon && <p className="text-[22px] font-semibold">Segera masuk waktu</p>}
      </section>
    </aside>
  );
}
