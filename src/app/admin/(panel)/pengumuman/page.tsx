"use client";

import { useState } from "react";
import { CrudPage } from "@/components/admin/CrudPage";
import { witaDateStr } from "@/lib/time";
import type { Announcement } from "@/lib/types";

export default function PengumumanAdmin() {
  const [today] = useState(() => witaDateStr(Date.now()));
  return (
    <CrudPage<Announcement>
      resource="announcements"
      title="Pengumuman"
      description="Tampil di running text bawah dan/atau sebagai panel."
      defaults={() => ({ title: "", body: "", showTicker: true, showPanel: true, active: true, endsAt: "", sort: 0 })}
      fields={[
        { name: "title", label: "Judul (opsional)", type: "text", placeholder: "Contoh: Kerja Bakti" },
        { name: "body", label: "Isi pengumuman", type: "textarea" },
        { name: "showTicker", label: "Tampilkan di running text", type: "bool" },
        { name: "showPanel", label: "Tampilkan sebagai panel", type: "bool" },
        { name: "active", label: "Aktif", type: "bool" },
        { name: "endsAt", label: "Tampil sampai tanggal (opsional)", type: "date", help: "Kosongkan agar tampil terus" },
        { name: "sort", label: "Urutan", type: "number" },
      ]}
      renderItem={(a) => {
        const expired = a.endsAt && a.endsAt < today;
        return (
          <>
            {a.title && <p className="font-semibold text-gold-400">{a.title}</p>}
            <p className="line-clamp-3 text-sm">{a.body}</p>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
              {!a.active && <span className="rounded-full bg-white/10 px-2 py-0.5">Nonaktif</span>}
              {expired && <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-rose-200">Kedaluwarsa</span>}
              {a.showTicker && <span className="rounded-full bg-sky-300/15 px-2 py-0.5 text-sky-200">Running text</span>}
              {a.showPanel && <span className="rounded-full bg-royal-600/30 px-2 py-0.5">Panel</span>}
              {a.endsAt && <span className="rounded-full bg-white/10 px-2 py-0.5">s/d {a.endsAt}</span>}
            </div>
          </>
        );
      }}
    />
  );
}
