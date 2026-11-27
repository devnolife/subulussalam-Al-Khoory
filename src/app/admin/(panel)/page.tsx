"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellRing, CalendarClock, ExternalLink, LogOut, MonitorPlay, RefreshCw, RotateCw, Square } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/components/admin/api";
import { Button, Card, PageHeader, Select, TextArea } from "@/components/admin/ui";
import { DisplayPreview } from "@/components/admin/DisplayPreview";
import { SummaryCards } from "@/components/admin/SummaryCards";
import { IconTile } from "@/components/display/ui";
import { FARDH_KEYS, MODULE_LABELS, MODULE_TYPES, PRAYER_LABELS, type Settings } from "@/lib/types";

type Status = { connected: number; lastSeen: number | null };

export default function RemotePage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
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

  const command = async (body: Record<string, unknown>, success: string) => {
    setBusy(String(body.action));
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

  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" });
    router.replace("/admin/login");
  };

  const override = settings?.override;
  const overrideActive = !!override?.type && (!override.until || override.until > now);
  const manual = settings?.manualPrayer;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Remote Layar"
        description={settings?.mosque.name}
        action={
          <button onClick={logout} className="grid size-11 place-items-center rounded-xl bg-white/5 text-white/60" aria-label="Keluar">
            <LogOut className="size-5" />
          </button>
        }
      />

      <div className="space-y-3">
        <DisplayPreview />
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="flex items-center gap-2">
            <span className={`size-2.5 rounded-full ${status?.connected ? "bg-emerald-400" : "bg-rose-400"}`} />
            {status?.connected ? `${status.connected} layar TV terhubung` : "Tidak ada layar TV terhubung"}
          </span>
          <Link href="/display" target="_blank" className="flex items-center gap-1 text-sky-300">
            Buka layar <ExternalLink className="size-3.5" />
          </Link>
        </div>
      </div>

      <SummaryCards />

      <Card className="space-y-3">
        <h2 className="flex items-center gap-3 font-bold">
          <IconTile icon={MonitorPlay} size="sm" /> Tampilkan sekarang
        </h2>
        {overrideActive && override?.type && (
          <div className="flex items-center justify-between gap-2 rounded-2xl bg-royal-600/25 p-3 text-sm ring-1 ring-royal-500/40">
            <span>
              Sedang dikunci: <b>{MODULE_LABELS[override.type]}</b>
              {override.until ? ` s/d ${new Date(override.until).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}` : ""}
            </span>
            <Button variant="ghost" loading={busy === "clearShow"} onClick={() => command({ action: "clearShow" }, "Kembali ke rotasi otomatis")}>
              <Square className="size-4" /> Lepas
            </Button>
          </div>
        )}
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
          onClick={() => command({ action: "show", type: showType, minutes: Number(showMinutes) }, "Ditampilkan di layar")}
        >
          Tampilkan di TV
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
              Tampilkan di atas layar
            </Button>
          </>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="flex items-center gap-3 font-bold">
          <IconTile icon={CalendarClock} size="sm" /> Mode sholat manual
        </h2>
        <p className="text-sm text-white/55">
          Mode sholat berjalan otomatis sesuai jadwal. Gunakan ini bila waktu pelaksanaan berbeda (mis. sholat tarawih/ied).
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
        <Button variant="ghost" loading={busy === "reload"} onClick={() => command({ action: "reload" }, "Layar TV dimuat ulang")}>
          <RotateCw className="size-4" /> Muat ulang TV
        </Button>
        <Button variant="ghost" loading={busy === "refreshPrayer"} onClick={() => command({ action: "refreshPrayer" }, "Jadwal sholat diperbarui")}>
          <RefreshCw className="size-4" /> Perbarui jadwal
        </Button>
      </div>
      <p className="text-center text-xs text-white/40">
        Tips: buka /display di browser TV dalam mode layar penuh (F11) atau mode kiosk.
      </p>
    </div>
  );
}
