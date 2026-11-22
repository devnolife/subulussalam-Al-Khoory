"use client";

import { useEffect, useRef, useState } from "react";

/** Pratinjau layar TV (1920×1080) diskalakan ke lebar kontainer. */
export function DisplayPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / 1920));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black ring-1 ring-white/10">
      {scale > 0 && (
        <iframe
          src="/display?preview=1"
          title="Pratinjau layar"
          className="pointer-events-none absolute top-0 left-0 origin-top-left border-0"
          style={{ width: 1920, height: 1080, transform: `scale(${scale})` }}
        />
      )}
    </div>
  );
}
