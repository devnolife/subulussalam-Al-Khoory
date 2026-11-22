import { Megaphone } from "lucide-react";
import type { DisplayState } from "@/lib/types";
import { StarOrnament } from "./ui";

export function Ticker({ state }: { state: DisplayState }) {
  const items = state.announcements.filter((a) => a.showTicker).map((a) => (a.title ? `${a.title}: ${a.body}` : a.body));
  if (!items.length) {
    items.push(
      `Selamat datang di ${state.settings.mosque.name}`,
      "Luruskan dan rapatkan shaf, karena lurusnya shaf termasuk kesempurnaan shalat",
      "Mohon nonaktifkan atau senyapkan telepon genggam selama berada di dalam masjid",
    );
  }
  const duration = Math.max(30, items.join("").length * 0.3);
  // Dua salinan identik agar geseran -50% berulang tanpa jeda.
  const run = (copy: number) => (
    <span className="flex shrink-0 items-center" aria-hidden={copy > 0 || undefined}>
      {items.map((text, i) => (
        <span key={`${copy}-${i}`} className="flex items-center">
          <span className="px-9">{text}</span>
          <StarOrnament className="size-4 shrink-0 text-gold-400" />
        </span>
      ))}
    </span>
  );

  return (
    <footer className="shrink-0 px-14 pt-5 pb-6">
      <div className="card flex h-[60px] items-stretch overflow-hidden rounded-[20px]">
        <div className="flex shrink-0 items-center gap-3 bg-gold-400 pr-7 pl-6 text-[20px] font-extrabold text-navy-950">
          <Megaphone className="size-6" aria-hidden="true" />
          Informasi
        </div>
        <div className="relative min-w-0 flex-1 overflow-hidden">
          <div
            className="animate-ticker absolute inset-y-0 left-0 flex items-center text-[26px] font-medium whitespace-nowrap text-white/90"
            style={{ ["--ticker-duration" as string]: `${duration}s` }}
          >
            {run(0)}
            {run(1)}
          </div>
        </div>
        {state.demo && (
          <div className="flex shrink-0 items-center border-l border-white/10 px-6 text-[16px] font-extrabold tracking-[0.08em] text-gold-400">
            SIMULASI · DATA CONTOH
          </div>
        )}
      </div>
    </footer>
  );
}
