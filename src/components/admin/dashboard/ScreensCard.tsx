"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/components/admin/api";
import type { ScreensOverview } from "@/lib/screens";
import { formatClock } from "@/lib/time";
import { MODULE_LABELS, displayLabel } from "@/lib/types";

/** Ringkasan layar TV dan siaran kamera; diperbarui berkala selama beranda terbuka. */
export function ScreensCard({ initial, serverNow }: { initial: ScreensOverview; serverNow: number }) {
  const [data, setData] = useState(initial);
  const [now, setNow] = useState(serverNow);

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      api<ScreensOverview>("/api/admin/status")
        .then((next) => {
          setData(next);
          setNow(Date.now());
        })
        .catch(() => {});
    }, 15_000);
    return () => clearInterval(id);
  }, []);

  const online = data.displays.filter((d) => d.connected > 0).length;
  const camera = data.camera;
  return (
    <section className="panel-box">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="panel-heading">Layar TV</h2>
          <p className="mt-1 text-xs text-muted">
            {online} dari {data.displays.length} layar terhubung
          </p>
        </div>
        <Link href="/admin/remote" className="flex min-h-11 shrink-0 items-center text-sm font-semibold text-sky-300 underline underline-offset-4 hover:text-white">
          Remote
        </Link>
      </div>
      <ul className="divide-y divide-white/[0.06]">
        {data.displays.map((d) => {
          const locked = d.override.type && (!d.override.until || d.override.until > now) ? d.override.type : null;
          return (
            <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{displayLabel(d)}</p>
                <p className="truncate text-xs text-white/55">
                  {locked
                    ? `Dikunci: ${MODULE_LABELS[locked]}${d.override.until ? ` s/d ${formatClock(d.override.until, false)}` : ""}`
                    : "Mengikuti urutan tampilan"}
                </p>
              </div>
              <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-white/75">
                <span className={`size-2 rounded-full ${d.connected ? "bg-emerald-400" : "bg-rose-400"}`} aria-hidden="true" />
                {d.connected ? (d.connected > 1 ? `${d.connected} perangkat` : "Terhubung") : "Terputus"}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-2">
        {camera.live ? (
          <p className="text-sm font-semibold text-bata-200">
            Kamera siaran sejak {formatClock(camera.startedAt, false)}
          </p>
        ) : (
          <p className="text-sm text-muted">Kamera tidak siaran</p>
        )}
        <Link href="/admin/kamera" className="flex min-h-11 shrink-0 items-center text-sm font-bold text-sky-300 hover:text-sky-200">
          {camera.live ? "Kelola" : "Mulai siaran"}
        </Link>
      </div>
    </section>
  );
}
