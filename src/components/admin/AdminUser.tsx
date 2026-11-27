"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { can, homeFor, routePermission, type SessionUser } from "@/lib/permissions";
import { EmptyState } from "./ui";

const AdminUserContext = createContext<SessionUser | null>(null);

export function AdminUserProvider({ user, children }: { user: SessionUser; children: ReactNode }) {
  return <AdminUserContext.Provider value={user}>{children}</AdminUserContext.Provider>;
}

export function useAdminUser(): SessionUser {
  const user = useContext(AdminUserContext);
  if (!user) throw new Error("useAdminUser harus dipakai di dalam AdminUserProvider");
  return user;
}

/** Sembunyikan halaman yang tidak sesuai peran; batas aksesnya tetap dijaga API. */
export function RoleGate({ children }: { children: ReactNode }) {
  const user = useAdminUser();
  const pathname = usePathname();
  const router = useRouter();
  const permission = routePermission(pathname);
  const allowed = !permission || can(user.role, permission);
  const redirectHome = !allowed && pathname === "/admin";

  useEffect(() => {
    if (redirectHome) router.replace(homeFor(user.role));
  }, [redirectHome, router, user.role]);

  if (allowed) return children;
  if (redirectHome) return null;
  return (
    <div className="pt-10">
      <EmptyState>
        <ShieldAlert className="mx-auto mb-3 size-8 text-gold-400" aria-hidden="true" />
        <span className="block font-bold text-white">Tidak punya akses</span>
        Halaman ini tidak tersedia untuk peran akun Anda.
      </EmptyState>
    </div>
  );
}
