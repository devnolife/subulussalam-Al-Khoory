import { randomBytes, randomUUID } from "crypto";
import { emitTo, publish } from "./realtime";
import type { CameraMessage, CameraStatus, EndReason, Signal, ViewerInfo, ViewerMessage } from "./camera-protocol";
import type { DisplayId } from "./types";

/**
 * Siaran kamera masjid: satu perangkat berkamera mengirim video WebRTC langsung ke tiap layar TV.
 * Server hanya meneruskan sinyal, dan statusnya disimpan di memori (cukup untuk satu instance server).
 */

/** Siaran dianggap berakhir bila halaman kamera tidak tersambung selama ini. */
export const CAMERA_GRACE_MS = 15_000;
/** Kamera mengirim video terpisah ke tiap layar, jadi jumlah penonton dibatasi. */
export const MAX_VIEWERS = 6;

type Viewer = ViewerInfo & { conn: string; token: string };
type Session = {
  id: string;
  startedAt: number;
  by: string;
  audio: boolean;
  viewers: Map<string, Viewer>;
  /** Jumlah koneksi sinyal halaman kamera yang aktif. */
  links: number;
  timer: ReturnType<typeof setTimeout> | null;
  onLost?: () => void;
};
type CameraHub = { session: Session | null; ended: Map<string, EndReason> };

const g = globalThis as typeof globalThis & { __cameraHub?: CameraHub };
function hub(): CameraHub {
  g.__cameraHub ??= { session: null, ended: new Map() };
  return g.__cameraHub;
}

const toCamera = (id: string, msg: CameraMessage) => emitTo(`camera:${id}`, msg);
const toViewer = (conn: string, msg: ViewerMessage) => emitTo(`viewer:${conn}`, msg);
const info = ({ peer, tv, joinedAt }: Viewer): ViewerInfo => ({ peer, tv, joinedAt });

function current(id: string): Session | null {
  const s = hub().session;
  return s && s.id === id ? s : null;
}

function end(s: Session, reason: EndReason): void {
  const h = hub();
  if (s.timer) clearTimeout(s.timer);
  s.timer = null;
  if (h.session === s) h.session = null;
  h.ended.set(s.id, reason);
  if (h.ended.size > 20) h.ended.delete(h.ended.keys().next().value as string);
  toCamera(s.id, { type: "ended", reason });
  for (const v of s.viewers.values()) toViewer(v.conn, { type: "ended", reason });
  s.viewers.clear();
  publish({ type: "update", topics: ["camera"] });
}

function armGrace(s: Session): void {
  if (s.timer) clearTimeout(s.timer);
  s.timer = setTimeout(() => {
    s.timer = null;
    if (hub().session !== s || s.links > 0) return;
    end(s, "lost");
    s.onLost?.();
  }, CAMERA_GRACE_MS);
}

/** Mulai siaran baru; siaran lain yang masih berjalan digantikan. */
export function startCamera(opts: { by: string; audio: boolean; onLost?: () => void }): { id: string; startedAt: number } {
  const h = hub();
  if (h.session) end(h.session, "takeover");
  const s: Session = {
    id: randomUUID(),
    startedAt: Date.now(),
    by: opts.by,
    audio: opts.audio,
    viewers: new Map(),
    links: 0,
    timer: null,
    onLost: opts.onLost,
  };
  h.session = s;
  armGrace(s);
  publish({ type: "update", topics: ["camera"] });
  return { id: s.id, startedAt: s.startedAt };
}

/** Hentikan siaran (`id` kosong = siaran mana pun yang sedang berjalan). */
export function stopCamera(id?: string): boolean {
  const s = hub().session;
  if (!s || (id && s.id !== id)) return false;
  end(s, "stopped");
  return true;
}

/**
 * Halaman kamera tersambung ke kanal sinyal. Mengembalikan layar yang sudah menunggu
 * dan fungsi pelepas, atau alasan bila siaran itu sudah berakhir.
 */
export function attachCamera(id: string): { viewers: ViewerInfo[]; detach: () => void } | { ended: EndReason } {
  const s = current(id);
  if (!s) return { ended: hub().ended.get(id) ?? "lost" };
  s.links++;
  if (s.timer) clearTimeout(s.timer);
  s.timer = null;
  let attached = true;
  return {
    viewers: [...s.viewers.values()].map(info),
    detach: () => {
      if (!attached) return;
      attached = false;
      s.links--;
      if (hub().session === s && s.links === 0) armGrace(s);
    },
  };
}

/** Layar TV mulai menonton lewat koneksi `conn`; token dipakai untuk mengirim jawaban sinyal. */
export function joinViewer(
  id: string,
  peer: string,
  tv: DisplayId,
  conn: string,
): { token: string } | { ended: EndReason } | { full: true } {
  const s = current(id);
  if (!s) return { ended: hub().ended.get(id) ?? "stopped" };
  if (!s.viewers.has(peer) && s.viewers.size >= MAX_VIEWERS) return { full: true };
  const token = randomBytes(16).toString("hex");
  const viewer: Viewer = { peer, tv, joinedAt: Date.now(), conn, token };
  s.viewers.set(peer, viewer);
  toCamera(s.id, { type: "join", ...info(viewer) });
  return { token };
}

export function leaveViewer(id: string, peer: string, conn: string): void {
  const s = current(id);
  const v = s?.viewers.get(peer);
  // Koneksi lama yang baru tertutup setelah layar menyambung ulang tidak boleh menghapus koneksi barunya.
  if (!s || !v || v.conn !== conn) return;
  s.viewers.delete(peer);
  toCamera(s.id, { type: "leave", peer });
}

/** Putuskan semua penonton dari layar `tv`, mis. setelah kunci layar itu diganti. */
export function dropViewers(tv: DisplayId): void {
  const s = hub().session;
  if (!s) return;
  for (const v of [...s.viewers.values()]) {
    if (v.tv !== tv) continue;
    s.viewers.delete(v.peer);
    toViewer(v.conn, { type: "ended", reason: "revoked" });
    toCamera(s.id, { type: "leave", peer: v.peer });
  }
}

export function signalFromCamera(id: string, to: string, signal: Signal): boolean {
  const v = current(id)?.viewers.get(to);
  return v ? toViewer(v.conn, { type: "signal", signal }) : false;
}

export function signalFromViewer(id: string, peer: string, token: string, signal: Signal): boolean {
  const s = current(id);
  const v = s?.viewers.get(peer);
  if (!s || !v || v.token !== token) return false;
  return toCamera(s.id, { type: "signal", from: peer, signal });
}

export function cameraStatus(): CameraStatus {
  const s = hub().session;
  if (!s) return { live: false };
  return {
    live: true,
    id: s.id,
    startedAt: s.startedAt,
    by: s.by,
    audio: s.audio,
    connected: s.links > 0,
    viewers: [...s.viewers.values()].map(info),
  };
}

/** Siaran yang sedang berjalan, untuk data layar TV; null bila tidak ada. */
export function liveCamera(): { id: string; audio: boolean } | null {
  const s = hub().session;
  return s ? { id: s.id, audio: s.audio } : null;
}
