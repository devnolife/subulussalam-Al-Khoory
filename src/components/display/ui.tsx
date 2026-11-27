import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type TileTone = "brand" | "zamrud" | "ungu" | "bata" | "gold" | "soft";
type TileSize = "sm" | "md" | "lg" | "xl";

const TILE_TONE: Record<TileTone, string> = {
  brand: "bg-royal-600 text-gold-400",
  zamrud: "bg-zamrud-600 text-white",
  ungu: "bg-ungu-600 text-white",
  bata: "bg-bata-600 text-white",
  gold: "bg-gold-400 text-navy-950",
  soft: "bg-white/10 text-sky-200",
};

const TILE_SIZE: Record<TileSize, { box: string; glyph: string }> = {
  sm: { box: "size-11 rounded-[14px]", glyph: "size-5.5" },
  md: { box: "size-14 rounded-[18px]", glyph: "size-7" },
  lg: { box: "size-16 rounded-[20px]", glyph: "size-8" },
  xl: { box: "size-28 rounded-[34px]", glyph: "size-14" },
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
      className={`inline-flex items-center gap-2.5 rounded-full px-5 py-2.5 text-[20px] leading-none font-bold whitespace-nowrap ${CHIP_TONE[tone]} ${className}`}
    >
      {Icon && <Icon className="size-5.5 shrink-0" strokeWidth={2.25} aria-hidden="true" />}
      {children}
    </span>
  );
}

/** `tone` mengikuti peran warna modul (lihat DESIGN.md). */
export function PanelHeader({ icon, title, meta, tone = "brand" }: { icon: LucideIcon; title: string; meta?: string; tone?: TileTone }) {
  return (
    <header className="rise mb-7 flex items-center gap-5">
      <IconTile icon={icon} size="lg" tone={tone} />
      <h2 className="text-[40px] leading-none font-extrabold tracking-[-0.02em]">{title}</h2>
      {meta && <Chip className="ml-auto">{meta}</Chip>}
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

/** Bintang delapan kecil sebagai pemisah ornamen. */
export function StarOrnament({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 1.5 14.1 6.92 19.42 4.58 17.08 9.9 22.5 12 17.08 14.1 19.42 19.42 14.1 17.08 12 22.5 9.9 17.08 4.58 19.42 6.92 14.1 1.5 12 6.92 9.9 4.58 4.58 9.9 6.92Z" />
    </svg>
  );
}

const HONORIFIC = /^(ustadzah|ustadz|ustazah|ustaz|ust|kh|hj|h|dr|drs|prof|ir)\.?\s+/i;

/** Dua huruf awal nama tanpa gelar, mis. "Ustadz Ahmad Fauzi" → "AF". */
export function initials(name: string): string {
  let rest = name.trim();
  for (let prev = ""; prev !== rest; ) {
    prev = rest;
    rest = rest.replace(HONORIFIC, "");
  }
  const words = rest.split(/[\s,]+/).filter((w) => /^\p{L}/u.test(w));
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
