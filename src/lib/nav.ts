/**
 * Menu yang sedang dibuka: href terpanjang yang sama persis dengan alamat atau menjadi induknya.
 * Href di `exact` hanya aktif bila sama persis (mis. beranda "/admin" yang menjadi induk semua halaman).
 */
export function activeHref(pathname: string, hrefs: readonly string[], exact: readonly string[] = []): string | null {
  let best: string | null = null;
  for (const href of hrefs) {
    const hit = pathname === href || (!exact.includes(href) && pathname.startsWith(`${href}/`));
    if (hit && (best === null || href.length > best.length)) best = href;
  }
  return best;
}
