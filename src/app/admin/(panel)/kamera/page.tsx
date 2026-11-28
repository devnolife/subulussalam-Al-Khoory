"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Camera, ChevronLeft, Info, MonitorPlay, ShieldAlert, VideoOff } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/components/admin/api";
import { Broadcaster, type ViewerState } from "@/components/admin/broadcaster";
import { Button, Card, Field, PageHeader, Select, Toggle } from "@/components/admin/ui";
import { IconTile } from "@/components/display/ui";
import type { CameraStatus, EndReason } from "@/lib/camera-protocol";
import { displayLabel, type IceServer, type ScreenStatus } from "@/lib/types";

type Quality = "480" | "720" | "1080";
const QUALITY: Record<Quality, { label: string; width: number; height: number }> = {
  "480": { label: "Hemat · 480p", width: 854, height: 480 },
  "720": { label: "Standar · 720p", width: 1280, height: 720 },
  "1080": { label: "Tinggi · 1080p", width: 1920, height: 1080 },
};

type Status = { displays: ScreenStatus[]; camera: CameraStatus };
/** `since` memakai jam perangkat ini agar durasi siaran tidak terpengaruh selisih jam dengan server. */
type Live = { session: string; startedAt: number; since: number; audio: boolean };
type Support = "ok" | "insecure" | "unsupported";
type Tone = "on" | "wait" | "warn" | "off";

const DOT: Record<Tone, string> = { on: "bg-emerald-400", wait: "bg-white/45", warn: "bg-gold-400", off: "bg-white/20" };
/** Percobaan menyambung ulang otomatis sebelum menyerah. */
const MAX_RETRIES = 5;

const subscribeNothing = () => () => {};
const readSupport = (): Support =>
  !window.isSecureContext ? "insecure" : typeof navigator.mediaDevices?.getUserMedia === "function" ? "ok" : "unsupported";

const clock = (ms: number) => new Date(ms).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
const pad = (n: number) => String(n).padStart(2, "0");
function elapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
}

function videoConstraints(deviceId: string, quality: Quality): MediaTrackConstraints {
  const { width, height } = QUALITY[quality];
  return {
    // Tanpa pilihan, HP memakai kamera belakang.
    ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: "environment" } }),
    width: { ideal: width },
    height: { ideal: height },
    frameRate: { ideal: 30, max: 30 },
  };
}

function mediaError(e: unknown, what: "Kamera" | "Mikrofon"): string {
  switch (e instanceof DOMException ? e.name : "") {
    case "NotAllowedError":
    case "SecurityError":
      return `Izin ${what.toLowerCase()} ditolak. Izinkan lewat pengaturan situs di browser, lalu coba lagi.`;
    case "NotFoundError":
      return `${what} tidak ditemukan di perangkat ini.`;
    case "OverconstrainedError":
      return `${what} yang dipilih tidak tersedia. Pilih yang lain.`;
    case "NotReadableError":
    case "AbortError":
      return `${what} sedang dipakai aplikasi lain. Tutup aplikasi tersebut lalu coba lagi.`;
    default:
      return `${what} tidak bisa dibuka. Muat ulang halaman ini lalu coba lagi.`;
  }
}

/** Hentikan siaran tanpa menunggu jawaban; tetap terkirim walau halaman sedang ditutup. */
function stopSession(session: string) {
  fetch("/api/admin/camera", {
    method: "POST",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "stop", session }),
  }).catch(() => {});
}

/** Keadaan satu layar TV terhadap siaran kamera, dalam bahasa pengurus. */
function screenState(d: ScreenStatus, peers: ViewerState[], live: boolean): { label: string; tone: Tone } {
  if (d.cameraMode === "off") return { label: "Diatur tidak menampilkan kamera", tone: "off" };
  if (live && peers.some((p) => p.state === "connected")) return { label: "Menampilkan kamera", tone: "on" };
  if (!d.connected) return { label: "TV tidak terhubung", tone: "off" };
  if (!d.keyed) return { label: "Buka tautan berkunci di TV ini", tone: "warn" };
  const turn = d.cameraMode === "focus" ? "tampil terus selama siaran" : "tampil di giliran Live Ka'bah";
  if (!live) return { label: `Siap · ${turn}`, tone: "wait" };
  if (peers.some((p) => p.state === "failed")) return { label: "Gagal tersambung, mencoba lagi", tone: "warn" };
  if (peers.length) return { label: "Menyambungkan…", tone: "wait" };
  return { label: d.cameraMode === "focus" ? "Menunggu layar" : "Menunggu giliran Live Ka'bah", tone: "wait" };
}

