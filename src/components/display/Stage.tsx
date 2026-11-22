"use client";

import { useEffect, useState, type ReactNode } from "react";

const W = 1920;
const H = 1080;

/** Kanvas tetap 1920×1080 yang diskalakan ke ukuran layar, agar tata letak konsisten di TV apa pun. */
export function Stage({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / W, window.innerHeight / H));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-navy-950 cursor-none">
      <div
        className="relative shrink-0 overflow-hidden"
        style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: "center" }}
      >
        {children}
      </div>
    </div>
  );
}
