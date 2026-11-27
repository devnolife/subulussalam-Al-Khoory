"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "./api";
import { Button, Card, EmptyState, Field, ImageField, PageHeader, Select, Sheet, TextArea, TextInput, Toggle } from "./ui";

type Option = { value: string; label: string };
type Row = { id: number } & Record<string, unknown>;
/** Data resource lain yang dimuat sekali (mis. kategori untuk pilihan select). */
export type Lookups = Record<string, Row[]>;

export type FieldDef = {
  name: string;
  label: string;
  type: "text" | "textarea" | "arabic" | "date" | "number" | "bool" | "select" | "image";
  options?: Option[] | ((record: Record<string, unknown>, lookups: Lookups) => Option[]);
  /** Field hanya tampil bila bernilai true untuk data yang sedang diisi. */
  show?: (record: Record<string, unknown>) => boolean;
  placeholder?: string;
  help?: string;
};

/** Halaman daftar + form tambah/ubah/hapus yang dipakai semua modul konten. */
export function CrudPage<T extends Row>({
  resource,
  title,
  description,
  fields,
  defaults,
  renderItem,
  header,
  lookups,
  prepare,
}: {
  resource: string;
  title: string;
  description?: string;
  fields: FieldDef[];
  defaults: () => Record<string, unknown>;
  renderItem: (item: T, lookups: Lookups) => ReactNode;
  header?: (items: T[], lookups: Lookups) => ReactNode;
  /** Resource lain yang perlu dimuat, tersedia di `lookups[nama]`. */
  lookups?: string[];
  /** Merapikan data sebelum disimpan. */
  prepare?: (payload: Record<string, unknown>, lookups: Lookups) => Record<string, unknown>;
}) {
  const [items, setItems] = useState<T[] | null>(null);
  const [lookupData, setLookupData] = useState<Lookups>({});
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);
  const lookupKey = (lookups ?? []).join(",");

  const load = useCallback(async () => {
    try {
      setItems(await api<T[]>(`/api/admin/${resource}`));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [resource]);

  useEffect(() => {
    let alive = true;
    const names = lookupKey ? lookupKey.split(",") : [];
    Promise.all([api<T[]>(`/api/admin/${resource}`), Promise.all(names.map((n) => api<Row[]>(`/api/admin/${n}`)))])
      .then(([d, extra]) => {
        if (!alive) return;
        setItems(d);
        setLookupData(Object.fromEntries(names.map((n, i) => [n, extra[i]])));
      })
      .catch((e: Error) => toast.error(e.message));
    return () => {
      alive = false;
    };
  }, [resource, lookupKey]);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const { id, ...body } = editing;
      const raw = Object.fromEntries(fields.map((f) => [f.name, body[f.name]]));
      const payload = prepare ? prepare(raw, lookupData) : raw;
      if (id) await api(`/api/admin/${resource}/${id}`, { method: "PUT", body: payload });
      else await api(`/api/admin/${resource}`, { method: "POST", body: payload });
      toast.success("Tersimpan & tampil di layar");
      setEditing(null);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: T) => {
    if (!confirm("Hapus data ini?")) return;
    try {
      await api(`/api/admin/${resource}/${item.id}`, { method: "DELETE" });
      toast.success("Dihapus");
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const set = (name: string, value: unknown) => setEditing((e) => (e ? { ...e, [name]: value } : e));

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        action={
          <Button onClick={() => setEditing(defaults())} aria-label="Tambah">
            <Plus className="size-5" /> Tambah
          </Button>
        }
      />
      {items && header?.(items, lookupData)}
      {!items ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/5" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState>Belum ada data. Ketuk &ldquo;Tambah&rdquo; untuk mulai.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <Card className="flex items-start gap-3">
                <div className="min-w-0 flex-1">{renderItem(item, lookupData)}</div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => setEditing({ ...item })}
                    className="grid size-10 place-items-center rounded-xl bg-white/5 text-sky-200"
                    aria-label="Ubah"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    onClick={() => remove(item)}
                    className="grid size-10 place-items-center rounded-xl bg-rose-500/10 text-rose-300"
                    aria-label="Hapus"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? `Ubah ${title}` : `Tambah ${title}`}>
        {editing && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            {fields
              .filter((f) => !f.show || f.show(editing))
              .map((f) => {
                const v = editing[f.name];
                if (f.type === "bool") {
                  return <Toggle key={f.name} label={f.label} checked={!!v} onChange={(val) => set(f.name, val)} />;
                }
                const options = typeof f.options === "function" ? f.options(editing, lookupData) : (f.options ?? []);
                return (
                  <Field key={f.name} label={f.label} help={f.help}>
                    {f.type === "textarea" || f.type === "arabic" ? (
                      <TextArea
                        value={String(v ?? "")}
                        onChange={(e) => set(f.name, e.target.value)}
                        placeholder={f.placeholder}
                        dir={f.type === "arabic" ? "rtl" : undefined}
                        className={f.type === "arabic" ? "font-arabic text-2xl leading-loose" : ""}
                        rows={f.type === "arabic" ? 4 : 3}
                      />
                    ) : f.type === "select" ? (
                      <Select value={String(v ?? "")} onChange={(e) => set(f.name, e.target.value)} options={options} />
                    ) : f.type === "image" ? (
                      <ImageField value={(v as string) || null} onChange={(url) => set(f.name, url ?? "")} />
                    ) : (
                      <TextInput
                        type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                        inputMode={f.type === "number" ? "numeric" : undefined}
                        value={String(v ?? "")}
                        onChange={(e) =>
                          set(f.name, f.type === "number" ? e.target.value.replace(/[^\d-]/g, "") : e.target.value)
                        }
                        placeholder={f.placeholder}
                      />
                    )}
                  </Field>
                );
              })}
            <Button type="submit" loading={saving} className="w-full">
              Simpan
            </Button>
          </form>
        )}
      </Sheet>
    </div>
  );
}
