import Link from "next/link";
import { BookOpen, CalendarDays, ChevronRight, Images, Megaphone, Mic2, MoonStar, ScrollText, Sparkles, UsersRound, Wallet } from "lucide-react";
import { PageHeader } from "@/components/admin/ui";
import { IconTile, type TileTone } from "@/components/display/ui";
import { currentUser } from "@/lib/auth";
import { can, routePermission } from "@/lib/permissions";

// Warna ikon mengikuti peran modul di layar TV (DESIGN.md).
const ITEMS: { href: string; label: string; desc: string; icon: typeof Megaphone; tone: TileTone }[] = [
  { href: "/admin/pengumuman", label: "Pengumuman", desc: "Teks berjalan dan informasi", icon: Megaphone, tone: "bata" },
  { href: "/admin/kajian", label: "Jadwal kajian", desc: "Kegiatan dan pemateri", icon: BookOpen, tone: "brand" },
  { href: "/admin/pembicara", label: "Pembicara", desc: "Ustadz, khatib, dan fotonya", icon: Mic2, tone: "brand" },
  { href: "/admin/jumat", label: "Petugas Jumat", desc: "Khatib, imam, dan muazin", icon: CalendarDays, tone: "brand" },
  { href: "/admin/tarawih", label: "Petugas tarawih", desc: "Imam dan penceramah Ramadhan", icon: MoonStar, tone: "ungu" },
  { href: "/admin/ied", label: "Sholat Ied", desc: "Idul Fitri dan Idul Adha", icon: Sparkles, tone: "ungu" },
  { href: "/admin/pengurus", label: "Pengurus", desc: "Susunan pengurus masjid", icon: UsersRound, tone: "brand" },
  { href: "/admin/kas", label: "Kas dan infak", desc: "Pemasukan dan pengeluaran", icon: Wallet, tone: "zamrud" },
  { href: "/admin/ayat", label: "Ayat dan hadis", desc: "Renungan harian", icon: ScrollText, tone: "brand" },
  { href: "/admin/slide", label: "Poster", desc: "Gambar kegiatan", icon: Images, tone: "gold" },
];

export default async function KontenPage() {
  const user = await currentUser();
  const items = ITEMS.filter(({ href }) => {
    const permission = routePermission(href);
    return !!user && (!permission || can(user.role, permission));
  });
  return (
    <div>
      <PageHeader title="Konten" description="Kelola informasi yang tampil di layar masjid." />
      <ul className="grid grid-cols-2 gap-3">
        {items.map(({ href, label, desc, icon, tone }) => (
          <li key={href}>
            <Link
              href={href}
              className="card flex h-full flex-col gap-4 rounded-[24px] p-4 transition-[scale,background-color] duration-150 hover:bg-white/10 active:scale-[0.96]"
            >
              <span className="flex items-start justify-between">
                <IconTile icon={icon} size="sm" tone={tone} />
                <ChevronRight className="size-5 text-white/30" aria-hidden="true" />
              </span>
              <span>
                <span className="block font-bold">{label}</span>
                <span className="mt-0.5 block text-[13px] leading-snug text-sky-200/65">{desc}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
