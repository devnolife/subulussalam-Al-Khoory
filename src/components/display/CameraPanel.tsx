"use client";

import { useEffect, useRef, useState } from "react";
import { Video, VideoOff } from "lucide-react";
import type { CameraInfo, DisplayState } from "@/lib/types";
import type { IceCandidate, Signal, ViewerMessage } from "@/lib/camera-protocol";
import { youtubeSources } from "@/lib/youtube";
import { KabahPanel, LiveBadges, SoundHint, StreamNotice } from "./Modules";
import { isPreview, randomId, screenKey } from "./screen";

/** Batas menunggu video kamera tampil sebelum layar kembali ke Live Ka'bah. */
const CONNECT_TIMEOUT_MS = 20_000;
/** Toleransi koneksi yang tersendat sebelum dianggap putus. */
const DISCONNECT_GRACE_MS = 8_000;
/** Jeda sebelum layar mencoba menyambung lagi ke kamera. */
const RETRY_MS = 30_000;

type Phase = "connecting" | "live" | "failed" | "ended";
type Props = { state: DisplayState; camera: CameraInfo };

/** Siaran kamera masjid, tampil di slot Live Ka'bah selama siaran berlangsung. */
export function CameraPanel(props: Props) {
  if (typeof window !== "undefined" && isPreview()) {
    return (
      <StreamNotice title="Siaran kamera masjid" icon={Video}>
        Siaran kamera sedang tampil di layar TV ini. Pratinjau tidak memutar video agar hemat kuota.
      </StreamNotice>
    );
  }
  return <CameraViewer {...props} />;
}

/**
 * Menerima video langsung (WebRTC) dari halaman kamera. Server hanya meneruskan sinyal;
 * bila kamera tidak tersambung, layar sementara kembali ke Live Ka'bah lalu mencoba lagi.
 */
