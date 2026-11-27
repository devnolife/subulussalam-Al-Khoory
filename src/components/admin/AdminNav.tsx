"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, ListOrdered, Settings, Tv } from "lucide-react";
import { can, type Role } from "@/lib/permissions";
import { useAdminUser } from "./AdminUser";

const NAV = [
  { href: "/admin", label: "Remote", icon: Tv, match: (p: string) => p === "/admin", show: (r: Role) => can(r, "remote") },
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
    match: (p: string) => /^\/admin\/(konten|pengumuman|kajian|jumat|kas|ayat|slide)/.test(p),
    show: (r: Role) => can(r, "content") || can(r, "finance"),
  },
  {
    href: "/admin/pengaturan",
    label: "Pengaturan",
    icon: Settings,
    match: (p: string) => /^\/admin\/(pengaturan|pengguna|riwayat)/.test(p),
    show: () => true,
  },
];

const COLS = ["grid-cols-1", "grid-cols-2", "grid-cols-3", "grid-cols-4"];

export function AdminNav() {
  const pathname = usePathname();
  const { role } = useAdminUser();
  const items = NAV.filter((n) => n.show(role));
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <ul className={`card mx-auto grid max-w-lg ${COLS[items.length - 1]} rounded-[24px] bg-navy-900/90 p-1.5 backdrop-blur-xl`}>
        {items.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 rounded-[18px] py-2 text-[11px] font-bold transition-colors ${
                  active ? "card-brand text-white" : "text-white/55 hover:text-white"
                }`}
              >
                <Icon className={`size-5.5 ${active ? "text-gold-400" : ""}`} strokeWidth={2} aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
