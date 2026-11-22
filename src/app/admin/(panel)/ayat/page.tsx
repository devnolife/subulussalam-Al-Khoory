"use client";

import { CrudPage } from "@/components/admin/CrudPage";
import type { Verse } from "@/lib/types";

export default function AyatAdmin() {
  return (
    <CrudPage<Verse>
      resource="verses"
      title="Ayat & Hadits"
      description="Satu ayat/hadits ditampilkan bergiliran setiap hari."
      defaults={() => ({ arabic: "", translation: "", source: "", active: true })}
      fields={[
        { name: "arabic", label: "Teks Arab", type: "arabic" },
        { name: "translation", label: "Terjemahan", type: "textarea" },
        { name: "source", label: "Sumber", type: "text", placeholder: "QS. Al-Baqarah: 153 / HR. Bukhari" },
        { name: "active", label: "Aktif", type: "bool" },
      ]}
      renderItem={(v) => (
        <>
          <p dir="rtl" className="line-clamp-2 font-arabic text-xl leading-loose">
            {v.arabic}
          </p>
          <p className="line-clamp-2 text-sm text-white/70">{v.translation}</p>
          <p className="mt-1 text-xs font-semibold text-gold-400">
            {v.source}
            {!v.active && " · Nonaktif"}
          </p>
        </>
      )}
    />
  );
}
