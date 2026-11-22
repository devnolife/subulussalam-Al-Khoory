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
      <ol className="grid h-[148px] grid-cols-7 gap-4">
        {PRAYER_KEYS.map((key) => {
          const Icon = PRAYER_ICONS[key];
          const isCurrent = key === current;
          const isNext = key === next.key && !next.tomorrow;
          const passed = !isCurrent && witaToMs(today.date, today.times[key]) <= now;
          const badge = isCurrent ? "Sekarang" : isNext ? "Berikutnya" : null;
          return (
            <li
              key={key}
              className={`relative flex flex-col justify-between rounded-[28px] px-6 pt-5 pb-4.5 ${
                isCurrent ? "card-brand" : "card"
              } ${isNext ? "outline-gold" : ""} ${passed ? "opacity-50" : ""}`}
            >
              {badge && (
                <span
                  className={`absolute -top-3.5 right-5 rounded-full px-3.5 py-1.5 text-[14px] leading-none font-extrabold tracking-[0.08em] uppercase ${
                    isCurrent ? "bg-white text-royal-600" : "bg-gold-400 text-navy-950"
                  }`}
                >
                  {badge}
                </span>
              )}
              <span className="flex items-center gap-3 text-[24px] font-bold">
                <span
                  className={`grid size-11 shrink-0 place-items-center rounded-[14px] ${
                    isCurrent ? "bg-white/18 text-gold-400" : isNext ? "bg-gold-400 text-navy-950" : "bg-white/10 text-sky-200"
                  }`}
                >
                  <Icon className="size-6" strokeWidth={2} aria-hidden="true" />
                </span>
                {PRAYER_LABELS[key]}
              </span>
              <span
                className={`text-[56px] leading-none font-extrabold tracking-[-0.035em] tabular-nums ${isNext ? "text-gold-400" : ""}`}
              >
                {today.times[key]}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
