"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { ChevronDown, ChevronUp, Copy, ExternalLink, KeyRound, Pin, Video } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/components/admin/api";
import { Button, Card, Field, PageHeader, Select, TextInput, Toggle } from "@/components/admin/ui";
import { DisplayPreview } from "@/components/admin/DisplayPreview";
import { TvPicker, copyText } from "@/components/admin/TvPicker";
import type { DisplayRecord } from "@/lib/displays";
import {
  CAMERA_MODES,
  CAMERA_MODE_LABELS,
  DISPLAY_IDS,
  MODULE_LABELS,
  displayLabel,
  type CameraMode,
  type DisplayId,
  type PlaylistItem,
} from "@/lib/types";

const CAMERA_MODE_HELP: Record<CameraMode, string> = {
  replace: "Selama siaran kamera, giliran Live Ka'bah di urutan tampilan diisi kamera masjid.",
  focus: "Selama siaran kamera, layar ini hanya menampilkan kamera masjid sampai siaran selesai.",
  off: "Layar ini tetap menampilkan Live Ka'bah walau ada siaran kamera.",
};

const subscribeNothing = () => () => {};
const useOrigin = () =>
  useSyncExternalStore(
    subscribeNothing,
    () => location.origin,
    () => "",
  );

export default function TampilanAdmin() {
  const [tv, setTv] = useState<DisplayId>(1);
  const [displays, setDisplays] = useState<DisplayRecord[] | null>(null);
  // Urutan tampilan per layar; disimpan per TV agar pindah tab tidak menampilkan daftar layar lain.
  const [lists, setLists] = useState<Partial<Record<DisplayId, PlaylistItem[]>>>({});
  const items = lists[tv] ?? null;
  const record = displays?.find((d) => d.id === tv) ?? null;

  useEffect(() => {
    let alive = true;
    api<DisplayRecord[]>("/api/admin/displays")
      .then((d) => alive && setDisplays(d))
      .catch((e: Error) => toast.error(e.message));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    api<PlaylistItem[]>(`/api/admin/playlist?tv=${tv}`)
      .then((d) => alive && setLists((l) => ({ ...l, [tv]: d })))
      .catch((e: Error) => toast.error(e.message));
    return () => {
      alive = false;
    };
  }, [tv]);

  const reload = (id: DisplayId) =>
    api<PlaylistItem[]>(`/api/admin/playlist?tv=${id}`)
      .then((d) => setLists((l) => ({ ...l, [id]: d })))
      .catch((e: Error) => toast.error(e.message));

  const setItems = (id: DisplayId, next: PlaylistItem[]) => setLists((l) => ({ ...l, [id]: next }));

  const update = async (item: PlaylistItem, patch: Partial<PlaylistItem>) => {
    const id = tv;
    setLists((l) => ({ ...l, [id]: l[id]?.map((i) => (i.id === item.id ? { ...i, ...patch } : i)) }));
    try {
      await api(`/api/admin/playlist/${item.id}`, { method: "PUT", body: patch });
    } catch (e) {
      toast.error((e as Error).message);
      reload(id);
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const id = tv;
    if (!items) return;
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    const renumbered = next.map((i, idx) => ({ ...i, sort: idx }));
    setItems(id, renumbered);
    try {
      await Promise.all(
        renumbered
          .filter((i, idx) => items[idx].id !== i.id)
          .map((i) => api(`/api/admin/playlist/${i.id}`, { method: "PUT", body: { sort: i.sort } })),
      );
    } catch (e) {
      toast.error((e as Error).message);
      reload(id);
    }
  };

  const anyPinned = items?.some((i) => i.pinned && i.enabled);
  const cameraMode = record?.cameraMode ?? "replace";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tampilan Layar TV"
        description="Tiap layar punya urutan modul dan pengaturan sendiri. Perubahan langsung berlaku di TV."
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 xl:items-start">
        <div className="min-w-0 space-y-5">
          <TvPicker
            label="Pilih layar TV"
            value={tv}
            onChange={setTv}
            options={DISPLAY_IDS.map((id) => ({ value: id, label: `TV ${id}` }))}
          />
          <DisplayPreview tv={tv} />

          {record ? (
            <ScreenSettings
              key={record.id}
              record={record}
              onSaved={(next) => setDisplays((list) => list?.map((d) => (d.id === next.id ? next : d)) ?? null)}
            />
          ) : (
            <Card className="text-sm text-white/55">Memuat pengaturan layar…</Card>
          )}
        </div>

        <div className="min-w-0 space-y-5">
          <section aria-labelledby="urutan-tampilan">
            <h2 id="urutan-tampilan" className="mb-1 text-lg font-extrabold">
              Urutan tampilan {record ? displayLabel(record) : `TV ${tv}`}
            </h2>
            <p className="mb-3 text-sm text-sky-200/70">Atur modul mana yang tampil duluan, berapa lama, atau sematkan agar tampil terus.</p>
            {anyPinned && (
              <div className="mb-3 flex gap-2 rounded-2xl bg-gold-400/10 p-3 text-sm text-gold-300 ring-1 ring-gold-400/30">
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
                          aria-label={`Naikkan ${MODULE_LABELS[item.type]}`}
                        >
                          <ChevronUp className="size-5" />
                        </button>
                        <button
                          onClick={() => move(idx, 1)}
                          disabled={idx === items.length - 1}
                          className="grid size-8 place-items-center rounded-lg text-white/60 disabled:opacity-20"
                          aria-label={`Turunkan ${MODULE_LABELS[item.type]}`}
                        >
                          <ChevronDown className="size-5" />
                        </button>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">
                          <span className="mr-2 text-muted tabular-nums">{idx + 1}.</span>
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
                        {item.type === "kabah" && cameraMode !== "off" && (
                          <p className="mt-1.5 flex items-start gap-1.5 text-xs text-sky-200/70">
                            <Video className="mt-px size-3.5 shrink-0" aria-hidden="true" />
                            {cameraMode === "replace" && !item.enabled
                              ? "Aktifkan agar siaran kamera masjid bisa tampil di layar ini."
                              : "Diisi kamera masjid selama ada siaran kamera."}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => update(item, { pinned: !item.pinned })}
                        className={`grid size-11 place-items-center rounded-xl transition ${
                          item.pinned ? "bg-gold-400 text-navy-950" : "bg-white/5 text-white/50"
                        }`}
                        aria-label={item.pinned ? `Lepas sematan ${MODULE_LABELS[item.type]}` : `Sematkan ${MODULE_LABELS[item.type]} (tampil terus)`}
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
          </section>
          <p className="text-xs text-muted">Modul tanpa konten (misalnya slide kosong) dilewati otomatis.</p>
        </div>
      </div>
    </div>
  );
}

/** Nama layar, perilaku siaran kamera, suara, dan tautan berkunci untuk dibuka di browser TV. */
function ScreenSettings({ record, onSaved }: { record: DisplayRecord; onSaved: (next: DisplayRecord) => void }) {
  const origin = useOrigin();
  const [name, setName] = useState(record.name);
  const [busy, setBusy] = useState<string | null>(null);
  const link = `${origin}/display/${record.id}?kunci=${record.accessKey}`;

  const save = async (patch: Record<string, unknown>, what: string, success: string): Promise<DisplayRecord | null> => {
    setBusy(what);
    try {
      const next = await api<DisplayRecord>(`/api/admin/displays/${record.id}`, { method: "PUT", body: patch });
      onSaved(next);
      toast.success(success);
      return next;
    } catch (e) {
      toast.error((e as Error).message);
      return null;
    } finally {
      setBusy(null);
    }
  };

  const saveName = async () => {
    const next = name.trim();
    if (next === record.name) return setName(next);
    const saved = await save({ name: next }, "name", "Nama layar disimpan");
    setName(saved?.name ?? record.name);
  };

  const rotate = () => {
    const ok = confirm(
      `Buat kunci baru untuk ${displayLabel(record)}? Layar yang memakai tautan lama tetap tampil, tetapi tidak menerima siaran kamera sampai dibuka dengan tautan baru.`,
    );
    if (ok) save({ rotateKey: true }, "key", "Kunci baru dibuat. Buka tautan baru di TV.");
  };

  const copy = async () => {
    if (await copyText(link)) toast.success("Tautan layar disalin");
    else toast.error("Gagal menyalin. Salin manual dari kotak tautan.");
  };

  return (
    <Card className="space-y-4">
      <h2 className="font-bold">Pengaturan {displayLabel(record)}</h2>
      <Field label="Nama layar" help="Contoh: Ruang utama, Selasar, Lantai 2. Kosongkan untuk memakai “TV n”.">
        <TextInput
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          disabled={busy === "name"}
        />
      </Field>
      <Field label="Siaran kamera masjid" help={CAMERA_MODE_HELP[record.cameraMode]}>
        <Select
          value={record.cameraMode}
          disabled={busy === "mode"}
          onChange={(e) => save({ cameraMode: e.target.value }, "mode", "Pengaturan kamera disimpan")}
          options={CAMERA_MODES.map((m) => ({ value: m, label: CAMERA_MODE_LABELS[m] }))}
        />
      </Field>
      <div>
        <Toggle
          label="Suara video di layar ini"
          checked={record.sound}
          onChange={(v) => save({ sound: v }, "sound", v ? "Suara layar dinyalakan" : "Suara layar dimatikan")}
        />
        <p className="text-xs text-muted">Berlaku untuk Live Ka&apos;bah dan siaran kamera. Matikan bila TV berdekatan agar suara tidak dobel.</p>
      </div>
      <div>
        <p className="mb-1.5 text-sm font-medium text-white/80">Tautan layar</p>
        <p className="rounded-2xl bg-navy-950/70 px-4 py-3 font-mono text-sm break-all text-sky-100 ring-1 ring-white/10">{link}</p>
        <p className="mt-1 text-xs text-muted">
          Buka sekali di browser TV ini. Kunci di tautan tersimpan di TV dan diperlukan agar layar bisa menerima siaran kamera.
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Button variant="ghost" onClick={copy}>
            <Copy className="size-4" aria-hidden="true" /> Salin
          </Button>
          <a
            href={link}
            target="_blank"
            rel="noopener"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white/[0.07] px-5 text-sm font-bold text-white ring-1 ring-white/10 transition-[scale,background-color] duration-150 hover:bg-white/12 active:scale-[0.96]"
          >
            <ExternalLink className="size-4" aria-hidden="true" /> Buka
          </a>
          <Button variant="ghost" loading={busy === "key"} onClick={rotate}>
            {busy !== "key" && <KeyRound className="size-4" aria-hidden="true" />} Kunci baru
          </Button>
        </div>
      </div>
    </Card>
  );
}
