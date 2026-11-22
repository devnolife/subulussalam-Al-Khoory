"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, ListOrdered, Settings, Tv } from "lucide-react";

const NAV = [
  { href: "/admin", label: "Remote", icon: Tv, match: (p: string) => p === "/admin" },
  { href: "/admin/playlist", label: "Tampilan", icon: ListOrdered, match: (p: string) => p.startsWith("/admin/playlist") },
  {
    href: "/admin/konten",
    label: "Konten",
    icon: LayoutGrid,
    match: (p: string) => /^\/admin\/(konten|pengumuman|kajian|jumat|kas|ayat|slide)/.test(p),
  },
  { href: "/admin/pengaturan", label: "Pengaturan", icon: Settings, match: (p: string) => p.startsWith("/admin/pengaturan") },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <ul className="card mx-auto grid max-w-lg grid-cols-4 rounded-[24px] bg-navy-900/90 p-1.5 backdrop-blur-xl">
        {NAV.map(({ href, label, icon: Icon, match }) => {
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
