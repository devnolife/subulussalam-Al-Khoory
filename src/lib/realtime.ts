import { EventEmitter } from "events";

export type RealtimeEvent =
  | { type: "update"; topics: string[] }
  | { type: "command"; command: "reload" };

type G = typeof globalThis & {
  __realtime?: { emitter: EventEmitter; displays: Map<string, number>; version: number };
};
const g = globalThis as G;

function hub() {
  if (!g.__realtime) {
    const emitter = new EventEmitter();
    emitter.setMaxListeners(1000);
    g.__realtime = { emitter, displays: new Map(), version: Date.now() };
  }
  return g.__realtime;
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

/** Status layar TV yang terhubung (id → terakhir terlihat). */
export function markDisplay(id: string, connected: boolean): void {
  const h = hub();
  if (connected) h.displays.set(id, Date.now());
  else h.displays.delete(id);
}

export function displayStatus(): { connected: number; lastSeen: number | null } {
  const values = [...hub().displays.values()];
  return { connected: values.length, lastSeen: values.length ? Math.max(...values) : null };
}
