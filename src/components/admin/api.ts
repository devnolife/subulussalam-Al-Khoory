"use client";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

/** Fetch JSON untuk panel admin; 401 otomatis diarahkan ke halaman login. */
export async function api<T = unknown>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const isForm = init.body instanceof FormData;
  const res = await fetch(path, {
    method: init.method ?? "GET",
    headers: init.body && !isForm ? { "Content-Type": "application/json" } : undefined,
    body: init.body === undefined ? undefined : isForm ? (init.body as FormData) : JSON.stringify(init.body),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && !path.startsWith("/api/auth")) {
    // Sesi habis: muat ulang penuh ke halaman login agar state klien bersih.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    location.href = "/admin/login";
  }
  if (!res.ok) throw new ApiError(data.error ?? "Gagal memproses permintaan", res.status);
  return data as T;
}

export async function uploadImage(file: File, kind: "poster" | "qris" | "logo" = "poster"): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("kind", kind);
  const { url } = await api<{ url: string }>("/api/admin/upload", { method: "POST", body: form });
  return url;
}
