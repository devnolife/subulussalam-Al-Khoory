import { PRAYER_KEYS, PRAYER_LABELS, type DisplayState } from "@/lib/types";
import { currentPrayer, nextPrayer } from "@/lib/prayer/schedule";
import { witaToMs } from "@/lib/time";
import { PRAYER_ICONS } from "./prayerIcons";

/** Jadwal sholat hari ini dalam satu baris; waktu yang sudah lewat diredupkan. */
export function PrayerStrip({ state, now }: { state: DisplayState; now: number }) {
  const { today, tomorrow } = state.prayer;
  const next = nextPrayer(now, today, tomorrow);
  const current = currentPrayer(now, today);

  return (
    <section aria-label="Jadwal sholat hari ini" className="shrink-0 px-14">
      <ol className="card grid h-[148px] grid-cols-7 divide-x divide-line overflow-hidden rounded-2xl">
        {PRAYER_KEYS.map((key) => {
          const Icon = PRAYER_ICONS[key];
          const isCurrent = key === current;
          const isNext = key === next.key && !next.tomorrow;
          const passed = !isCurrent && witaToMs(today.date, today.times[key]) <= now;
          const badge = isCurrent ? "Sekarang" : isNext ? "Berikutnya" : null;
          return (
            <li
              key={key}
              aria-current={isCurrent ? "time" : undefined}
              className={`flex min-w-0 flex-col justify-between px-5 py-5 ${
                isCurrent ? "card-brand text-white" : isNext ? "outline-gold bg-navy-800 text-gold-300" : passed ? "text-muted" : ""
              }`}
            >
              <span className="flex items-center justify-between gap-2 text-[25px] font-semibold">
                {PRAYER_LABELS[key]}
                {badge ? (
                  <span className={`rounded-md px-2 py-1.5 text-[17px] leading-none font-bold ${isCurrent ? "bg-white text-royal-700" : "bg-gold-400 text-navy-950"}`}>
                    {badge}
                  </span>
                ) : <Icon className="size-6" strokeWidth={1.8} aria-hidden="true" />}
              </span>
              <span className="text-[58px] leading-none font-bold tracking-[-0.045em] tabular-nums">
                {today.times[key]}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
