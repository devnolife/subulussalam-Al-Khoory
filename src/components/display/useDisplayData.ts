"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DisplayState } from "@/lib/types";
import { addDays, witaDateStr, witaParts } from "@/lib/time";
import { computeOfflineTimes } from "@/lib/prayer/offline";
import { applyCorrections } from "@/lib/prayer/schedule";

const SNAPSHOT_KEY = "masjid-display-snapshot";
const ID_KEY = "masjid-display-id";

function displayId(): string {
  let id = localStorage.getItem(ID_KEY);
  if (!id) {
    id = Math.random().toString(36).slice(2, 10);
    localStorage.setItem(ID_KEY, id);
  }
  return id;
}

/** Jika data tersimpan sudah basi (TV offline lewat tengah malam), hitung jadwal secara lokal. */
function freshenPrayer(state: DisplayState, now: number): DisplayState {
  const today = witaDateStr(now);
  if (state.prayer.today.date === today) return state;
  const { lat, lng } = state.settings.location;
  const c = state.settings.prayer.corrections;
  const tomorrowDate = addDays(today, 1);
  const pick = (date: string) =>
    state.prayer.tomorrow.date === date ? state.prayer.tomorrow : applyCorrections(computeOfflineTimes(date, lat, lng), c);
  return { ...state, prayer: { today: pick(today), tomorrow: pick(tomorrowDate) } };
}

export type ConnectionStatus = "connecting" | "online" | "offline";

export function useDisplayData() {
  const [state, setState] = useState<DisplayState | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const offsetRef = useRef(0);
  const [offset, setOffset] = useState(0);

  const load = useCallback(async () => {
    try {
      const t0 = Date.now();
      const search = new URLSearchParams(location.search);
      const demo = search.get("demo") === "1";
      const query = demo ? `?${new URLSearchParams({ demo: "1", module: search.get("module") ?? "", phase: search.get("phase") ?? "" })}` : "";
      const res = await fetch(`/api/display/state${query}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data: DisplayState = await res.json();
      const t1 = Date.now();
      offsetRef.current = data.serverTime - (t0 + t1) / 2;
      setOffset(offsetRef.current);
      setState(data);
      if (data.demo) setStatus("online");
      else localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(data));
    } catch {
      setStatus("offline");
      if (new URLSearchParams(location.search).get("demo") === "1") return;
      setState((prev) => {
        if (prev) return freshenPrayer(prev, Date.now() + offsetRef.current);
        const raw = localStorage.getItem(SNAPSHOT_KEY);
        return raw ? freshenPrayer(JSON.parse(raw), Date.now()) : prev;
      });
    }
  }, []);

  // Data awal + realtime SSE
  useEffect(() => {
    load();
    if (new URLSearchParams(location.search).get("demo") === "1") return;
    let debounce: ReturnType<typeof setTimeout> | undefined;
    // Pratinjau di panel admin tidak dihitung sebagai layar TV terhubung.
    const preview = new URLSearchParams(location.search).has("preview");
    const es = new EventSource(preview ? "/api/stream" : `/api/stream?display=${displayId()}`);
    es.addEventListener("hello", () => {
      setStatus("online");
      load();
    });
    es.addEventListener("update", () => {
      clearTimeout(debounce);
      debounce = setTimeout(load, 250);
    });
    es.addEventListener("command", (e) => {
      const data = JSON.parse((e as MessageEvent).data);
      if (data.command === "reload") location.reload();
    });
    es.onerror = () => setStatus("offline");
    return () => {
      clearTimeout(debounce);
      es.close();
    };
  }, [load]);

  // Refresh berkala (cuaca, pergantian hari) + reload harian dini hari untuk mencegah memory leak.
  useEffect(() => {
    const startedAt = Date.now();
    let lastDate = witaDateStr(Date.now());
    const iv = setInterval(() => {
      const now = Date.now() + offsetRef.current;
      const date = witaDateStr(now);
      if (date !== lastDate) {
        lastDate = date;
        load();
      }
      const p = witaParts(now);
      if (p.hour === 2 && p.minute === 30 && Date.now() - startedAt > 3_600_000) location.reload();
    }, 30_000);
    const refresh = setInterval(load, 10 * 60_000);
    return () => {
      clearInterval(iv);
      clearInterval(refresh);
    };
  }, [load]);

  // Layar jangan tidur
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = async () => {
      try {
        lock = (await navigator.wakeLock?.request("screen")) ?? null;
      } catch {}
    };
    const onVisible = () => document.visibilityState === "visible" && request();
    request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release().catch(() => {});
    };
  }, []);

  return { state, status, offset };
}

/** Waktu sekarang (disinkronkan dengan server), berdetak tiap detik. */
export function useNow(offset: number): number {
  const [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const t = Date.now() + offset;
      setNow(t);
      timer = setTimeout(tick, 1000 - (t % 1000) + 5);
    };
    tick();
    return () => clearTimeout(timer);
  }, [offset]);
  return now;
}
