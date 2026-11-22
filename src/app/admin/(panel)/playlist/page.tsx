"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Pin } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/components/admin/api";
import { Card, PageHeader, Toggle } from "@/components/admin/ui";
import { MODULE_LABELS, type PlaylistItem } from "@/lib/types";

export default function PlaylistAdmin() {
  const [items, setItems] = useState<PlaylistItem[] | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await api<PlaylistItem[]>("/api/admin/playlist"));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, []);
  useEffect(() => {
    let alive = true;
    api<PlaylistItem[]>("/api/admin/playlist")
      .then((d) => alive && setItems(d))
      .catch((e: Error) => toast.error(e.message));
    return () => {
      alive = false;
    };
  }, []);

  const update = async (item: PlaylistItem, patch: Partial<PlaylistItem>) => {
    setItems((list) => list?.map((i) => (i.id === item.id ? { ...i, ...patch } : i)) ?? null);
    try {
      await api(`/api/admin/playlist/${item.id}`, { method: "PUT", body: patch });
    } catch (e) {
      toast.error((e as Error).message);
      load();
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    if (!items) return;
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    const renumbered = next.map((i, idx) => ({ ...i, sort: idx }));
    setItems(renumbered);
    try {
      await Promise.all(
        renumbered
          .filter((i, idx) => items[idx].id !== i.id)
          .map((i) => api(`/api/admin/playlist/${i.id}`, { method: "PUT", body: { sort: i.sort } })),
      );
    } catch (e) {
      toast.error((e as Error).message);
      load();
    }
  };

  const anyPinned = items?.some((i) => i.pinned && i.enabled);

  return (
    <div>
      <PageHeader
        title="Urutan Tampilan"
        description="Atur modul mana yang tampil duluan, berapa lama, atau sematkan agar tampil terus."
      />
      {anyPinned && (
        <div className="mb-4 flex gap-2 rounded-2xl bg-gold-400/10 p-3 text-sm text-gold-300 ring-1 ring-gold-400/30">
          <Pin className="mt-0.5 size-4 shrink-0" />
          Ada modul yang disematkan: hanya modul tersemat yang tampil (bergantian jika lebih dari satu).
        </div>
      )}
      <ol className="space-y-3">
        {items?.map((item, idx) => (
          <li key={item.id}>
            <Card className={item.enabled ? "" : "opacity-60"}>
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <button
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0}
                    className="grid size-8 place-items-center rounded-lg text-white/60 disabled:opacity-20"
                    aria-label="Naikkan"
                  >
                    <ChevronUp className="size-5" />
                  </button>
                  <button
                    onClick={() => move(idx, 1)}
                    disabled={idx === items.length - 1}
                    className="grid size-8 place-items-center rounded-lg text-white/60 disabled:opacity-20"
                    aria-label="Turunkan"
                  >
                    <ChevronDown className="size-5" />
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    <span className="mr-2 text-white/40 tabular-nums">{idx + 1}.</span>
                    {MODULE_LABELS[item.type]}
                  </p>
                  <label className="mt-1 flex items-center gap-2 text-sm text-white/60">
                    Durasi
                    <input
                      type="number"
                      inputMode="numeric"
                      min={5}
                      max={3600}
                      defaultValue={item.durationSec}
                      onBlur={(e) => {
                        const v = Math.min(3600, Math.max(5, Number(e.target.value) || 5));
                        e.target.value = String(v);
                        if (v !== item.durationSec) update(item, { durationSec: v });
                      }}
                      className="w-20 rounded-lg bg-navy-950/60 px-2 py-1.5 text-center text-white ring-1 ring-white/10"
                    />
                    detik{item.type === "slides" ? " / slide" : ""}
                  </label>
                </div>
                <button
                  onClick={() => update(item, { pinned: !item.pinned })}
                  className={`grid size-11 place-items-center rounded-xl transition ${
                    item.pinned ? "bg-gold-400 text-navy-950" : "bg-white/5 text-white/50"
                  }`}
                  aria-label={item.pinned ? "Lepas sematan" : "Sematkan (tampil terus)"}
                  aria-pressed={item.pinned}
                >
                  <Pin className="size-5" />
                </button>
              </div>
              <div className="mt-2 border-t border-white/5 pt-1">
                <Toggle label="Tampilkan di layar" checked={item.enabled} onChange={(v) => update(item, { enabled: v })} />
              </div>
            </Card>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-xs text-white/40">
        Modul tanpa konten (misalnya slide kosong) dilewati otomatis. Perubahan langsung berlaku di layar TV.
      </p>
    </div>
  );
}
