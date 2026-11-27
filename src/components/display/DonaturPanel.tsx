"use client";

import type { CSSProperties } from "react";
import { HandCoins, HandHeart, HeartHandshake } from "lucide-react";
import { ZISWAF_LABELS, type DisplayState } from "@/lib/types";
import { formatDateStr, rupiah } from "@/lib/time";
import { Chip, PanelHeader } from "./ui";

const delay = (step: number): CSSProperties => ({ animationDelay: `${step * 100}ms` });

const short = (n: number) => rupiah(n).replace("Rp ", "");

/** Nominal ringkas untuk ruang sempit: 7,5 jt, 250 rb, 1,2 M. */
function compact(n: number): string {
  const abs = Math.abs(n);
  const fmt = (x: number) => x.toLocaleString("id-ID", { maximumFractionDigits: 1 });
  if (abs >= 1e9) return `${fmt(n / 1e9)} M`;
  if (abs >= 1e6) return `${fmt(n / 1e6)} jt`;
  if (abs >= 1e3) return `${fmt(n / 1e3)} rb`;
  return String(n);
}

function DonorList({ donors, wide }: { donors: DisplayState["finance"]["donors"]; wide: boolean }) {
  return (
    <div className="card-brand rise relative flex min-h-0 flex-col overflow-hidden rounded-[28px] px-8 pt-7 pb-3" style={delay(1)}>
      <div className="pattern pattern-fade absolute inset-0" />
      <p className="relative flex items-center gap-3 text-[24px] font-extrabold text-gold-400">
        <HeartHandshake className="size-7" aria-hidden="true" />
        Jazakumullahu khairan
      </p>
      <p className="relative mt-1 text-[19px] text-sky-100/80">Semoga Allah membalas kebaikan para donatur</p>
      <ul className={`relative mt-3 grid min-h-0 flex-1 content-start gap-x-8 ${wide ? "grid-cols-2" : "grid-cols-1"}`}>
        {donors.slice(0, wide ? 8 : 5).map((d) => (
          <li key={d.id} className="flex items-center gap-4 border-b border-white/10 py-3">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[26px] leading-tight font-bold">{d.name}</span>
              <span className="block truncate text-[17px] text-sky-100/70">
                {[formatDateStr(d.date), d.category].filter(Boolean).join(" · ")}
              </span>
            </span>
            <span className="shrink-0 text-[26px] font-extrabold text-emerald-300 tabular-nums">{short(d.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ZiswafGrid({ rows, year, wide }: { rows: DisplayState["finance"]["ziswaf"]; year: number; wide: boolean }) {
  return (
    <div className={`grid min-h-0 gap-4 ${wide ? "grid-cols-4" : "grid-cols-2"}`}>
      {rows.map((z, idx) => (
        <div key={z.kind} className="tile rise flex min-h-0 flex-col rounded-[24px] px-6 py-5" style={delay(idx + 2)}>
          <p className="text-[26px] font-extrabold">{ZISWAF_LABELS[z.kind]}</p>
          <dl className="mt-auto space-y-2 pt-3">
            <div>
              <dt className="text-[16px] font-semibold text-sky-200/70">Penerimaan bulan ini</dt>
              <dd className="text-[26px] leading-tight font-extrabold text-emerald-300 tabular-nums">{short(z.monthIn)}</dd>
            </div>
            <div>
              <dt className="text-[16px] font-semibold text-sky-200/70">Penyaluran bulan ini</dt>
              <dd className="text-[26px] leading-tight font-extrabold text-rose-300 tabular-nums">{short(z.monthOut)}</dd>
            </div>
            <div className="flex items-baseline gap-2 border-t border-white/10 pt-2 text-[17px] whitespace-nowrap text-sky-100/80 tabular-nums">
              <dt>Tahun {year}</dt>
              <dd className="font-bold text-emerald-300">{z.yearIn > 0 ? `+${compact(z.yearIn)}` : "0"}</dd>
              <dd className="font-bold text-rose-300">{z.yearOut > 0 ? `−${compact(z.yearOut)}` : "0"}</dd>
            </div>
          </dl>
        </div>
      ))}
    </div>
  );
}

/** Apresiasi donatur terbaru + rekap zakat, infaq, sedekah, wakaf. */
export function DonaturPanel({ state }: { state: DisplayState }) {
  const f = state.finance;
  const hasDonors = f.donors.length > 0;
  const hasZiswaf = f.ziswaf.some((z) => z.yearIn || z.yearOut);
  const meta = f.monthDonors > 0 ? `${f.monthDonors} donatur bulan ini` : f.monthLabel;

  return (
    <div className="flex size-full flex-col p-10">
      <PanelHeader icon={HandHeart} title="Donatur & ZISWAF" meta={meta} />
      {hasDonors && hasZiswaf ? (
        <div className="grid min-h-0 flex-1 grid-cols-[1fr_1.15fr] gap-5">
          <DonorList donors={f.donors} wide={false} />
          <ZiswafGrid rows={f.ziswaf} year={f.year} wide={false} />
        </div>
      ) : hasDonors ? (
        <div className="grid min-h-0 flex-1">
          <DonorList donors={f.donors} wide />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-5">
          <p className="rise flex items-center gap-3 text-[24px] text-sky-100/85" style={delay(1)}>
            <Chip icon={HandCoins} tone="gold">
              Rekap ZISWAF
            </Chip>
            Penerimaan dan penyaluran zakat, infaq, sedekah, dan wakaf
          </p>
          <div className="grid min-h-0 flex-1">
            <ZiswafGrid rows={f.ziswaf} year={f.year} wide />
          </div>
        </div>
      )}
    </div>
  );
}
