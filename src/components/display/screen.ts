import type { DisplayId } from "@/lib/types";

/** Identitas perangkat & kunci layar yang disimpan di browser TV. */

const CLIENT_KEY = "masjid-display-id";
const accessKeyStorage = (tv: DisplayId) => `masjid-display-key:tv${tv}`;

/** Id acak; tidak memakai crypto.randomUUID karena layar TV biasanya dibuka lewat http biasa. */
export const randomId = (length = 10) =>
  Array.from({ length }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]).join("");

export function isPreview(): boolean {
  return new URLSearchParams(window.location.search).has("preview");
}

/** Id perangkat untuk menghitung layar yang terhubung. */
export function screenClientId(): string {
  let id = localStorage.getItem(CLIENT_KEY);
  if (!id) {
    id = randomId(8);
    localStorage.setItem(CLIENT_KEY, id);
  }
  return id;
}

/**
 * Kunci layar dari `?kunci=` pada alamat, lalu disimpan agar tetap terpakai bila TV dibuka
 * ulang tanpa kunci. Tanpa kunci yang benar, layar tetap jalan tetapi tidak menerima siaran kamera.
 */
export function screenKey(tv: DisplayId): string | null {
  const fromUrl = new URLSearchParams(window.location.search).get("kunci")?.trim().toLowerCase();
  try {
    if (fromUrl) localStorage.setItem(accessKeyStorage(tv), fromUrl);
    return fromUrl || localStorage.getItem(accessKeyStorage(tv));
  } catch {
    return fromUrl || null;
  }
}
