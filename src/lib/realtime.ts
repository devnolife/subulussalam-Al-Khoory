import { EventEmitter } from "events";
import type { DisplayId } from "./types";

export type RealtimeEvent =
  | { type: "update"; topics: string[] }
  /** `tv` kosong = semua layar. */
  | { type: "command"; command: "reload"; tv?: DisplayId };

/** Satu koneksi SSE dari layar TV; `key` dicocokkan saat status diminta agar ikut berubah bila kunci diganti. */
export type Screen = { tv: DisplayId; client: string; key: string | null; lastSeen: number };

type Hub = { emitter: EventEmitter; screens: Map<string, Screen>; version: number };
type G = typeof globalThis & { __realtimeHub?: Hub };
const g = globalThis as G;

function hub(): Hub {
  if (!g.__realtimeHub) {
    const emitter = new EventEmitter();
    emitter.setMaxListeners(0);
    g.__realtimeHub = { emitter, screens: new Map(), version: Date.now() };
  }
  return g.__realtimeHub;
}

export function publish(event: RealtimeEvent): void {
  const h = hub();
  if (event.type === "update") h.version = Date.now();
  h.emitter.emit("event", event);
}

export function subscribe(fn: (e: RealtimeEvent) => void): () => void {
  const h = hub();
  h.emitter.on("event", fn);
  return () => h.emitter.off("event", fn);
}

export function contentVersion(): number {
  return hub().version;
}

/** Pesan untuk satu penerima (mis. sinyal WebRTC); false bila tidak ada yang mendengarkan. */
export function emitTo(channel: string, payload: unknown): boolean {
  return hub().emitter.emit(`to:${channel}`, payload);
}

export function listen<T>(channel: string, fn: (payload: T) => void): () => void {
  const h = hub();
  const name = `to:${channel}`;
  h.emitter.on(name, fn);
  return () => h.emitter.off(name, fn);
}

/** Catat koneksi layar TV (`null` = terputus). */
export function markDisplay(conn: string, screen: Omit<Screen, "lastSeen"> | null): void {
  const h = hub();
  if (screen) h.screens.set(conn, { ...screen, lastSeen: Date.now() });
  else h.screens.delete(conn);
}

export function connectedScreens(): Screen[] {
  return [...hub().screens.values()];
}
