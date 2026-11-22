/**
 * Ubah berbagai bentuk URL YouTube menjadi URL embed.
 * URL channel (/channel/UC…) memakai `live_stream?channel=` agar selalu
 * mengikuti siaran langsung terbaru walau ID videonya berganti.
 */
export function youtubeEmbedUrl(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  const params = "autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&playsinline=1";
  const channel = s.match(/(UC[\w-]{22})/);
  if (channel && !/[?&]v=/.test(s)) return `https://www.youtube.com/embed/live_stream?channel=${channel[1]}&${params}`;
  const id =
    s.match(/[?&]v=([\w-]{11})/)?.[1] ??
    s.match(/youtu\.be\/([\w-]{11})/)?.[1] ??
    s.match(/\/(?:live|embed|shorts)\/([\w-]{11})/)?.[1] ??
    (/^[\w-]{11}$/.test(s) ? s : null);
  return id ? `https://www.youtube.com/embed/${id}?${params}` : null;
}

/** URL embed sesuai prioritas (utama lalu cadangan), tanpa duplikat dan tanpa URL yang tidak dikenali. */
export function youtubeSources(urls: string[]): string[] {
  return [...new Set(urls.map(youtubeEmbedUrl).filter((url): url is string => url !== null))];
}
