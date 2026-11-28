"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DisplayId, DisplayState } from "@/lib/types";
import { addDays, witaDateStr, witaParts } from "@/lib/time";
import { computeOfflineTimes } from "@/lib/prayer/offline";
import { applyCorrections } from "@/lib/prayer/schedule";
import { isPreview, screenClientId, screenKey } from "./screen";

/** Salinan data terakhir per layar, dipakai bila server tidak terjangkau. */
const snapshotKey = (tv: DisplayId) => `masjid-display-snapshot:${tv}`;
const LEGACY_SNAPSHOT_KEY = "masjid-display-snapshot";

function readSnapshot(tv: DisplayId): DisplayState | null {
  try {
    const data = JSON.parse(localStorage.getItem(snapshotKey(tv)) ?? "null") as DisplayState | null;
    // Salinan dari versi sebelum ada TV 1–3 tidak punya `display`.
    return data?.display ? data : null;
  } catch {
    return null;
  }
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

export function useDisplayData(tv: DisplayId) {
  const [state, setState] = useState<DisplayState | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const offsetRef = useRef(0);
  const [offset, setOffset] = useState(0);

  const load = useCallback(async () => {
    try {
      const t0 = Date.now();
      const search = new URLSearchParams(location.search);
      const demo = search.get("demo") === "1";
      const params = demo
        ? new URLSearchParams({ demo: "1", module: search.get("module") ?? "", phase: search.get("phase") ?? "" })
        : new URLSearchParams({ tv: String(tv) });
      if (!demo && isPreview()) params.set("preview", "1");
      else if (!demo) {
        const key = screenKey(tv);
        if (key) params.set("key", key);
      }
      const res = await fetch(`/api/display/state?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data: DisplayState = await res.json();
      const t1 = Date.now();
      offsetRef.current = data.serverTime - (t0 + t1) / 2;
      setOffset(offsetRef.current);
      setState(data);
      if (data.demo) setStatus("online");
      else if (!isPreview()) {
        // Siaran kamera tidak ikut disimpan: sesi lama tidak berguna saat server tidak terjangkau.
        localStorage.setItem(snapshotKey(tv), JSON.stringify({ ...data, camera: null }));
        localStorage.removeItem(LEGACY_SNAPSHOT_KEY);
      }
    } catch {
      setStatus("offline");
      if (new URLSearchParams(location.search).get("demo") === "1") return;
      setState((prev) => {
        if (prev) return freshenPrayer(prev, Date.now() + offsetRef.current);
        const saved = readSnapshot(tv);
        return saved ? freshenPrayer(saved, Date.now()) : prev;
      });
    }
  }, [tv]);

  // Data awal + realtime SSE
  useEffect(() => {
    load();
    if (new URLSearchParams(location.search).get("demo") === "1") return;
    let debounce: ReturnType<typeof setTimeout> | undefined;
    const params = new URLSearchParams({ tv: String(tv) });
    // Pratinjau di panel admin tidak dihitung sebagai layar TV terhubung.
    if (!isPreview()) {
      params.set("client", screenClientId());
      const key = screenKey(tv);
      if (key) params.set("key", key);
    }
    const es = new EventSource(`/api/stream?${params}`);
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
  }, [load, tv]);

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
