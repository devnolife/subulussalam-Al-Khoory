import Link from "next/link";
import type { ReactNode } from "react";

export function Panel({
  title,
  meta,
  action,
  children,
}: {
  title: string;
  meta?: string;
  action?: { href: string; label: string } | null;
  children: ReactNode;
}) {
  return (
    <section className="panel-box">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="panel-heading">{title}</h2>
          {meta && <p className="mt-1 text-xs leading-snug text-muted">{meta}</p>}
        </div>
        {action && (
          <Link href={action.href} className="flex min-h-11 shrink-0 items-center text-sm font-semibold text-sky-300 underline underline-offset-4 hover:text-white">
            {action.label}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

const STAT_TONES = {
  neutral: { surface: "bg-navy-900", label: "text-muted", hover: "hover:bg-navy-800" },
  zamrud: { surface: "bg-zamrud-700 text-white", label: "text-zamrud-200", hover: "hover:bg-zamrud-800" },
  bata: { surface: "bg-bata-700 text-white", label: "text-bata-200", hover: "hover:bg-bata-800" },
};

export function Stat({
  label,
  value,
  valueClassName = "",
  tone = "neutral",
  href,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  tone?: keyof typeof STAT_TONES;
  href?: string | null;
}) {
  const style = STAT_TONES[tone];
  const body = (
    <>
      <span className={`text-sm leading-snug ${style.label}`}>{label}</span>
      <span className={`mt-auto block pt-2 text-lg leading-tight font-bold tracking-tight tabular-nums [overflow-wrap:anywhere] @min-[10rem]:text-xl @min-[12.5rem]:text-2xl @min-[16rem]:text-3xl ${valueClassName}`}>
        {value}
      </span>
    </>
  );
  const cls = `@container flex min-w-0 flex-col p-4 sm:p-5 ${style.surface}`;
  return href ? (
    <Link href={href} className={`${cls} ${style.hover} focus-visible:-outline-offset-2`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
