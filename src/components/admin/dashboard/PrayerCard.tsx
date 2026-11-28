"use client";

import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import { nextPrayer } from "@/lib/prayer/schedule";
import { formatClock, formatDuration } from "@/lib/time";
import { PRAYER_KEYS, PRAYER_LABELS, type DayTimes } from "@/lib/types";

type Prayer = { today: DayTimes; tomorrow: DayTimes };

/** Jam yang berdetak tiap detik; mulai dari waktu server agar hasil render server dan browser sama. */
function useNow(serverNow: number): number {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/** Sholat berikutnya dan hitung mundurnya, untuk kepala beranda di layar kecil. */
export function NextPrayerChip({ prayer, serverNow, className = "" }: { prayer: Prayer; serverNow: number; className?: string }) {
  const now = useNow(serverNow);
  const next = nextPrayer(now, prayer.today, prayer.tomorrow);
  return (
    <p className={`inline-flex w-fit items-center gap-2 text-sm font-semibold text-gold-300 ${className}`}>
      <Clock3 className="size-4 shrink-0" aria-hidden="true" />
      <span>
        {PRAYER_LABELS[next.key]} {formatClock(next.at, false)} ·{" "}
        <span className="font-extrabold tabular-nums">{formatDuration(next.at - now)} lagi</span>
      </span>
    </p>
  );
}

export function PrayerTodayCard({ prayer, serverNow, city }: { prayer: Prayer | null; serverNow: number; city: string }) {
  const now = useNow(serverNow);
  const header = (meta: string) => (
    <div className="mb-4">
      <h2 className="panel-heading">Jadwal sholat hari ini</h2>
      <p className="mt-1 text-xs text-muted">{meta}</p>
    </div>
  );
  if (!prayer) {
    return (
      <section className="panel-box">
        {header(city)}
        <p className="text-sm text-white/60">Jadwal sholat belum bisa dimuat. Coba muat ulang halaman ini beberapa saat lagi.</p>
      </section>
    );
  }
  const next = nextPrayer(now, prayer.today, prayer.tomorrow);
  const source = prayer.today.source === "kemenag" ? "Kemenag RI" : "Perhitungan perkiraan";
  return (
    <section className="panel-box">
      {header([city, source].filter(Boolean).join(" · "))}
      <div className="border-b border-line pb-4">
        <p className="text-sm font-semibold text-gold-300">
          Menuju {PRAYER_LABELS[next.key]}
          {next.tomorrow ? " besok" : ""} · {formatClock(next.at, false)} WITA
        </p>
        <p className="mt-1 leading-none">
          <span className="text-4xl font-bold tracking-tight text-gold-300 tabular-nums">{formatDuration(next.at - now)}</span>
          <span className="ml-1.5 text-sm text-muted">lagi</span>
        </p>
      </div>
      <ul className="mt-3 divide-y divide-white/[0.06]">
        {PRAYER_KEYS.map((key) => {
          const isNext = !next.tomorrow && next.key === key;
          const passed = next.tomorrow || PRAYER_KEYS.indexOf(key) < PRAYER_KEYS.indexOf(next.key);
          return (
            <li key={key} className={`flex items-center justify-between gap-3 py-2 text-sm ${passed && !isNext ? "text-muted" : ""}`}>
              <span className={isNext ? "font-extrabold text-gold-300" : "font-semibold"}>
                {PRAYER_LABELS[key]}
                {isNext && <span className="ml-2 text-xs font-bold">berikutnya</span>}
              </span>
              <span className={`tabular-nums ${isNext ? "font-extrabold text-gold-300" : "font-bold"}`}>{prayer.today.times[key]}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
