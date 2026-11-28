import type { MonthTotals } from "@/lib/finance-summary";
import { rupiah, rupiahShort } from "@/lib/time";

/** Batas atas sumbu: kelipatan 1, 2, 2,5, atau 5 × 10ⁿ terdekat di atas nilai terbesar. */
function niceMax(value: number): number {
  if (value <= 0) return 1_000_000;
  const exp = 10 ** Math.floor(Math.log10(value));
  return ([1, 2, 2.5, 5, 10].find((step) => step * exp >= value) ?? 10) * exp;
}

const GRID = [1, 0.5, 0];

/** Grafik batang pemasukan (zamrud) dan pengeluaran (bata) per bulan; warna selalu disertai legenda dan teks. */
export function CashFlowChart({ series }: { series: MonthTotals[] }) {
  const max = niceMax(Math.max(0, ...series.flatMap((m) => [m.in, m.out])));
  const height = (v: number) => (v > 0 ? `max(3px, ${(v / max) * 100}%)` : "0");
  return (
    <figure>
      <div className="grid grid-cols-[3.75rem_1fr] gap-x-2">
        <div className="relative h-44 md:h-52" aria-hidden="true">
          {GRID.map((f) => (
            <span key={f} className="absolute right-0 translate-y-1/2 text-[11px] text-white/50 tabular-nums" style={{ bottom: `${f * 100}%` }}>
              {f ? rupiahShort(max * f) : "0"}
            </span>
          ))}
        </div>
        <div className="relative h-44 md:h-52">
          {GRID.map((f) => (
            <span key={f} className="absolute inset-x-0 border-t border-white/[0.08]" style={{ bottom: `${f * 100}%` }} aria-hidden="true" />
          ))}
          <ul className="absolute inset-0 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${series.length}, minmax(0, 1fr))` }}>
            {series.map((m) => (
              <li key={m.month} className="flex items-end justify-center gap-1">
                <span className="sr-only">
                  {m.label}: pemasukan {rupiah(m.in)}, pengeluaran {rupiah(m.out)}
                </span>
                <span className="w-[38%] max-w-6 rounded-t-md bg-zamrud-400" style={{ height: height(m.in) }} title={`Pemasukan ${m.label}: ${rupiah(m.in)}`} aria-hidden="true" />
                <span className="w-[38%] max-w-6 rounded-t-md bg-bata-400" style={{ height: height(m.out) }} title={`Pengeluaran ${m.label}: ${rupiah(m.out)}`} aria-hidden="true" />
              </li>
            ))}
          </ul>
        </div>
        <span />
        <ol className="mt-2 grid gap-1.5 text-center text-xs font-semibold text-white/60" style={{ gridTemplateColumns: `repeat(${series.length}, minmax(0, 1fr))` }} aria-hidden="true">
          {series.map((m) => (
            <li key={m.month}>{m.short}</li>
          ))}
        </ol>
      </div>
      <figcaption className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-sky-200/75">
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded-sm bg-zamrud-400" aria-hidden="true" /> Pemasukan (batang kiri)
        </span>
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded-sm bg-bata-400" aria-hidden="true" /> Pengeluaran (batang kanan)
        </span>
      </figcaption>
    </figure>
  );
}
