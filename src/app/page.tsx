import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight, MapPin } from "lucide-react";
import { MosqueCover } from "@/components/MosqueCover";
import { PortalHeader } from "@/components/PortalHeader";
import { DISPLAY_IDS } from "@/lib/types";

export default async function Home() {
  await connection();
  const demo = process.env.DEMO_MODE === "1";
  return (
    <div className="scene mx-auto min-h-dvh max-w-7xl px-5 sm:px-8 lg:px-12">
      <PortalHeader link={demo ? null : { href: "/admin", label: "Panel pengurus" }} />
      <main className="py-5 sm:py-8 lg:py-10">
        <div className="overflow-hidden rounded-2xl rounded-tr-[3.5rem] sm:rounded-tr-[6rem]">
          <MosqueCover variant="portal">
            <h1 className="max-w-[18ch] font-display text-[clamp(2.75rem,5.8vw,5rem)] leading-[1.05] font-bold tracking-tight text-balance">
              Masjid Subulussalam <span className="whitespace-nowrap">Al-Khoory</span>
            </h1>
            <p className="mt-4 flex items-center gap-2 text-sm leading-snug text-sky-200 sm:text-base">
              <MapPin className="size-4 shrink-0" aria-hidden="true" />
              Jl. Sultan Alauddin No. 259, Makassar
            </p>
          </MosqueCover>
          {demo ? (
            <nav aria-label="Simulasi" className="channel-strip grid-cols-2">
              <Link href="/demo" className="channel-link">Simulasi layar <ArrowRight aria-hidden="true" /></Link>
              <Link href="/display?demo=1&module=kabah" className="channel-link">Layar TV penuh <ArrowRight aria-hidden="true" /></Link>
            </nav>
          ) : (
            <nav aria-label="Pilih layar TV" className="channel-strip grid-cols-3">
              {DISPLAY_IDS.map((id) => (
                <Link key={id} href={`/display/${id}`} className="channel-link">
                  <span className="tabular-nums">TV {id}</span>
                  <ArrowRight aria-hidden="true" />
                </Link>
              ))}
            </nav>
          )}
        </div>
        {demo && <p className="mt-4 text-sm text-muted">Simulasi memakai data contoh. Panel pengurus tidak tersedia.</p>}
      </main>
    </div>
  );
}
