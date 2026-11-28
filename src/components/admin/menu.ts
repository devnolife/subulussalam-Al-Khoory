import {
  BookOpen,
  CalendarDays,
  FileUp,
  History,
  Images,
  LayoutDashboard,
  ListOrdered,
  Megaphone,
  Mic2,
  MoonStar,
  ScrollText,
  Settings,
  Sparkles,
  Tags,
  Tv,
  UsersRound,
  UserCog,
  Video,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { TileTone } from "@/components/display/ui";
import { can, routePermission, type Role } from "@/lib/permissions";

export type MenuItem = { href: string; label: string; desc: string; icon: LucideIcon; tone: TileTone };
export type MenuGroup = { label: string | null; items: MenuItem[] };

export const HOME_HREF = "/admin";

// Warna ikon mengikuti peran modul di layar TV (DESIGN.md).
export const CONTENT_MENU: MenuItem[] = [
  { href: "/admin/pengumuman", label: "Pengumuman", desc: "Teks berjalan dan informasi", icon: Megaphone, tone: "bata" },
  { href: "/admin/kajian", label: "Jadwal kajian", desc: "Kegiatan dan pemateri", icon: BookOpen, tone: "brand" },
  { href: "/admin/pembicara", label: "Pembicara", desc: "Ustadz, khatib, dan fotonya", icon: Mic2, tone: "brand" },
  { href: "/admin/jumat", label: "Petugas Jumat", desc: "Khatib, imam, dan muazin", icon: CalendarDays, tone: "brand" },
  { href: "/admin/tarawih", label: "Petugas tarawih", desc: "Imam dan penceramah Ramadhan", icon: MoonStar, tone: "ungu" },
  { href: "/admin/ied", label: "Sholat Ied", desc: "Idul Fitri dan Idul Adha", icon: Sparkles, tone: "ungu" },
  { href: "/admin/pengurus", label: "Pengurus", desc: "Susunan pengurus masjid", icon: UsersRound, tone: "brand" },
  { href: "/admin/ayat", label: "Ayat dan hadis", desc: "Renungan harian", icon: ScrollText, tone: "brand" },
  { href: "/admin/slide", label: "Poster", desc: "Gambar kegiatan", icon: Images, tone: "gold" },
];

export const FINANCE_MENU: MenuItem[] = [
  { href: "/admin/kas", label: "Kas dan infak", desc: "Pemasukan dan pengeluaran", icon: Wallet, tone: "zamrud" },
  { href: "/admin/kas/kategori", label: "Kategori kas", desc: "Jenis transaksi dan ZISWAF", icon: Tags, tone: "zamrud" },
  { href: "/admin/kas/impor", label: "Impor transaksi", desc: "Dari file CSV atau Excel", icon: FileUp, tone: "zamrud" },
];

export const MENU_GROUPS: MenuGroup[] = [
  { label: null, items: [{ href: HOME_HREF, label: "Beranda", desc: "Ringkasan masjid hari ini", icon: LayoutDashboard, tone: "brand" }] },
  {
    label: "Layar TV",
    items: [
      { href: "/admin/remote", label: "Remote layar", desc: "Kendali langsung TV 1–3", icon: Tv, tone: "brand" },
      { href: "/admin/playlist", label: "Urutan tampilan", desc: "Modul di tiap layar", icon: ListOrdered, tone: "brand" },
      { href: "/admin/kamera", label: "Siaran kamera", desc: "Video langsung ke TV", icon: Video, tone: "brand" },
    ],
  },
  { label: "Konten layar", items: CONTENT_MENU },
  { label: "Keuangan", items: FINANCE_MENU },
  {
    label: "Sistem",
    items: [
      { href: "/admin/pengguna", label: "Pengguna", desc: "Akun pengurus dan peran", icon: UserCog, tone: "brand" },
      { href: "/admin/riwayat", label: "Riwayat aktivitas", desc: "Siapa mengubah apa dan kapan", icon: History, tone: "brand" },
      { href: "/admin/pengaturan", label: "Pengaturan", desc: "Akun dan identitas masjid", icon: Settings, tone: "brand" },
    ],
  },
];

/** Halaman panel yang boleh dibuka peran ini (batas sebenarnya tetap dijaga API). */
export function canOpen(role: Role, href: string): boolean {
  const permission = routePermission(href);
  return !permission || can(role, permission);
}

export function menuFor(role: Role): MenuGroup[] {
  return MENU_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => canOpen(role, i.href)) })).filter((g) => g.items.length > 0);
}
