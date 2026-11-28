"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { witaDateStr } from "@/lib/time";

/**
 * Muat ulang data beranda (komponen server) saat tanggal WITA berganti dan berkala selama tab terbuka,
 * tanpa menghilangkan state komponen di browser.
 */
export function AutoRefresh({ today, everyMs = 5 * 60_000 }: { today: string; everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    let last = Date.now();
    const check = () => {
      const now = Date.now();
      if (document.visibilityState !== "visible") return;
      if (witaDateStr(now) !== today || now - last >= everyMs) {
        last = now;
        router.refresh();
      }
    };
    const id = setInterval(check, 30_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", check);
    };
  }, [router, today, everyMs]);
  return null;
}
