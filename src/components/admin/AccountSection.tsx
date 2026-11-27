"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, History, LogOut, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { api } from "./api";
import { useAdminUser } from "./AdminUser";
import { Button, Card, Field, TextInput } from "./ui";
import { IconTile } from "@/components/display/ui";
import { can, ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/permissions";

/** Info akun yang sedang login, ganti password sendiri, dan keluar. */
export function AccountSection() {
  const user = useAdminUser();
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const mismatch = confirm.length > 0 && confirm !== password;

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/api/auth/password", { method: "PUT", body: { current, password } });
      setCurrent("");
      setPassword("");
      setConfirm("");
      toast.success("Password berhasil diganti. Perangkat lain otomatis keluar.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-bold">{user.name || user.username}</p>
          <p className="text-sm text-sky-200/70">
            @{user.username} · <span className="font-semibold text-gold-300">{ROLE_LABELS[user.role]}</span>
          </p>
          <p className="mt-0.5 text-xs text-white/45">{ROLE_DESCRIPTIONS[user.role]}</p>
        </div>
        <Button variant="ghost" onClick={logout} className="shrink-0">
          <LogOut className="size-4" aria-hidden="true" /> Keluar
        </Button>
      </div>
      <details className="group rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.08]">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between p-4 font-semibold">
          Ganti password saya
          <ChevronRight className="size-5 text-white/40 transition group-open:rotate-90" aria-hidden="true" />
        </summary>
        <form onSubmit={changePassword} className="space-y-4 border-t border-white/5 p-4">
          <Field label="Password saat ini">
            <TextInput type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
          </Field>
          <Field label="Password baru" help="Minimal 8 karakter. Perangkat lain yang memakai akun ini akan otomatis keluar.">
            <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </Field>
          <Field label="Ulangi password baru" help={mismatch ? "Password baru tidak sama" : undefined}>
            <TextInput type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          </Field>
          <Button
            type="submit"
            variant="gold"
            className="w-full"
            disabled={!current || password.length < 8 || confirm !== password}
            loading={saving}
          >
            Ganti password
          </Button>
        </form>
      </details>
    </Card>
  );
}

const ADMIN_LINKS = [
  { href: "/admin/pengguna", label: "Pengguna", desc: "Akun pengurus, peran, dan reset password", icon: UsersRound },
  { href: "/admin/riwayat", label: "Riwayat aktivitas", desc: "Siapa mengubah apa dan kapan", icon: History },
] as const;

export function AdminLinks() {
  const { role } = useAdminUser();
  if (!can(role, "users")) return null;
  return (
    <ul className="space-y-3">
      {ADMIN_LINKS.map(({ href, label, desc, icon }) => (
        <li key={href}>
          <Link
            href={href}
            className="card flex items-center gap-3 rounded-[24px] p-4 transition-[scale,background-color] duration-150 hover:bg-white/10 active:scale-[0.98]"
          >
            <IconTile icon={icon} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block font-bold">{label}</span>
              <span className="block text-[13px] text-sky-200/65">{desc}</span>
            </span>
            <ChevronRight className="size-5 text-white/30" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
