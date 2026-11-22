"use client";

import { CrudPage } from "@/components/admin/CrudPage";
import type { Kajian } from "@/lib/types";

export default function KajianAdmin() {
  return (
    <CrudPage<Kajian>
      resource="kajian"
      title="Jadwal Kajian"
      description="Kajian rutin maupun sekali waktu."
      defaults={() => ({ title: "", speaker: "", schedule: "", time: "", location: "Ruang utama masjid", active: true, sort: 0 })}
      fields={[
        { name: "title", label: "Judul / tema kajian", type: "text", placeholder: "Kajian Tafsir Al-Qur'an" },
        { name: "speaker", label: "Pemateri", type: "text", placeholder: "Ustadz ..." },
        { name: "schedule", label: "Hari / tanggal", type: "text", placeholder: "Setiap Kamis / Sabtu, 29 Nov" },
        { name: "time", label: "Waktu", type: "text", placeholder: "Ba'da Maghrib" },
        { name: "location", label: "Tempat", type: "text" },
        { name: "active", label: "Aktif", type: "bool" },
        { name: "sort", label: "Urutan", type: "number" },
      ]}
      renderItem={(k) => (
        <>
          <p className="text-xs font-semibold text-gold-400 uppercase">{[k.schedule, k.time].filter(Boolean).join(" · ")}</p>
          <p className="font-semibold">{k.title}</p>
          <p className="text-sm text-white/60">{k.speaker}</p>
          {!k.active && <span className="mt-1 inline-block rounded-full bg-white/10 px-2 py-0.5 text-[11px]">Nonaktif</span>}
        </>
      )}
    />
  );
}