/** Halaman perangkat berkamera: pratinjau, lalu siarkan langsung ke layar TV lewat WebRTC. */
export default function KameraPage() {
  const support = useSyncExternalStore(subscribeNothing, readSupport, (): Support => "ok");
  const videoRef = useRef<HTMLVideoElement>(null);
  // Objek tetap: dibaca callback siaran dan pembersihan saat halaman ditutup.
  const box = useRef({
    video: null as MediaStreamTrack | null,
    audio: null as MediaStreamTrack | null,
    stream: null as MediaStream | null,
    cast: null as Broadcaster | null,
    /** Pengurus masih ingin siaran berjalan, jadi siaran yang terputus disambung ulang. */
    wantLive: false,
    retries: 0,
    timer: undefined as ReturnType<typeof setTimeout> | undefined,
    /** Nomor permintaan kamera terakhir; hasil permintaan lama dibuang. */
    seq: 0,
    /** Sesi terakhir dari perangkat ini; bila masih tercatat berjalan di server, boleh langsung diganti. */
    last: null as string | null,
    disposed: false,
  });
  // Versi terbaru fungsi, untuk callback yang dibuat pada render sebelumnya.
  const startRef = useRef<(auto?: boolean) => Promise<boolean>>(async () => false);
  const openVideoRef = useRef<(device: string, q: Quality) => Promise<boolean>>(async () => false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [quality, setQuality] = useState<Quality>("720");
  const [audio, setAudio] = useState(false);
  const [media, setMedia] = useState<"off" | "opening" | "on">("off");
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState<Live | null>(null);
  const [link, setLink] = useState(true);
  const [viewers, setViewers] = useState<ViewerState[]>([]);
  const [reconnecting, setReconnecting] = useState(false);
  const [busy, setBusy] = useState<"start" | "stop" | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [now, setNow] = useState(0);

  const loadStatus = useCallback(() => api<Status>("/api/admin/status").then(setStatus, () => {}), []);

  /** Satukan trek kamera & mikrofon, tampilkan di pratinjau, dan teruskan ke siaran yang berjalan. */
  const compose = () => {
    const b = box.current;
    const tracks = [b.video, b.audio].filter((t): t is MediaStreamTrack => !!t);
    b.stream = tracks.length ? new MediaStream(tracks) : null;
    const el = videoRef.current;
    if (el) {
      el.srcObject = b.stream;
      if (b.stream) el.play().catch(() => {});
    }
    if (b.stream) b.cast?.replaceVideo(b.stream);
  };

  const refreshDevices = () =>
    navigator.mediaDevices
      .enumerateDevices()
      .then((list) => setDevices(list.filter((d) => d.kind === "videoinput" && d.deviceId)))
      .catch(() => {});

  const openVideo = async (device: string, q: Quality): Promise<boolean> => {
    const b = box.current;
    const seq = ++b.seq;
    // Sebagian HP tidak bisa membuka kamera kedua selama kamera lama masih menyala.
    b.video?.stop();
    b.video = null;
    setMedia("opening");
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints(device, q) });
      const track = stream.getVideoTracks()[0];
      if (b.disposed || seq !== b.seq || !track) {
        stream.getTracks().forEach((t) => t.stop());
        return false;
      }
      b.video = track;
      track.addEventListener("ended", () => {
        if (b.video !== track) return;
        b.video = null;
        compose();
        setMedia("off");
        setError("Kamera berhenti mengirim gambar (dicabut atau dipakai aplikasi lain). Nyalakan lagi kamera.");
      });
      compose();
      setMedia("on");
      const actual = track.getSettings().deviceId;
      if (actual) setDeviceId(actual);
      refreshDevices();
      return true;
    } catch (e) {
      if (b.disposed || seq !== b.seq) return false;
      compose();
      setMedia("off");
      setError(mediaError(e, "Kamera"));
      return false;
    }
  };

  const openMic = async (): Promise<boolean> => {
    const b = box.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const track = stream.getAudioTracks()[0];
      if (b.disposed || !track) {
        stream.getTracks().forEach((t) => t.stop());
        return false;
      }
      b.audio?.stop();
      b.audio = track;
      compose();
      return true;
    } catch (e) {
      setAudio(false);
      toast.error(mediaError(e, "Mikrofon"));
      return false;
    }
  };

  const closeMic = () => {
    const b = box.current;
    b.audio?.stop();
    b.audio = null;
    compose();
  };

  const turnOff = () => {
    const b = box.current;
    b.seq++;
    b.video?.stop();
    b.video = null;
    closeMic();
    setMedia("off");
  };

  const changeVideo = (device: string, q: Quality) => {
    setDeviceId(device);
    setQuality(q);
    if (media === "on") openVideo(device, q);
  };

  const toggleAudio = (on: boolean) => {
    setAudio(on);
    if (!on) closeMic();
    else if (media === "on") openMic();
  };

  const retry = () => {
    const b = box.current;
    if (!b.wantLive || b.cast || b.disposed) return;
    if (b.retries >= MAX_RETRIES) {
      b.wantLive = false;
      b.retries = 0;
      setReconnecting(false);
      setError("Siaran terputus dan gagal disambung ulang. Periksa jaringan, lalu mulai siaran lagi.");
      return;
    }
    b.retries++;
    clearTimeout(b.timer);
    b.timer = setTimeout(() => {
      startRef.current(true).then((ok) => {
        if (ok) {
          b.retries = 0;
          setReconnecting(false);
        } else if (b.wantLive) retry();
        else setReconnecting(false);
      });
    }, 1_500 * b.retries);
  };

  const ended = (cast: Broadcaster, reason: EndReason) => {
    const b = box.current;
    if (b.cast !== cast) return;
    b.cast = null;
    b.last = cast.session;
    setLive(null);
    setViewers([]);
    if (reason === "lost" && b.wantLive) {
      setReconnecting(true);
      retry();
      return;
    }
    b.wantLive = false;
    if (reason === "takeover") toast.warning("Siaran kamera diambil alih perangkat lain.");
    else if (reason === "stopped") toast.info("Siaran kamera dihentikan dari panel Remote.");
    else toast.error("Siaran kamera terputus.");
  };

  /** Mulai siaran; `auto` = menyambung ulang setelah siaran terputus (tanpa dialog). */
  const start = async (auto = false): Promise<boolean> => {
    const b = box.current;
    if (b.cast) return true;
    // Penyambungan ulang yang sudah dibatalkan pengurus tidak boleh memulai siaran lagi.
    const cancelled = () => b.disposed || (auto && !b.wantLive);
    if (!auto) setError(null);
    setBusy("start");
    try {
      if (!b.video && !(await openVideo(deviceId, quality))) return false;
      if (!auto && audio && !b.audio && !(await openMic())) return false;
      const current = await api<CameraStatus>("/api/admin/camera");
      if (current.live && current.id !== b.last) {
        if (auto) {
          // Siaran lain sudah dimulai selagi perangkat ini terputus: jangan direbut otomatis.
          b.wantLive = false;
          toast.warning(`Siaran kamera kini dijalankan oleh ${current.by}.`);
          return false;
        }
        const ok = confirm(
          `Siaran kamera oleh ${current.by} sedang berjalan sejak ${clock(current.startedAt)}. Ganti dengan siaran dari perangkat ini?`,
        );
        if (!ok) return false;
      }
      if (!b.stream || cancelled()) return false;
      const withAudio = b.audio?.readyState === "live";
      const res = await api<{ session: string; startedAt: number; iceServers: IceServer[] }>("/api/admin/camera", {
        method: "POST",
        body: { action: "start", audio: withAudio },
      });
      if (!b.stream || cancelled() || b.cast) {
        stopSession(res.session);
        return false;
      }
      const cast: Broadcaster = new Broadcaster(res.session, res.iceServers, b.stream, {
        onViewers: setViewers,
        onLink: setLink,
        onEnded: (reason) => ended(cast, reason),
      });
      b.cast = cast;
      b.wantLive = true;
      cast.open();
      const since = Date.now();
      setLive({ session: res.session, startedAt: res.startedAt, since, audio: withAudio });
      setViewers([]);
      setLink(true);
      setNow(since);
      loadStatus();
      if (!auto) toast.success("Siaran kamera dimulai");
      return true;
    } catch (e) {
      if (!auto) toast.error((e as Error).message);
      return false;
    } finally {
      setBusy(null);
    }
  };
  useEffect(() => {
    startRef.current = start;
    openVideoRef.current = openVideo;
  });

  const stop = async () => {
    const b = box.current;
    b.wantLive = false;
    b.retries = 0;
    clearTimeout(b.timer);
    setReconnecting(false);
    const cast = b.cast;
    b.cast = null;
    setLive(null);
    setViewers([]);
    if (!cast) {
      // Membatalkan penyambungan ulang: siaran lama yang mungkin masih tercatat di server ikut dihentikan.
      if (b.last) stopSession(b.last);
      return;
    }
    cast.close();
    setBusy("stop");
    try {
      await api("/api/admin/camera", { method: "POST", body: { action: "stop", session: cast.session } });
      toast.success("Siaran kamera dihentikan");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
      loadStatus();
    }
  };

  // Siaran ikut berhenti saat halaman ditutup atau pengurus pindah menu, agar TV segera kembali ke Live Ka'bah.
  useEffect(() => {
    const b = box.current;
    b.disposed = false;
    const release = () => {
      const cast = b.cast;
      b.wantLive = false;
      b.cast = null;
      clearTimeout(b.timer);
      if (!cast) return;
      cast.close();
      stopSession(cast.session);
    };
    const onHide = (e: PageTransitionEvent) => {
      if (!e.persisted) release();
    };
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      release();
      b.disposed = true;
      b.seq++;
      b.video?.stop();
      b.audio?.stop();
      b.video = b.audio = b.stream = null;
    };
  }, []);

  // Nyalakan pratinjau langsung bila izin kamera sudah pernah diberikan.
  useEffect(() => {
    if (support !== "ok" || !navigator.permissions) return;
    let alive = true;
    navigator.permissions
      .query({ name: "camera" as PermissionName })
      .then((p) => {
        if (alive && p.state === "granted" && !box.current.video) openVideoRef.current("", "720");
      })
      .catch(() => {});
    const md = navigator.mediaDevices;
    const onDevices = () => {
      md.enumerateDevices()
        .then((list) => alive && setDevices(list.filter((d) => d.kind === "videoinput" && d.deviceId)))
        .catch(() => {});
    };
    md.addEventListener("devicechange", onDevices);
    return () => {
      alive = false;
      md.removeEventListener("devicechange", onDevices);
    };
  }, [support]);

  useEffect(() => {
    loadStatus();
    const iv = setInterval(loadStatus, 10_000);
    return () => clearInterval(iv);
  }, [loadStatus]);

  // Selama siaran: jam berjalan, layar perangkat tetap menyala, dan peringatan sebelum halaman ditutup.
  const isLive = live !== null;
  useEffect(() => {
    if (!isLive) return;
    const iv = setInterval(() => setNow(Date.now()), 1_000);
    let lock: WakeLockSentinel | null = null;
    let active = true;
    const acquire = () => {
      if (document.visibilityState !== "visible" || !("wakeLock" in navigator)) return;
      navigator.wakeLock.request("screen").then(
        (l) => {
          if (active) lock = l;
          else l.release().catch(() => {});
        },
        () => {},
      );
    };
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    acquire();
    document.addEventListener("visibilitychange", acquire);
    window.addEventListener("beforeunload", warn);
    return () => {
      active = false;
      clearInterval(iv);
      lock?.release().catch(() => {});
      document.removeEventListener("visibilitychange", acquire);
      window.removeEventListener("beforeunload", warn);
    };
  }, [isLive]);

  const cam = status?.camera;
  const other = !live && cam?.live ? cam : null;
  const screens = status?.displays ?? [];

  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin/remote" className="mb-4 inline-flex items-center gap-1 text-sm font-bold text-sky-300">
          <ChevronLeft className="size-4" aria-hidden="true" /> Kembali ke Remote
        </Link>
        <PageHeader title="Kamera Masjid" description="Siarkan video langsung dari perangkat ini ke layar TV." />
      </div>

      {support !== "ok" ? (
        <Card className="space-y-2">
          <h2 className="flex items-center gap-3 font-bold">
            <IconTile icon={ShieldAlert} tone="gold" size="sm" /> Kamera tidak bisa dibuka di sini
          </h2>
          <p className="text-sm text-white/60">
            {support === "insecure"
              ? "Browser hanya mengizinkan kamera di alamat aman (https://). Buka panel admin lewat alamat https server, lalu kembali ke halaman ini."
              : "Browser ini tidak mendukung kamera. Gunakan Chrome, Edge, Firefox, atau Safari versi terbaru."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] xl:items-start">
          <div className="min-w-0 space-y-5">
            <div className="relative overflow-hidden rounded-[24px] bg-black ring-1 ring-white/10">
              <video ref={videoRef} muted playsInline autoPlay className="aspect-video w-full object-contain" />
              {media !== "on" && (
                <div className="absolute inset-0 grid place-items-center bg-navy-950 p-6 text-center">
                  <div className="space-y-3">
                    <IconTile icon={media === "opening" ? Camera : VideoOff} tone="soft" className="mx-auto" />
                    <p className="text-sm text-white/60">{media === "opening" ? "Membuka kamera…" : "Kamera belum menyala"}</p>
                    {media === "off" && <Button onClick={() => openVideo(deviceId, quality)}>Nyalakan kamera</Button>}
                  </div>
                </div>
              )}
              {live && (
                <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-xs font-extrabold tracking-wider text-white tabular-nums">
                  <span className="size-1.5 animate-soft-pulse rounded-full bg-white" aria-hidden="true" />
                  LIVE · {elapsed(now - live.since)}
                </span>
              )}
            </div>

            {error && (
              <p role="alert" className="rounded-2xl bg-bata-700/35 p-3 text-sm text-bata-200 ring-1 ring-bata-400/40">
                {error}
              </p>
            )}

            <Card className="space-y-3">
              {live ? (
                <>
                  <p className="text-sm text-white/70">
                    Siaran berjalan sejak {clock(live.startedAt)}. Suara {live.audio ? "ikut dikirim" : "tidak dikirim"}.
                  </p>
                  {!link && (
                    <p className="rounded-2xl bg-gold-400/10 p-3 text-sm text-gold-300 ring-1 ring-gold-400/30">
                      Sambungan ke server terputus, menyambung ulang… Pastikan perangkat ini tetap terhubung ke internet.
                    </p>
                  )}
                  <Button variant="danger" className="w-full" loading={busy === "stop"} onClick={stop}>
                    Hentikan siaran
                  </Button>
                </>
              ) : reconnecting ? (
                <>
                  <p className="rounded-2xl bg-gold-400/10 p-3 text-sm text-gold-300 ring-1 ring-gold-400/30">
                    Siaran terputus. Menyambung ulang otomatis…
                  </p>
                  <Button variant="ghost" className="w-full" onClick={stop}>
                    Batalkan siaran
                  </Button>
                </>
              ) : (
                <>
                  {other && (
                    <p className="rounded-2xl bg-gold-400/10 p-3 text-sm text-gold-300 ring-1 ring-gold-400/30">
                      Siaran oleh {other.by} sedang berjalan sejak {clock(other.startedAt)}. Memulai di sini akan menggantikannya.
                    </p>
                  )}
                  <Button className="w-full" loading={busy === "start"} disabled={media === "opening"} onClick={() => start()}>
                    <MonitorPlay className="size-4" aria-hidden="true" /> {other ? "Ganti dengan siaran ini" : "Mulai siaran ke TV"}
                  </Button>
                  {media === "on" && (
                    <Button variant="ghost" className="w-full" onClick={turnOff}>
                      Matikan kamera
                    </Button>
                  )}
                </>
              )}
            </Card>

            <Card className="space-y-2 text-sm text-white/60">
              <h2 className="flex items-center gap-3 font-bold text-white">
                <IconTile icon={Info} tone="soft" size="sm" /> Selama siaran
              </h2>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>Biarkan halaman ini terbuka dan layar perangkat menyala. Sambungkan ke charger dan Wi-Fi masjid.</li>
                <li>Siaran berhenti bila halaman ini ditutup atau Anda pindah menu. Buka menu lain di tab browser baru.</li>
                <li>Video dikirim langsung ke tiap TV, paling banyak 6 layar sekaligus.</li>
                <li>Saat adzan, iqamah, atau pengumuman darurat, TV tetap menampilkan layar sholat atau pengumuman.</li>
              </ul>
            </Card>
          </div>
          <div className="min-w-0 space-y-5">
            <Card className="space-y-4">
              <h2 className="flex items-center gap-3 font-bold">
                <IconTile icon={Camera} size="sm" /> Pengaturan kamera
              </h2>
              {devices.length > 1 && (
                <Field label="Kamera">
                  <Select
                    value={deviceId}
                    disabled={media === "opening"}
                    onChange={(e) => changeVideo(e.target.value, quality)}
                    options={devices.map((d, i) => ({ value: d.deviceId, label: d.label || `Kamera ${i + 1}` }))}
                  />
                </Field>
              )}
              <Field label="Kualitas gambar" help="Tiap TV menerima kiriman sendiri. Pilih Hemat bila gambar di TV tersendat.">
                <Select
                  value={quality}
                  disabled={media === "opening"}
                  onChange={(e) => changeVideo(deviceId, e.target.value as Quality)}
                  options={(Object.keys(QUALITY) as Quality[]).map((q) => ({ value: q, label: QUALITY[q].label }))}
                />
              </Field>
              {live ? (
                <p className="text-sm text-white/60">
                  Suara {live.audio ? "ikut dikirim" : "tidak dikirim"}. Hentikan siaran untuk mengubahnya.
                </p>
              ) : (
                <div>
                  <Toggle label="Kirim suara" checked={audio} onChange={toggleAudio} />
                  <p className="text-xs text-muted">TV hanya membunyikan suara bila suara layar itu dinyalakan di menu Tampilan.</p>
                </div>
              )}
            </Card>

            <Card className="space-y-3">
              <h2 className="flex items-center gap-3 font-bold">
                <IconTile icon={MonitorPlay} size="sm" /> Layar TV
              </h2>
              <ul className="space-y-2">
                {screens.map((d) => {
                  const s = screenState(
                    d,
                    viewers.filter((v) => v.tv === d.id),
                    isLive,
                  );
                  return (
                    <li key={d.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.04] px-3 py-2.5 ring-1 ring-white/10">
                      <span className="truncate font-bold">{displayLabel(d)}</span>
                      <span className="flex shrink-0 items-center gap-2 text-right text-sm text-white/60">
                        <span className={`size-2 shrink-0 rounded-full ${DOT[s.tone]}`} aria-hidden="true" />
                        {s.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="text-xs text-muted">
                Atur tampil atau tidaknya kamera di tiap TV lewat menu{" "}
                <Link href="/admin/playlist" className="font-bold text-sky-300">
                  Tampilan
                </Link>
                .
              </p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
