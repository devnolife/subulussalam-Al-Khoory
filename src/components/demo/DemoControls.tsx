"use client";

import { useState } from "react";
import { Braces, ExternalLink, FlaskConical, type LucideIcon } from "lucide-react";
import { MODULE_LABELS, MODULE_TYPES, type ModuleType } from "@/lib/types";
import { IconTile } from "@/components/display/ui";

const PHASES = [
  ["normal", "Tampilan normal"],
  ["adzan", "Azan"],
  ["doa", "Doa setelah azan"],
  ["iqamah", "Hitung mundur iqamah"],
  ["shalat", "Layar saat sholat"],
  ["emergency", "Pengumuman darurat"],
] as const;

type Phase = (typeof PHASES)[number][0];

function Segmented<T extends string>({
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
    <fieldset>
      <legend className="mb-2.5 text-sm font-bold text-sky-200/80">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(([key, text]) => (
          <button
            key={key}
            type="button"
            aria-pressed={value === key}
            onClick={() => onChange(key)}
            className={`min-h-10 rounded-full px-4 text-sm font-bold transition-[scale,background-color] duration-150 active:scale-[0.96] ${
              value === key ? "bg-gold-400 text-navy-950" : "bg-white/8 text-white/80 ring-1 ring-white/10 hover:bg-white/14"
            }`}
          >
            {text}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function LinkButton({ href, icon: Icon, children }: { href: string; icon: LucideIcon; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="card inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-bold transition-[scale,background-color] duration-150 hover:bg-white/10 active:scale-[0.96]"
    >
      <Icon className="size-4.5 text-gold-400" aria-hidden="true" />
      {children}
    </a>
  );
}

export function DemoControls() {
  const [module, setModule] = useState<ModuleType>("kajian");
  const [phase, setPhase] = useState<Phase>("normal");
  const url = `/display?${new URLSearchParams({ demo: "1", module, phase })}`;
  const modules = MODULE_TYPES.map((type) => [type, MODULE_LABELS[type]] as const);

  return (
    <main className="scene min-h-dvh px-4 py-10 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-4">
          <IconTile icon={FlaskConical} />
          <div>
            <p className="text-sm font-bold tracking-[0.12em] text-gold-400 uppercase">Pratinjau interaktif</p>
            <h1 className="text-3xl font-extrabold tracking-[-0.02em] sm:text-4xl">Simulasi layar masjid</h1>
          </div>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-sky-100/75">
          Seluruh nama, kegiatan, kas, cuaca, dan donasi di sini adalah contoh. Kontrol ini hanya mengubah pratinjau;
          tidak menyimpan data atau mengendalikan TV dan panel admin asli.
        </p>

        <div className="card mt-8 grid gap-6 rounded-[28px] p-6 lg:grid-cols-[1.4fr_1fr]">
          <Segmented label="Konten panel" options={modules} value={module} onChange={setModule} />
          <Segmented label="Kondisi layar" options={PHASES} value={phase} onChange={setPhase} />
        </div>

        <div className="mt-6 overflow-hidden rounded-[28px] bg-black ring-1 ring-white/10">
          <iframe
            title="Pratinjau layar informasi simulasi"
            src={url}
            allow="autoplay"
            className="aspect-video w-full border-0"
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <LinkButton href={url} icon={ExternalLink}>
            Buka layar penuh
          </LinkButton>
          <LinkButton href="/api/display/state?demo=1" icon={Braces}>
            Lihat API data contoh
          </LinkButton>
        </div>
        <p className="mt-5 max-w-3xl text-xs leading-5 text-white/50">
          Jadwal sholat adalah hasil perkiraan, bukan jadwal resmi. QRIS tidak dapat digunakan untuk pembayaran. Live
          Ka&apos;bah memutar siaran YouTube asli dari channel pihak ketiga. Perubahan admin, upload, dan sinkronisasi
          antarperangkat tidak disimulasikan.
        </p>
      </div>
    </main>
  );
}
