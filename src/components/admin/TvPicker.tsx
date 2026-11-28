"use client";

export type TvOption<T extends number> = { value: T; label: string; online?: boolean };

/** Pilihan layar TV berbentuk tombol bersebelahan; titik hijau = ada perangkat yang membuka layar itu. */
export function TvPicker<T extends number>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: TvOption<T>[];
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="grid gap-1 rounded-xl border border-line bg-navy-900 p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 text-sm font-semibold transition-colors ${
              active ? "bg-royal-600 text-white" : "text-muted hover:bg-navy-800 hover:text-white"
            }`}
          >
            {o.online !== undefined && (
              <span className={`size-2 shrink-0 rounded-full ${o.online ? "bg-emerald-400" : "bg-white/25"}`} aria-hidden="true" />
            )}
            <span className="truncate">{o.label}</span>
            {o.online !== undefined && <span className="sr-only">{o.online ? ", terhubung" : ", tidak terhubung"}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Salin teks; cadangan `execCommand` untuk panel yang dibuka lewat http (Clipboard API butuh https). */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}
