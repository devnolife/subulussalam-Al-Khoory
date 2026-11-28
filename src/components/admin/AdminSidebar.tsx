"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { LogOut } from "lucide-react";
import { MosqueMark } from "@/components/MosqueMark";
import { Avatar } from "@/components/display/ui";
import { activeHref } from "@/lib/nav";
import { ROLE_LABELS } from "@/lib/permissions";
import { api } from "./api";
import { useAdminUser } from "./AdminUser";
import { HOME_HREF, menuFor } from "./menu";

/** Menu samping untuk layar lebar (laptop/PC); di HP diganti navigasi bawah AdminNav. */
export function AdminSidebar({ mosque }: { mosque: { name: string; logo: string | null } }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAdminUser();
  const groups = menuFor(user.role);
  const active = activeHref(
    pathname,
    groups.flatMap((g) => g.items.map((i) => i.href)),
    [HOME_HREF],
  );
  const displayName = user.name || user.username;
  const navRef = useRef<HTMLElement>(null);

  // Di layar pendek menu bisa lebih panjang dari tinggi layar: pastikan menu aktif terlihat.
  useEffect(() => {
    const nav = navRef.current;
    const link = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !link) return;
    const n = nav.getBoundingClientRect();
    const l = link.getBoundingClientRect();
    if (l.top < n.top || l.bottom > n.bottom) nav.scrollTop += l.top - n.top - (n.height - l.height) / 2;
  }, [active]);

  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-navy-900 lg:flex">
      <Link href={HOME_HREF} className="mx-4 flex items-center gap-3 border-b border-line py-5">
        <MosqueMark logo={mosque.logo} className="size-11 rounded-xl p-1.5" />
        <span className="min-w-0">
          <span className="line-clamp-2 text-sm leading-tight font-bold">{mosque.name}</span>
        </span>
      </Link>

      <nav ref={navRef} aria-label="Menu panel" className="flex-1 overflow-y-auto px-3 py-4">
        {groups.map((group, index) => (
          <div key={group.label ?? index} className="mt-4 first:mt-0">
            {group.label && <p className="px-3 pb-1.5 text-xs font-semibold text-muted">{group.label}</p>}
            <ul className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const on = href === active;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={on ? "page" : undefined}
                      className={`flex min-h-11 items-center gap-3 rounded-lg border-l-[3px] px-3 text-sm font-semibold transition-colors ${
                        on ? "border-royal-400 bg-royal-700 text-white" : "border-transparent text-muted hover:bg-navy-800 hover:text-white"
                      }`}
                    >
                      <Icon className={`size-[18px] shrink-0 ${on ? "text-royal-200" : ""}`} strokeWidth={1.8} aria-hidden="true" />
                      <span className="truncate">{label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="flex items-center gap-3 border-t border-line p-4">
        <Avatar name={displayName} photo={null} className="size-10 rounded-xl text-sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{displayName}</p>
          <p className="truncate text-xs text-sky-200/65">
            {ROLE_LABELS[user.role]} · @{user.username}
          </p>
        </div>
        <button
          type="button"
          onClick={logout}
          aria-label="Keluar"
          title="Keluar"
          className="grid size-11 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-navy-800 hover:text-white"
        >
          <LogOut className="size-[18px]" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
