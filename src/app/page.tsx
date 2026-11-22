import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight, FlaskConical, MonitorPlay, Smartphone, type LucideIcon } from "lucide-react";
import { SunEmblem } from "@/components/display/SunEmblem";
import { IconTile } from "@/components/display/ui";

type HomeLink = { href: string; title: string; desc: string; icon: LucideIcon; brand: boolean };

const LINKS: HomeLink[] = [
  { href: "/display", title: "Layar TV", desc: "Tampilan informasi untuk layar di masjid", icon: MonitorPlay, brand: true },
  { href: "/admin", title: "Panel pengurus", desc: "Kelola jadwal, kajian, dan pengumuman dari HP", icon: Smartphone, brand: false },
];

// Deployment demo tidak punya database, jadi hanya mengarah ke halaman berdata contoh.
const DEMO_LINKS: HomeLink[] = [
  { href: "/demo", title: "Simulasi layar", desc: "Coba semua panel dan kondisi layar dengan data contoh", icon: FlaskConical, brand: true },
  { href: "/display?demo=1&module=kabah", title: "Layar TV penuh", desc: "Tampilan 1920×1080 seperti di TV masjid", icon: MonitorPlay, brand: false },
];

export default async function Home() {
  await connection();
  const demo = process.env.DEMO_MODE === "1";
  const links = demo ? DEMO_LINKS : LINKS;
  return (
    <main className="scene flex min-h-dvh items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl">
        <span className="card-brand grid size-20 place-items-center rounded-[26px] text-white">
          <SunEmblem className="size-12" />
        </span>
        <p className="mt-9 text-sm font-bold tracking-[0.14em] text-gold-400 uppercase">Universitas Muhammadiyah Makassar</p>
        <h1 className="mt-3 text-4xl leading-[1.05] font-extrabold tracking-[-0.03em] text-balance sm:text-6xl">
          Masjid Subulussalam Al-Khoory
        </h1>
        <p className="mt-4 max-w-xl text-lg text-sky-200/75">Layar informasi masjid yang dapat dikelola langsung dari HP pengurus.</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {links.map(({ href, title, desc, icon, brand }) => (
            <Link
              key={href}
              href={href}
              className={`group flex flex-col gap-6 rounded-[28px] p-6 transition-[scale] duration-150 active:scale-[0.96] ${brand ? "card-brand" : "card"}`}
            >
              <span className="flex items-center justify-between">
                <IconTile icon={icon} tone={brand ? "gold" : "brand"} />
                <ArrowRight
                  className="size-6 text-white/50 transition-transform duration-150 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </span>
              <span>
                <span className="block text-xl font-extrabold">{title}</span>
                <span className="mt-1 block text-sm text-sky-100/75">{desc}</span>
              </span>
            </Link>
          ))}
        </div>
        {demo && (
          <p className="mt-6 text-sm text-sky-200/60">
            Versi demo ini memakai data contoh. Panel pengurus memerlukan database sehingga tidak tersedia di sini.
          </p>
        )}
      </div>
    </main>
  );
}
