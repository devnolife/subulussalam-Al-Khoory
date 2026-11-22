"use client";

import { CrudPage } from "@/components/admin/CrudPage";
import type { Slide } from "@/lib/types";

export default function SlideAdmin() {
  return (
    <CrudPage<Slide>
      resource="slides"
      title="Slide Poster"
      description="Poster kegiatan. Gambar dikompres otomatis; rasio 16:9 paling pas di layar."
      defaults={() => ({ image: "", caption: "", active: true, sort: 0 })}
      fields={[
        { name: "image", label: "Gambar poster", type: "image" },
        { name: "caption", label: "Keterangan (opsional)", type: "text" },
        { name: "active", label: "Aktif", type: "bool" },
        { name: "sort", label: "Urutan", type: "number" },
      ]}
      renderItem={(s) => (
        <div className="flex gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.image} alt="" className="h-16 w-28 shrink-0 rounded-lg bg-black/30 object-cover" />
          <div className="min-w-0">
            <p className="line-clamp-2 text-sm">{s.caption || "Tanpa keterangan"}</p>
            {!s.active && <span className="mt-1 inline-block rounded-full bg-white/10 px-2 py-0.5 text-[11px]">Nonaktif</span>}
          </div>
        </div>
      )}
    />
  );
}
