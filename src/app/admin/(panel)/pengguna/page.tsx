"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/components/admin/api";
import { useAdminUser } from "@/components/admin/AdminUser";
import { Button, Card, Field, PageHeader, Select, Sheet, TextInput, Toggle } from "@/components/admin/ui";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, ROLES, type Role } from "@/lib/permissions";
import type { UserRow } from "@/lib/users";

type Draft = { id?: number; username: string; name: string; role: Role; active: boolean; password: string };

const ROLE_OPTIONS = ROLES.map((r) => ({ value: r, label: `${ROLE_LABELS[r]} — ${ROLE_DESCRIPTIONS[r]}` }));

const formatTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "Belum pernah";

export default function PenggunaPage() {
  const me = useAdminUser();
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api<UserRow[]>("/api/admin/users")
      .then(setUsers)
      .catch((e) => toast.error(e.message));
  }, []);

  useEffect(load, [load]);

  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      if (draft.id) {
        const { name, role, active, password } = draft;
        await api(`/api/admin/users/${draft.id}`, { method: "PUT", body: { name, role, active, ...(password ? { password } : {}) } });
        toast.success(password ? "Akun diperbarui dan password direset" : "Akun diperbarui");
      } else {
        const { username, name, role, password } = draft;
        await api("/api/admin/users", { method: "POST", body: { username, name, role, password } });
        toast.success("Pengguna ditambahkan");
      }
      setDraft(null);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const isNew = !!draft && !draft.id;

  return (
    <div>
      <PageHeader
        title="Pengguna"
        description="Akun pengurus yang bisa masuk panel ini."
        action={
          <Button onClick={() => setDraft({ username: "", name: "", role: "konten", active: true, password: "" })}>
            <Plus className="size-5" /> Tambah
          </Button>
        }
      />
      {!users ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/5" />
          ))}
        </div>
      ) : (
        <ul className="space-y-3">
          {users.map((u) => (
            <li key={u.id}>
              <Card className={`flex items-start gap-3 ${u.active ? "" : "opacity-60"}`}>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">
                    {u.name || u.username}
                    {u.id === me.id && <span className="ml-2 text-xs font-semibold text-sky-200/60">(Anda)</span>}
                  </p>
                  <p className="text-sm text-sky-200/70">@{u.username}</p>
                  <p className="mt-2 flex flex-wrap gap-1.5 text-xs font-bold">
                    <span className="rounded-full bg-gold-400/15 px-2.5 py-1 text-gold-300">{ROLE_LABELS[u.role]}</span>
                    {!u.active && <span className="rounded-full bg-rose-500/15 px-2.5 py-1 text-rose-200">Nonaktif</span>}
                  </p>
                  <p className="mt-2 text-xs text-white/45">Login terakhir: {formatTime(u.lastLoginAt)}</p>
                </div>
                <button
                  onClick={() => setDraft({ ...u, password: "" })}
                  className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/5 text-sky-200"
                  aria-label={`Ubah ${u.username}`}
                >
                  <Pencil className="size-4" />
                </button>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={!!draft} onClose={() => setDraft(null)} title={isNew ? "Tambah pengguna" : `Ubah @${draft?.username ?? ""}`}>
        {draft && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            {isNew && (
              <Field label="Nama pengguna" help="Dipakai untuk login. 3–32 karakter: huruf kecil, angka, titik, minus, atau garis bawah.">
                <TextInput
                  value={draft.username}
                  onChange={(e) => set({ username: e.target.value.toLowerCase() })}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="off"
                  placeholder="mis. bendahara"
                />
              </Field>
            )}
            <Field label="Nama lengkap">
              <TextInput value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="mis. Ust. Ahmad" />
            </Field>
            <Field label="Peran">
              <Select value={draft.role} onChange={(e) => set({ role: e.target.value as Role })} options={ROLE_OPTIONS} />
            </Field>
            {!isNew && draft.id !== me.id && (
              <Toggle label="Akun aktif (bisa login)" checked={draft.active} onChange={(active) => set({ active })} />
            )}
            <Field
              label={isNew ? "Password awal" : "Reset password (opsional)"}
              help={
                isNew
                  ? "Minimal 8 karakter. Sampaikan ke pengurus yang bersangkutan, lalu minta diganti lewat Pengaturan."
                  : "Kosongkan bila tidak direset. Bila diisi, akun ini otomatis keluar dari semua perangkat."
              }
            >
              <TextInput type="password" value={draft.password} onChange={(e) => set({ password: e.target.value })} autoComplete="new-password" />
            </Field>
            <Button
              type="submit"
              className="w-full"
              loading={saving}
              disabled={(isNew && !draft.username.trim()) || (isNew ? draft.password.length < 8 : !!draft.password && draft.password.length < 8)}
            >
              {isNew ? "Tambah pengguna" : "Simpan perubahan"}
            </Button>
          </form>
        )}
      </Sheet>
    </div>
  );
}
