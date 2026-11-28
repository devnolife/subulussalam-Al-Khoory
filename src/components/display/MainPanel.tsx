"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DisplayState, ModuleType, PlaylistItem } from "@/lib/types";
import { activeItems, cameraActive, contentAvailability, ramadhanFor, seasonTime } from "@/lib/playlist";
import type { RamadhanView } from "@/lib/ramadhan";
import type { DisplayTarawih } from "@/lib/types";
import { SunEmblem } from "./SunEmblem";
import { CameraPanel } from "./CameraPanel";
import { HariBesarPanel } from "./HariBesarPanel";
import { DonaturPanel } from "./DonaturPanel";
import { PengurusPanel, boardPages } from "./PengurusPanel";
import { RamadhanPanel } from "./RamadhanPanel";
import {
  AyatPanel,
  JumatPanel,
  KabahPanel,
  KajianPanel,
  KasPanel,
  PengumumanPanel,
  QrisPanel,
  SlidesPanel,
} from "./Modules";

function itemDuration(item: PlaylistItem, state: DisplayState): number {
  if (item.type === "slides") return item.durationSec * Math.max(1, state.slides.length);
  if (item.type === "pengurus") return item.durationSec * boardPages(state.board.length);
  return item.durationSec;
}

function renderModule(
  type: ModuleType,
  state: DisplayState,
  item: PlaylistItem,
  now: number,
  ramadhan: RamadhanView<DisplayTarawih> | null,
) {
  switch (type) {
    case "kabah":
      // Selama siaran kamera masjid, slot Live Ka'bah menampilkan kamera.
      return state.camera && cameraActive(state) ? (
        <CameraPanel key={state.camera.session} state={state} camera={state.camera} />
      ) : (
        <KabahPanel state={state} />
      );
    case "slides":
      return <SlidesPanel state={state} perSlideSec={item.durationSec} />;
    case "kajian":
      return <KajianPanel state={state} now={now} />;
    case "jumat":
      return <JumatPanel state={state} />;
    case "kas":
      return <KasPanel state={state} />;
    case "ayat":
      return <AyatPanel state={state} />;
    case "qris":
      return <QrisPanel state={state} />;
    case "pengumuman":
      return <PengumumanPanel state={state} />;
    case "haribesar":
      return <HariBesarPanel state={state} now={now} />;
    case "donatur":
      return <DonaturPanel state={state} />;
    case "pengurus":
      return <PengurusPanel state={state} perPageSec={item.durationSec} />;
    case "ramadhan":
      return <RamadhanPanel view={ramadhan} now={seasonTime(state, now)} />;
  }
}

/** Panel utama: memutar modul sesuai playlist (urutan, durasi, pin, override admin). */
export function MainPanel({ state, now }: { state: DisplayState; now: number }) {
  // Ketersediaan konten bergantung waktu (kajian lewat, musim Ramadhan), cukup dihitung ulang tiap menit.
  const minute = Math.floor(now / 60_000) * 60_000;
  const availability = useMemo(() => contentAvailability(state, minute), [state, minute]);
  const ramadhan = useMemo(() => ramadhanFor(state, minute), [state, minute]);
  const override = state.display.override;
  const overrideActive = !!override.type && (!override.until || override.until > now);
  const focus = cameraActive(state) && state.display.cameraMode === "focus";
  const items = useMemo(
    () => activeItems(state.playlist, availability, override, now, focus),
    // overrideActive memicu hitung ulang saat override kedaluwarsa
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.playlist, availability, override, overrideActive, focus],
  );
  const [cursor, setCursor] = useState<{ type: ModuleType | null; startedAt: number }>({ type: null, startedAt: 0 });
  const latest = useRef({ items, state });
  useEffect(() => {
    latest.current = { items, state };
  }, [items, state]);

  useEffect(() => {
    const iv = setInterval(() => {
      const { items, state } = latest.current;
      setCursor((c) => {
        const idx = items.findIndex((i) => i.type === c.type);
        if (idx === -1) return items[0] ? { type: items[0].type, startedAt: Date.now() } : c;
        if (items.length > 1 && Date.now() - c.startedAt >= itemDuration(items[idx], state) * 1000) {
          return { type: items[(idx + 1) % items.length].type, startedAt: Date.now() };
        }
        return c;
      });
    }, 500);
    return () => clearInterval(iv);
  }, []);

  const current = items.find((i) => i.type === cursor.type) ?? items[0];

  if (!current) {
    return (
      <section className="card relative flex min-w-0 flex-1 flex-col items-center justify-center overflow-hidden rounded-2xl text-center">
        <span className="relative grid size-36 bg-royal-600 place-items-center rounded-[44px] text-white">
          <SunEmblem className="size-24" />
        </span>
        <p className="relative mt-8 text-[48px] font-extrabold tracking-[-0.02em]">{state.settings.mosque.name}</p>
        <p className="relative mt-3 text-[28px] text-sky-200/85">Selamat datang, semoga Allah memberkahi langkah Anda</p>
      </section>
    );
  }

  const duration = itemDuration(current, state);
  const fullBleed = current.type === "kabah" || current.type === "slides";

  return (
    <section className={`relative min-w-0 flex-1 overflow-hidden rounded-2xl ${fullBleed ? "bg-navy-900" : "card"}`}>
      <div key={`${current.type}-${cursor.startedAt}`} className="animate-panel-in relative size-full">
        {renderModule(current.type, state, current, now, ramadhan)}
      </div>
      {items.length > 1 && (
        <div
          className="pointer-events-none absolute right-8 bottom-3 flex items-center gap-2 rounded-full bg-navy-950/60 px-3 py-2"
          aria-hidden="true"
        >
          {items.map((item) =>
            item.type === current.type ? (
              <span key={item.type} className="h-2.5 w-14 overflow-hidden rounded-full bg-white/20">
                <span
                  key={cursor.startedAt}
                  className="block h-full origin-left rounded-full bg-gold-400"
                  style={{ animation: `progress ${duration}s linear both` }}
                />
              </span>
            ) : (
              <span key={item.type} className="size-2.5 rounded-full bg-white/30" />
            ),
          )}
        </div>
      )}
    </section>
  );
}
