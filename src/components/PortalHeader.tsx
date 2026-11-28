import Link from "next/link";
import { ArrowLeft, PanelsTopLeft } from "lucide-react";
import { MosqueMark } from "./MosqueMark";

export function PortalHeader({ link = { href: "/", label: "Beranda" } }: { link?: { href: string; label: string } | null }) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-line py-4 sm:py-5">
      <div className="flex min-w-0 items-center gap-3">
        <MosqueMark logo="/masjid/logo.png" className="size-11 rounded-xl p-1.5" />
        <p className="text-sm leading-snug font-semibold">Universitas Muhammadiyah Makassar</p>
      </div>
      {link && (
        <Link href={link.href} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-line bg-navy-900 px-3 text-sm font-semibold text-sky-200 transition-colors duration-150 hover:border-royal-400 hover:text-white">
          {link.href === "/" ? <ArrowLeft className="size-4" aria-hidden="true" /> : <PanelsTopLeft className="size-4 text-royal-400" aria-hidden="true" />}
          {link.label}
        </Link>
      )}
    </header>
  );
}
