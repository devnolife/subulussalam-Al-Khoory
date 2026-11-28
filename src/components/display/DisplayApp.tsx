"use client";

import { prayerPhase } from "@/lib/prayer/schedule";
import { Stage } from "./Stage";
import { Header } from "./Header";
import { PrayerSidebar } from "./PrayerSidebar";
import { PrayerStrip } from "./PrayerStrip";
import { MainPanel } from "./MainPanel";
import { Ticker } from "./Ticker";
import { EmergencyOverlay, PrayerOverlay } from "./PrayerOverlay";
import { SunEmblem } from "./SunEmblem";
import { useDisplayData, useNow } from "./useDisplayData";
import type { DisplayId } from "@/lib/types";

export function DisplayApp({ tv }: { tv: DisplayId }) {
  const { state, status, offset } = useDisplayData(tv);
  const now = useNow(offset);

  if (!state) {
    return (
      <Stage>
        <div className="scene flex size-full flex-col items-center justify-center">
          <span className="grid size-40 bg-royal-600 animate-soft-pulse place-items-center rounded-[48px] text-white">
            <SunEmblem className="size-24" />
          </span>
          <p className="mt-10 text-[34px] font-semibold text-sky-200">
            {status === "offline" ? "Menunggu koneksi ke server…" : "Memuat layar informasi…"}
          </p>
        </div>
      </Stage>
    );
  }

  const phase =
    state.demo && (state.demo.phase === "normal" || state.demo.phase === "emergency")
      ? { kind: "normal" as const }
      : prayerPhase(now, state.prayer.today, state.settings.prayer, state.settings.manualPrayer);
  const emergency = phase.kind === "normal" && state.settings.emergency.active && !!state.settings.emergency.text;
  // Panel utama dilepas saat tertutup layar sholat atau darurat, agar siaran tidak terus bersuara di baliknya.
  const covered = phase.kind !== "normal" || emergency;

  return (
    <Stage>
      <div className="scene absolute inset-0" />

      <div className="relative flex size-full flex-col">
        <Header state={state} offline={status === "offline"} />
        <main className="flex min-h-0 flex-1 gap-6 px-14 py-5">
          {covered ? <div className="min-w-0 flex-1" /> : <MainPanel state={state} now={now} />}
          <PrayerSidebar state={state} now={now} />
        </main>
        <PrayerStrip state={state} now={now} />
        <Ticker state={state} />
      </div>

      {emergency && <EmergencyOverlay text={state.settings.emergency.text} />}
      {phase.kind !== "normal" && <PrayerOverlay phase={phase} now={now} />}
      {state.demo && phase.kind !== "normal" && (
        <div className="absolute right-8 bottom-8 z-50 rounded-full bg-gold-400 px-5 py-2.5 text-[18px] leading-none font-extrabold tracking-[0.06em] text-navy-950">
          SIMULASI · DATA CONTOH
        </div>
      )}
    </Stage>
  );
}
