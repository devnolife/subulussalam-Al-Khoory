"use client";

import { useState } from "react";
import { MODULE_LABELS, MODULE_TYPES, type ModuleType } from "@/lib/types";
import { PortalHeader } from "@/components/PortalHeader";

const PHASES = [
  ["normal", "Tampilan normal"],
  ["adzan", "Azan"],
  ["doa", "Doa setelah azan"],
  ["iqamah", "Hitung mundur iqamah"],
  ["shalat", "Layar saat sholat"],
  ["emergency", "Pengumuman darurat"],
] as const;

type Phase = (typeof PHASES)[number][0];

function Choice<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly (readonly [T, string])[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <label className="min-w-0">
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      <select className="field-control" value={value} onChange={(e) => onChange(options[e.currentTarget.selectedIndex][0])}>
        {options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}
      </select>
    </label>
  );
}

export function DemoControls() {
  const [module, setModule] = useState<ModuleType>("kajian");
  const [phase, setPhase] = useState<Phase>("normal");
  const url = `/display?${new URLSearchParams({ demo: "1", module, phase })}`;
  const modules = MODULE_TYPES.map((type) => [type, MODULE_LABELS[type]] as const);

  return (
    <div className="scene mx-auto min-h-dvh max-w-7xl px-5 sm:px-8 lg:px-12">
      <PortalHeader />
      <main className="py-8 lg:py-12">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Simulasi layar masjid</h1>
        <p className="mt-3 max-w-prose leading-relaxed text-muted">
          Pratinjau ini memakai data contoh dan tidak mengubah TV masjid.
        </p>

        <div className="mt-7 grid items-start gap-5 lg:grid-cols-[minmax(0,1.8fr)_minmax(19rem,1fr)]">
          <div className="min-w-0">
            <iframe title="Pratinjau layar informasi simulasi" src={url} allow="autoplay" className="aspect-video w-full rounded-xl border border-line bg-navy-950" />
            <div className="mt-2 flex flex-wrap items-center gap-x-5 text-sm">
              <a href={url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center underline underline-offset-4">Buka layar penuh</a>
              <a href="/api/display/state?demo=1" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center underline underline-offset-4">Lihat API data contoh</a>
            </div>
          </div>
          <div className="grid min-w-0 gap-4">
            <Choice label="Konten panel" options={modules} value={module} onChange={setModule} />
            <Choice label="Kondisi layar" options={PHASES} value={phase} onChange={setPhase} />
          </div>
        </div>
        <p className="mt-6 max-w-prose text-sm leading-relaxed text-muted">
          Jadwal sholat adalah hasil perkiraan, bukan jadwal resmi. QRIS tidak dapat digunakan untuk pembayaran. Live
          Ka&apos;bah memutar siaran YouTube asli dari channel pihak ketiga. Perubahan admin, upload, dan sinkronisasi
          antarperangkat tidak disimulasikan.
        </p>
      </main>
    </div>
  );
}
