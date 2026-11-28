"use client";

import { createContext, useContext, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { can, routePermission, type SessionUser } from "@/lib/permissions";
import { EmptyState } from "./ui";

const AdminUserContext = createContext<SessionUser | null>(null);
const MosqueNameContext = createContext("");

export function AdminUserProvider({ user, mosqueName, children }: { user: SessionUser; mosqueName: string; children: ReactNode }) {
  return (
    <AdminUserContext.Provider value={user}>
      <MosqueNameContext.Provider value={mosqueName}>{children}</MosqueNameContext.Provider>
    </AdminUserContext.Provider>
  );
}

/** Nama masjid dari Pengaturan (saat halaman panel dimuat), untuk teks yang dibagikan. */
export const useMosqueName = () => useContext(MosqueNameContext);

export function useAdminUser(): SessionUser {
  const user = useContext(AdminUserContext);
  if (!user) throw new Error("useAdminUser harus dipakai di dalam AdminUserProvider");
  return user;
}

/** Sembunyikan halaman yang tidak sesuai peran; batas aksesnya tetap dijaga API. */
export function RoleGate({ children }: { children: ReactNode }) {
  const user = useAdminUser();
  const pathname = usePathname();
  const permission = routePermission(pathname);
  if (!permission || can(user.role, permission)) return children;
  return (
    <div className="pt-10">
      <EmptyState>
        <ShieldAlert className="mx-auto mb-3 size-8 text-gold-400" aria-hidden="true" />
        <span className="block font-bold text-white">Tidak punya akses</span>
        Halaman ini tidak tersedia untuk peran akun Anda.
        <Link href="/admin" className="mt-4 block font-bold text-sky-300">
          Kembali ke beranda
        </Link>
      </EmptyState>
    </div>
  );
}
