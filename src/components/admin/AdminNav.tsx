"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LayoutGrid, ListOrdered, Settings, Tv, Wallet } from "lucide-react";
import { can, type Role } from "@/lib/permissions";
import { useAdminUser } from "./AdminUser";

const NAV = [
  { href: "/admin", label: "Beranda", icon: LayoutDashboard, match: (p: string) => p === "/admin", show: () => true },
  {
    href: "/admin/remote",
    label: "Remote",
    icon: Tv,
    match: (p: string) => /^\/admin\/(remote|kamera)/.test(p),
    show: (r: Role) => can(r, "remote"),
  },
  {
    href: "/admin/playlist",
    label: "Tampilan",
    icon: ListOrdered,
    match: (p: string) => p.startsWith("/admin/playlist"),
    show: (r: Role) => can(r, "playlist"),
  },
  {
    href: "/admin/konten",
    label: "Konten",
    icon: LayoutGrid,
    match: (p: string) => /^\/admin\/(konten|pengumuman|kajian|jumat|kas|ayat|slide|pembicara|pengurus|tarawih|ied)/.test(p),
    show: (r: Role) => can(r, "content"),
  },
  {
    // Bendahara tidak mengelola konten, jadi kas langsung jadi tab sendiri.
    href: "/admin/kas",
    label: "Kas",
    icon: Wallet,
    match: (p: string) => p.startsWith("/admin/kas"),
    show: (r: Role) => can(r, "finance") && !can(r, "content"),
  },
  {
    href: "/admin/pengaturan",
    label: "Pengaturan",
    icon: Settings,
    match: (p: string) => /^\/admin\/(pengaturan|pengguna|riwayat)/.test(p),
    show: () => true,
  },
];

const COLS = ["grid-cols-1", "grid-cols-2", "grid-cols-3", "grid-cols-4", "grid-cols-5"];

/** Navigasi bawah untuk HP dan tablet; di layar lebar diganti AdminSidebar. */
export function AdminNav() {
  const pathname = usePathname();
  const { role } = useAdminUser();
  const items = NAV.filter((n) => n.show(role));
  return (
    <nav aria-label="Menu utama" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-navy-900 pb-[env(safe-area-inset-bottom)] sm:px-2 lg:hidden">
      <ul className={`mx-auto grid max-w-3xl ${COLS[items.length - 1]} py-1`}>
        {items.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href} className="min-w-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-semibold transition-colors ${
                  active ? "text-white" : "text-muted hover:bg-navy-800 hover:text-white"
                }`}
              >
                <span className={`grid h-7 w-11 place-items-center rounded-lg ${active ? "bg-royal-600" : ""}`}>
                  <Icon className="size-5" strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
                </span>
                <span className="w-full text-center leading-tight [overflow-wrap:anywhere]">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
