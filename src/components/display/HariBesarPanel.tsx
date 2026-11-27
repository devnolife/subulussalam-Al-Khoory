"use client";

import { useMemo, type CSSProperties } from "react";
import { CalendarClock, MoonStar, Sparkles } from "lucide-react";
import type { DisplayState } from "@/lib/types";
import { HIJRI_MONTHS, hijriCalendar } from "@/lib/hijri";
import { upcomingIslamicDays } from "@/lib/islamic-days";
import { formatGregorian, witaDateStr, witaToMs } from "@/lib/time";
import { Chip, PanelHeader } from "./ui";

const delay = (step: number): CSSProperties => ({ animationDelay: `${step * 100}ms` });

const countdown = (days: number) => (days === 0 ? "Hari ini" : days === 1 ? "Besok" : `${days} hari lagi`);

export function HariBesarPanel({ state, now }: { state: DisplayState; now: number }) {
  const today = witaDateStr(now);
  const { hijriOffset, hijriMonths } = state.settings;
  const events = useMemo(
    () => upcomingIslamicDays(witaToMs(today, "12:00"), hijriCalendar({ hijriOffset, hijriMonths }), 4),
    [today, hijriOffset, hijriMonths],
  );
  const [next, ...rest] = events;
  if (!next) return null;
  const hijriLabel = (e: typeof next) => `${e.hijri.day} ${HIJRI_MONTHS[e.hijri.month - 1]} ${e.hijri.year} H`;

  return (
    <div className="flex size-full flex-col p-10">
      <PanelHeader icon={MoonStar} title="Hari besar Islam" meta="Perkiraan kalender Hijriah" tone="ungu" />
      <div className="grid min-h-0 flex-1 grid-cols-[1.15fr_1fr] gap-5">
        <article
          className="card-ungu rise relative flex min-h-0 flex-col justify-between overflow-hidden rounded-[28px] p-8"
          style={delay(1)}
        >
          <div className="relative">
            <Chip icon={Sparkles} tone="gold">
              {next.daysLeft === 0 ? "Hari ini" : "Terdekat"}
            </Chip>
            <h3 className="mt-6 line-clamp-2 text-[54px] leading-[1.05] font-extrabold tracking-[-0.025em]">{next.name}</h3>
            <p className="mt-4 text-[28px] font-bold text-gold-400">{hijriLabel(next)}</p>
            <p className="mt-1 text-[24px] font-medium text-sky-100/85">{formatGregorian(witaToMs(next.date, "12:00"))}</p>
          </div>
          <div className="relative flex items-end gap-4">
            {next.daysLeft > 1 ? (
              <>
                <span className="text-[120px] leading-[0.85] font-extrabold tracking-[-0.05em] tabular-nums">{next.daysLeft}</span>
                <span className="pb-2 text-[32px] font-bold text-sky-100/90">hari lagi</span>
              </>
            ) : (
              <span className="text-[84px] leading-none font-extrabold tracking-[-0.04em]">{countdown(next.daysLeft)}</span>
            )}
          </div>
        </article>
        <ul className="flex min-h-0 flex-col gap-4">
          {rest.map((e, idx) => (
            <li key={e.key} className="tile rise flex min-h-0 flex-1 items-center gap-5 rounded-[24px] px-7 py-4" style={delay(idx + 2)}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[30px] leading-tight font-bold">{e.name}</p>
                <p className="mt-1.5 truncate text-[20px] font-semibold text-gold-400">{hijriLabel(e)}</p>
                <p className="truncate text-[19px] text-sky-200/75">{formatGregorian(witaToMs(e.date, "12:00"))}</p>
              </div>
              <Chip icon={CalendarClock} className="shrink-0">
                {countdown(e.daysLeft)}
              </Chip>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
