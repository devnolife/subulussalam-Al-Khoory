"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BellRing, CalendarClock, ExternalLink, MonitorPlay, RefreshCw, RotateCw, Square, Video } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/components/admin/api";
import { Button, Card, PageHeader, Select, TextArea } from "@/components/admin/ui";
import { DisplayPreview } from "@/components/admin/DisplayPreview";
import { TvPicker } from "@/components/admin/TvPicker";
import { IconTile } from "@/components/display/ui";
import type { CameraStatus } from "@/lib/camera-protocol";
import {
  DISPLAY_IDS,
  FARDH_KEYS,
  MODULE_LABELS,
  MODULE_TYPES,
  PRAYER_LABELS,
  displayLabel,
  type DisplayId,
  type ScreenStatus,
  type Settings,
} from "@/lib/types";

type Status = { connected: number; displays: ScreenStatus[]; camera: CameraStatus };
/** 0 = semua layar TV. */
type Target = DisplayId | 0;

const clock = (ms: number) => new Date(ms).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
const linkButton =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-bold transition-[scale,background-color] duration-150 active:scale-[0.96]";

export default function RemotePage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [target, setTarget] = useState<Target>(0);
  const [showType, setShowType] = useState<string>("kabah");
  const [showMinutes, setShowMinutes] = useState("15");
  const [emergencyText, setEmergencyText] = useState("");
  const [prayer, setPrayer] = useState<string>("dzuhur");
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      const [s, st] = await Promise.all([api<Settings>("/api/admin/settings"), api<Status>("/api/admin/status")]);
      setSettings(s);
      setStatus(st);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    Promise.all([api<Settings>("/api/admin/settings"), api<Status>("/api/admin/status")])
      .then(([s, st]) => {
        if (!alive) return;
        setSettings(s);
        setStatus(st);
      })
      .catch((e: Error) => toast.error(e.message));
    const iv = setInterval(() => {
      setNow(Date.now());
      api<Status>("/api/admin/status").then(setStatus).catch(() => {});
    }, 10_000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  const command = async (body: Record<string, unknown>, success: string, key = String(body.action)) => {
    setBusy(key);
    try {
      await api("/api/admin/command", { method: "POST", body });
      toast.success(success);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const stopCamera = async (session: string) => {
    setBusy("camera");
    try {
      await api("/api/admin/camera", { method: "POST", body: { action: "stop", session } });
      toast.success("Siaran kamera dihentikan");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const screens = status?.displays ?? [];
  const screenOf = (id: DisplayId) => screens.find((d) => d.id === id) ?? { id, name: `TV ${id}` };
  const targetLabel = target ? displayLabel(screenOf(target)) : "semua layar TV";
  const targetBody = target ? { tv: target } : {};
  const shown = target ? screens.filter((d) => d.id === target) : screens;
  const unkeyed = shown.some((d) => d.connected > d.keyed);
  const camera = status?.camera;
  const manual = settings?.manualPrayer;

  return (
    <div>
      <PageHeader title="Remote Layar" description="Kendali langsung TV 1–3: modul tampilan, pesan darurat, dan mode sholat." />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 xl:items-start">
        <div className="min-w-0 space-y-5">
          <div className="space-y-3">
            <TvPicker
              label="Layar tujuan"
              value={target}
              onChange={setTarget}
              options={[
                { value: 0 as Target, label: "Semua" },
                ...DISPLAY_IDS.map((id) => ({
                  value: id as Target,
                  label: `TV ${id}`,
                  online: (screens.find((d) => d.id === id)?.connected ?? 0) > 0,
                })),
              ]}
            />
            <DisplayPreview tv={target || 1} />
            {!target && <p className="text-xs text-muted">Pratinjau menampilkan TV 1. Pilih TV untuk melihat layar lainnya.</p>}
            <ul className="space-y-2">
              {shown.map((d) => {
                const active = !!d.override.type && (!d.override.until || d.override.until > now);
                return (
                  <li key={d.id} className="rounded-2xl bg-white/[0.04] p-3 ring-1 ring-white/10">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-bold">{displayLabel(d)}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-white/60">
                          <span className={`size-2 shrink-0 rounded-full ${d.connected ? "bg-emerald-400" : "bg-rose-400"}`} aria-hidden="true" />
                          {d.connected ? `${d.connected} perangkat terhubung` : "Tidak terhubung"}
                          {d.connected > d.keyed && <span className="text-gold-300">· {d.connected - d.keyed} tanpa kunci</span>}
                        </p>
                      </div>
                      <Link href={`/display/${d.id}`} target="_blank" className="flex shrink-0 items-center gap-1 text-sm text-sky-300">
                        Buka <ExternalLink className="size-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                    {active && d.override.type && (
                      <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-royal-600/25 p-2.5 text-sm ring-1 ring-royal-500/40">
                        <span>
                          Dikunci: <b>{MODULE_LABELS[d.override.type]}</b>
                          {d.override.until ? ` s/d ${clock(d.override.until)}` : ""}
                        </span>
                        <Button
                          variant="ghost"
                          loading={busy === `clearShow:${d.id}`}
                          onClick={() => command({ action: "clearShow", tv: d.id }, `${displayLabel(d)} kembali ke urutan tampilan`, `clearShow:${d.id}`)}
                        >
                          <Square className="size-4" /> Lepas
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            {unkeyed && (
              <p className="text-xs text-muted">
                Perangkat tanpa kunci tetap tampil, tetapi tidak menerima siaran kamera. Buka tautan berkunci dari menu Tampilan di TV tersebut.
              </p>
            )}
          </div>

          <Card className="space-y-3">
            <h2 className="flex items-center gap-3 font-bold">
              <IconTile icon={Video} size="sm" /> Kamera masjid
            </h2>
            {camera?.live ? (
              <>
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-xs font-extrabold tracking-wider text-white">
                    <span className="size-1.5 animate-soft-pulse rounded-full bg-white" aria-hidden="true" />
                    LIVE
                  </span>
                  Sejak {clock(camera.startedAt)} oleh {camera.by}
                </p>
                {!camera.connected && (
                  <p className="rounded-2xl bg-gold-400/10 p-3 text-sm text-gold-300 ring-1 ring-gold-400/30">
                    Perangkat kamera terputus. Siaran berakhir otomatis bila tidak tersambung lagi dalam 15 detik.
                  </p>
                )}
                <p className="text-sm text-white/60">
                  {camera.viewers.length
                    ? `Tampil di ${[...new Set(camera.viewers.map((v) => v.tv))]
                        .sort()
                        .map((id) => displayLabel(screenOf(id)))
                        .join(", ")}`
                    : "Belum tampil di layar mana pun. Layar menampilkan kamera saat giliran Live Ka'bah, atau terus bila diatur begitu di menu Tampilan."}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/admin/kamera" className={`${linkButton} bg-white/[0.07] text-white ring-1 ring-white/10 hover:bg-white/12`}>
                    Halaman kamera
                  </Link>
                  <Button variant="danger" loading={busy === "camera"} onClick={() => stopCamera(camera.id)}>
                    Hentikan siaran
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-white/55">
                  Siarkan video langsung dari HP atau laptop berkamera ke layar TV, menggantikan Live Ka&apos;bah untuk sementara (mis. saat khutbah atau
                  kajian).
                </p>
                <Link href="/admin/kamera" className={`${linkButton} w-full bg-royal-600 text-white hover:bg-royal-500`}>
                  <Video className="size-4" aria-hidden="true" /> Mulai siaran kamera
                </Link>
              </>
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-5">
          <Card className="space-y-3">
            <div>
              <h2 className="flex items-center gap-3 font-bold">
                <IconTile icon={MonitorPlay} size="sm" /> Tampilkan sekarang
              </h2>
              <p className="mt-2 text-sm text-white/55">
                Di <b className="text-white">{targetLabel}</b>. Ganti lewat pilihan Layar tujuan.
              </p>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Select
                value={showType}
                onChange={(e) => setShowType(e.target.value)}
                options={MODULE_TYPES.map((t) => ({ value: t, label: MODULE_LABELS[t] }))}
                aria-label="Modul"
              />
              <Select
                value={showMinutes}
                onChange={(e) => setShowMinutes(e.target.value)}
                aria-label="Lama"
                options={[
                  { value: "5", label: "5 mnt" },
                  { value: "15", label: "15 mnt" },
                  { value: "30", label: "30 mnt" },
                  { value: "60", label: "1 jam" },
                  { value: "0", label: "Terus" },
                ]}
              />
            </div>
            <Button
              className="w-full"
              loading={busy === "show"}
              onClick={() =>
                command({ action: "show", type: showType, minutes: Number(showMinutes), ...targetBody }, `Ditampilkan di ${targetLabel}`)
              }
            >
              Tampilkan di {target ? `TV ${target}` : "semua TV"}
            </Button>
          </Card>

          <Card className="space-y-3">
            <h2 className="flex items-center gap-3 font-bold">
              <IconTile icon={BellRing} tone="bata" size="sm" /> Pengumuman darurat
            </h2>
            {settings?.emergency.active ? (
              <>
                <p className="rounded-2xl bg-bata-700/35 p-3 text-sm whitespace-pre-line text-bata-200 ring-1 ring-bata-400/40">{settings.emergency.text}</p>
                <Button
                  variant="danger"
                  className="w-full"
                  loading={busy === "clearEmergency"}
                  onClick={() => command({ action: "clearEmergency" }, "Pengumuman darurat dihentikan")}
                >
                  Hentikan
                </Button>
              </>
            ) : (
              <>
                <TextArea
                  value={emergencyText}
                  onChange={(e) => setEmergencyText(e.target.value)}
                  placeholder="Contoh: Telah berpulang ke rahmatullah…"
                  aria-label="Teks pengumuman darurat"
                />
                <Button
                  variant="gold"
                  className="w-full"
                  disabled={!emergencyText.trim()}
                  loading={busy === "emergency"}
                  onClick={() => command({ action: "emergency", text: emergencyText }, "Pengumuman darurat tampil").then(() => setEmergencyText(""))}
                >
                  Tampilkan di semua layar
                </Button>
              </>
            )}
          </Card>

          <Card className="space-y-3">
            <h2 className="flex items-center gap-3 font-bold">
              <IconTile icon={CalendarClock} size="sm" /> Mode sholat manual
            </h2>
            <p className="text-sm text-white/55">
              Mode sholat berjalan otomatis sesuai jadwal di semua layar. Gunakan ini bila waktu pelaksanaan berbeda (mis. sholat tarawih/ied).
            </p>
            {manual?.prayer ? (
              <Button variant="danger" className="w-full" loading={busy === "clearPrayer"} onClick={() => command({ action: "clearPrayer" }, "Mode sholat manual dihentikan")}>
                Hentikan mode {PRAYER_LABELS[manual.prayer]}
              </Button>
            ) : (
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <Select value={prayer} onChange={(e) => setPrayer(e.target.value)} options={FARDH_KEYS.map((k) => ({ value: k, label: PRAYER_LABELS[k] }))} aria-label="Waktu sholat" />
                <Button loading={busy === "prayer"} onClick={() => command({ action: "prayer", prayer }, "Mode adzan dimulai")}>
                  Mulai adzan
                </Button>
              </div>
            )}
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="ghost"
              loading={busy === "reload"}
              onClick={() => command({ action: "reload", ...targetBody }, target ? `${targetLabel} dimuat ulang` : "Semua layar TV dimuat ulang")}
            >
              <RotateCw className="size-4" /> Muat ulang {target ? `TV ${target}` : "semua TV"}
            </Button>
            <Button variant="ghost" loading={busy === "refreshPrayer"} onClick={() => command({ action: "refreshPrayer" }, "Jadwal sholat diperbarui")}>
              <RefreshCw className="size-4" /> Perbarui jadwal
            </Button>
          </div>
          <p className="text-center text-xs text-muted">
            Tips: buka tautan layar dari menu Tampilan di browser TV, lalu jadikan layar penuh (F11) atau mode kiosk.
          </p>
        </div>
      </div>
    </div>
  );
}