function CameraViewer({ state, camera }: Props) {
  const tv = state.display.id;
  const session = camera.session;
  const videoRef = useRef<HTMLVideoElement>(null);
  const iceRef = useRef(camera.iceServers);
  const [phase, setPhase] = useState<Phase>("connecting");
  const [attempt, setAttempt] = useState(0);
  const [needsTap, setNeedsTap] = useState(false);
  // Suara kamera harus dinyalakan di halaman kamera dan diizinkan di pengaturan layar TV ini.
  const wantSound = camera.audio && state.display.sound;

  useEffect(() => {
    iceRef.current = camera.iceServers;
  }, [camera.iceServers]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const peer = randomId(12);
    const query = new URLSearchParams({ tv: String(tv), key: screenKey(tv) ?? "", session, peer });
    const es = new EventSource(`/api/display/camera?${query}`);
    let done = false;
    let pc: RTCPeerConnection | null = null;
    let token = "";
    let inbox = Promise.resolve();
    let outbox = Promise.resolve();
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;

    const shutdown = () => {
      done = true;
      clearTimeout(watchdog);
      es.close();
      pc?.close();
      pc = null;
    };
    const stop = (next: "failed" | "ended") => {
      if (done) return;
      shutdown();
      setPhase(next);
      retry = setTimeout(() => {
        setPhase("connecting");
        setAttempt((a) => a + 1);
      }, RETRY_MS);
    };
    const arm = (ms: number) => {
      clearTimeout(watchdog);
      watchdog = setTimeout(() => stop("failed"), ms);
    };
    const send = (signal: Signal) => {
      const body = JSON.stringify({ session, peer, token, ...signal });
      // Dikirim berurutan; 410 berarti koneksi ini sudah diganti dan kamera akan mengirim tawaran baru.
      outbox = outbox.then(() =>
        done
          ? undefined
          : fetch("/api/display/camera", { method: "POST", headers: { "Content-Type": "application/json" }, body }).then(
              () => undefined,
              () => undefined,
            ),
      );
    };

    const accept = async (offer: RTCSessionDescriptionInit) => {
      pc?.close();
      const conn = new RTCPeerConnection({ iceServers: iceRef.current });
      pc = conn;
      arm(CONNECT_TIMEOUT_MS);
      conn.onicecandidate = (e) => {
        if (e.candidate && pc === conn) send({ candidate: e.candidate.toJSON() as IceCandidate });
      };
      conn.ontrack = (e) => {
        if (pc !== conn) return;
        video.srcObject = e.streams[0] ?? new MediaStream([e.track]);
        video.play().catch(() => {});
      };
      conn.onconnectionstatechange = () => {
        if (pc !== conn) return;
        if (conn.connectionState === "connected") {
          clearTimeout(watchdog);
          setPhase("live");
        } else if (conn.connectionState === "disconnected") arm(DISCONNECT_GRACE_MS);
        else if (conn.connectionState === "failed") arm(2_000);
      };
      await conn.setRemoteDescription(offer);
      const answer = await conn.createAnswer();
      if (pc !== conn) return;
      await conn.setLocalDescription(answer);
      if (pc === conn && conn.localDescription) send({ description: { type: "answer", sdp: conn.localDescription.sdp } });
    };

    const handle = async (signal: Signal) => {
      if (done) return;
      if (signal.description?.type === "offer") {
        try {
          await accept(signal.description);
        } catch {
          stop("failed");
        }
      } else if (signal.candidate && pc) {
        // Kandidat milik koneksi lama boleh gagal.
        await pc.addIceCandidate(signal.candidate).catch(() => {});
      }
    };

    es.addEventListener("ready", (e) => {
      token = (JSON.parse((e as MessageEvent).data) as Extract<ViewerMessage, { type: "ready" }>).token;
    });
    es.addEventListener("signal", (e) => {
      const { signal } = JSON.parse((e as MessageEvent).data) as Extract<ViewerMessage, { type: "signal" }>;
      inbox = inbox.then(() => handle(signal));
    });
    es.addEventListener("ended", () => stop("ended"));
    es.addEventListener("full", () => stop("failed"));
    es.onerror = () => {
      // CONNECTING = browser menyambung ulang sendiri; CLOSED = ditolak server.
      if (es.readyState === EventSource.CLOSED) stop("failed");
    };
    arm(CONNECT_TIMEOUT_MS);

    return () => {
      shutdown();
      clearTimeout(retry);
    };
  }, [attempt, session, tv]);

  // Browser menahan suara sampai ada sentuhan atau tombol di halaman ini.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || phase !== "live") return;
    if (!wantSound) {
      video.muted = true;
      return;
    }
    let active = true;
    const unmute = () => {
      video.muted = false;
      video.play().then(
        () => active && setNeedsTap(false),
        () => {
          if (!active) return;
          video.muted = true;
          video.play().catch(() => {});
          setNeedsTap(true);
        },
      );
    };
    const onActivate = () => {
      if (video.muted) unmute();
    };
    unmute();
    window.addEventListener("pointerdown", onActivate);
    window.addEventListener("keydown", onActivate);
    return () => {
      active = false;
      window.removeEventListener("pointerdown", onActivate);
      window.removeEventListener("keydown", onActivate);
    };
  }, [phase, wantSound]);

  if (phase === "failed") {
    return youtubeSources([state.settings.kabah.youtubeUrl, state.settings.kabah.backupUrl]).length ? (
      <KabahPanel state={state} />
    ) : (
      <StreamNotice title="Kamera masjid belum tersambung" icon={VideoOff}>
        Layar akan mencoba menyambung lagi secara otomatis.
      </StreamNotice>
    );
  }
  if (phase === "ended") {
    return (
      <StreamNotice title="Siaran kamera selesai" icon={VideoOff}>
        Layar kembali ke tampilan biasa sebentar lagi.
      </StreamNotice>
    );
  }
  return (
    <div className="relative size-full bg-black">
      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 size-full object-contain" />
      {/* Penangkap ketukan: sentuhan menyalakan suara, bukan menjeda video. */}
      <div className="absolute inset-0" aria-hidden="true" />
      {phase === "live" ? (
        <LiveBadges place={state.settings.mosque.name} />
      ) : (
        <div className="absolute inset-0 bg-navy-900">
          <StreamNotice title="Menyambungkan ke kamera masjid…" icon={Video}>
            Siaran langsung dari kamera masjid akan tampil sebentar lagi.
          </StreamNotice>
        </div>
      )}
      {phase === "live" && wantSound && needsTap && <SoundHint />}
    </div>
  );
}
