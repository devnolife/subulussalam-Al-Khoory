import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type TileTone = "brand" | "zamrud" | "ungu" | "bata" | "gold" | "soft";
type TileSize = "sm" | "md" | "lg" | "xl";

export const TONE_TEXT: Record<TileTone, string> = {
  brand: "text-royal-400",
  zamrud: "text-zamrud-300",
  ungu: "text-ungu-300",
  bata: "text-bata-300",
  gold: "text-gold-300",
  soft: "text-muted",
};

const TILE_TONE: Record<TileTone, string> = {
  brand: "bg-royal-500/25 text-royal-200",
  zamrud: "bg-zamrud-800 text-zamrud-200",
  ungu: "bg-ungu-800 text-ungu-200",
  bata: "bg-bata-800 text-bata-200",
  gold: "bg-gold-400 text-navy-950",
  soft: "bg-white/10 text-sky-200",
};

const TILE_SIZE: Record<TileSize, { box: string; glyph: string }> = {
  sm: { box: "size-10 rounded-lg", glyph: "size-5" },
  md: { box: "size-14 rounded-xl", glyph: "size-7" },
  lg: { box: "size-16 rounded-2xl", glyph: "size-8" },
  xl: { box: "size-28 rounded-3xl", glyph: "size-14" },
};

/** Ikon di dalam kotak berwarna, dipakai konsisten di seluruh layar. */
export function IconTile({
  icon: Icon,
  tone = "brand",
  size = "md",
  className = "",
}: {
  icon: LucideIcon;
  tone?: TileTone;
  size?: TileSize;
  className?: string;
}) {
  const { box, glyph } = TILE_SIZE[size];
  return (
    <span className={`grid shrink-0 place-items-center ${box} ${TILE_TONE[tone]} ${className}`}>
      <Icon className={glyph} strokeWidth={2} aria-hidden="true" />
    </span>
  );
}

type ChipTone = "glass" | "gold";

const CHIP_TONE: Record<ChipTone, string> = {
  glass: "bg-white/12 text-white",
  gold: "bg-gold-400 text-navy-950",
};

export function Chip({
  icon: Icon,
  tone = "glass",
  className = "",
  children,
}: {
  icon?: LucideIcon;
  tone?: ChipTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-[20px] leading-none font-semibold whitespace-nowrap ${CHIP_TONE[tone]} ${className}`}
    >
      {Icon && <Icon className="size-5.5 shrink-0" strokeWidth={2.25} aria-hidden="true" />}
      {children}
    </span>
  );
}

/** `tone` mengikuti peran warna modul (lihat DESIGN.md). */
export function PanelHeader({ icon: Icon, title, meta, tone = "brand" }: { icon: LucideIcon; title: string; meta?: string; tone?: TileTone }) {
  return (
    <header className="mb-5 flex items-center gap-4 border-b border-line pb-4">
      <Icon className={`size-8 shrink-0 ${TONE_TEXT[tone]}`} strokeWidth={1.8} aria-hidden="true" />
      <h2 className="text-[42px] leading-none font-bold tracking-[-0.035em]">{title}</h2>
      {meta && <p className="ml-auto text-[22px] text-muted">{meta}</p>}
    </header>
  );
}

export function ProgressRing({
  size,
  stroke,
  progress,
  trackClassName,
  barClassName,
  children,
}: {
  size: number;
  stroke: number;
  progress: number;
  trackClassName: string;
  barClassName: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, progress));
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className={trackClassName} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          className={`transition-[stroke-dashoffset] duration-1000 ease-linear ${barClassName}`}
        />
      </svg>
      {children && <div className="relative">{children}</div>}
    </div>
  );
}

const HONORIFIC = /^(ustadzah|ustadz|ustazah|ustaz|ust|kh|hj|h|dr|drs|prof|ir)\.?\s+/i;

/** Dua huruf awal nama tanpa gelar, mis. "Ustadz Ahmad Fauzi" → "AF", "Mursalim, S.Pd." → "M". */
export function initials(name: string): string {
  // Gelar akademik ditulis di belakang koma, jadi hanya bagian sebelum koma pertama yang dipakai.
  let rest = name.split(",")[0].trim();
  for (let prev = ""; prev !== rest; ) {
    prev = rest;
    rest = rest.replace(HONORIFIC, "");
  }
  const words = rest.split(/\s+/).filter((w) => /^\p{L}/u.test(w));
  return words
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

/** Foto orang, atau inisial bila belum ada foto. Ukuran dan sudut diatur lewat className. */
export function Avatar({ name, photo, className = "" }: { name: string; photo: string | null; className?: string }) {
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo} alt="" className={`shrink-0 bg-navy-900 object-cover ${className}`} />;
  }
  return (
    <span
      className={`grid shrink-0 place-items-center bg-white/10 font-extrabold text-gold-400 ${className}`}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
