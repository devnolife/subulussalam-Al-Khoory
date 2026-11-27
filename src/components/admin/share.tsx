"use client";

import { useState, type ReactNode } from "react";
import { Download, Share2 } from "lucide-react";
import { toast } from "sonner";
import { waLink } from "@/lib/share";
import { Button } from "./ui";

/**
 * Di HP pakai lembar bagikan bawaan (bisa pilih grup WhatsApp, Telegram, dll.);
 * di komputer buka WhatsApp Web dengan teks terisi.
 * Harus dipanggil langsung dari klik agar browser mengizinkannya.
 */
async function shareText(text: string) {
  const mobile = window.matchMedia("(pointer: coarse)").matches;
  if (mobile && typeof navigator.share === "function") {
    try {
      await navigator.share({ text });
      return;
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
    }
  }
  window.open(waLink(text), "_blank", "noopener,noreferrer");
}

/** `text` null = belum ada data untuk dibagikan; tombol menjelaskan lewat `emptyMessage`. */
export function ShareButton({
  text,
  emptyMessage,
  children = "Bagikan ke WhatsApp",
  className = "",
}: {
  text: string | null;
  emptyMessage: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      className={className}
      onClick={() => (text ? shareText(text) : toast.info(emptyMessage))}
    >
      <Share2 className="size-4 text-emerald-300" aria-hidden="true" />
      {children}
    </Button>
  );
}

function filenameOf(res: Response, fallback: string): string {
  const match = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "");
  return match?.[1] ?? fallback;
}

/** Unduh CSV dari /api/admin/export; galat (mis. tanggal tidak valid) tampil sebagai toast. */
export function ExportButton({
  resource,
  from,
  to,
  children = "Unduh CSV",
  className = "",
}: {
  resource: string;
  from?: string;
  to?: string;
  children?: ReactNode;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const download = async () => {
    setBusy(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const query = params.toString() ? `?${params}` : "";
      const res = await fetch(`/api/admin/export/${resource}${query}`, { cache: "no-store" });
      if (res.status === 401) {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        location.href = "/admin/login";
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Gagal mengunduh CSV");
      }
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = filenameOf(res, `${resource}.csv`);
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("File CSV diunduh");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button type="button" variant="ghost" className={className} loading={busy} onClick={download}>
      {!busy && <Download className="size-4 text-sky-300" aria-hidden="true" />}
      {children}
    </Button>
  );
}

/** Baris tombol bagikan/unduh; tombol melebar rata dan turun ke baris baru bila sempit. */
export function ToolBar({ children, className = "mb-4" }: { children: ReactNode; className?: string }) {
  return <div className={`flex flex-wrap gap-2 *:flex-1 ${className}`}>{children}</div>;
}
