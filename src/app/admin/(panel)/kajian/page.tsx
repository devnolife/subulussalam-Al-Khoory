"use client";

import { useState } from "react";
import { useMosqueName } from "@/components/admin/AdminUser";
import { CrudPage, type Lookups } from "@/components/admin/CrudPage";
import { ExportButton, ShareButton, ToolBar } from "@/components/admin/share";
import { linkSpeaker, speakerName, speakerOptions } from "@/components/admin/speakers";
import { WEEKDAYS, kajianScheduleLabel, kajianTimeLabel } from "@/lib/kajian";
import { kajianWeekText } from "@/lib/share";
import { witaDateStr, witaParts } from "@/lib/time";
import type { Kajian } from "@/lib/types";

function KajianTools({ items, lookups }: { items: Kajian[]; lookups: Lookups }) {
  const mosque = useMosqueName();
  const [now] = useState(() => Date.now());
  const named = items.map((k) => ({ ...k, speaker: speakerName(lookups, k.speakerId, k.speaker) }));
  return (
    <ToolBar>
      <ShareButton text={kajianWeekText(named, now, mosque)} emptyMessage="Tidak ada kajian aktif dalam 7 hari ke depan">
        Bagikan jadwal pekan ini
      </ShareButton>
      <ExportButton resource="kajian" />
    </ToolBar>
  );
}

const RECURRENCE_OPTIONS = [
  { value: "weekly", label: "Rutin setiap pekan" },
  { value: "once", label: "Sekali (tanggal tertentu)" },
  { value: "text", label: "Jadwal bebas (ditulis manual)" },
];

/** Membersihkan isian yang tidak dipakai jenis jadwal terpilih dan memeriksa jam. */
function prepareKajian(p: Record<string, unknown>): Record<string, unknown> {
  const out = { ...p };
  const start = String(out.startTime ?? "");
  const end = String(out.endTime ?? "");
  if (out.recurrence === "weekly") {
    if (out.dayOfWeek === "" || out.dayOfWeek == null) throw new Error("Pilih hari kajian");
    Object.assign(out, { date: null, schedule: "" });
  } else if (out.recurrence === "once") {
    if (!out.date) throw new Error("Isi tanggal kajian");
    Object.assign(out, { dayOfWeek: null, schedule: "" });
  } else {
    Object.assign(out, { dayOfWeek: null, date: null, startTime: "", endTime: "" });
    return out;
  }
  if (end && !start) throw new Error("Isi jam mulai terlebih dahulu");
  if (end && end <= start) throw new Error("Jam selesai harus setelah jam mulai");
  return out;
}

export default function KajianAdmin() {
  const [today] = useState(() => witaDateStr(Date.now()));
  return (
    <CrudPage<Kajian>
      resource="kajian"
      title="Jadwal Kajian"
      description="Kajian rutin pekanan atau sekali waktu. Kajian yang sudah lewat otomatis hilang dari layar."
      lookups={["speakers"]}
      defaults={() => ({
        title: "",
        speakerId: "",
        speaker: "",
        recurrence: "weekly",
        dayOfWeek: witaParts(Date.now()).weekday,
        date: "",
        schedule: "",
        startTime: "",
        endTime: "",
        time: "",
        location: "Ruang utama masjid",
        banner: "",
        active: true,
        sort: 0,
      })}
      fields={[
        { name: "title", label: "Judul / tema kajian", type: "text", placeholder: "Kajian Tafsir Al-Qur'an" },
        {
          name: "speakerId",
          label: "Pemateri",
          type: "select",
          options: speakerOptions("speakerId"),
          help: "Tambahkan foto pemateri lewat menu Pembicara.",
        },
        { name: "speaker", label: "Nama pemateri", type: "text", show: (r) => !r.speakerId, placeholder: "Ustadz ..." },
        { name: "recurrence", label: "Jenis jadwal", type: "select", options: RECURRENCE_OPTIONS },
        {
          name: "dayOfWeek",
          label: "Hari",
          type: "select",
          options: WEEKDAYS.map((d, i) => ({ value: String(i), label: d })),
          show: (r) => r.recurrence === "weekly",
        },
        { name: "date", label: "Tanggal", type: "date", show: (r) => r.recurrence === "once" },
        {
          name: "schedule",
          label: "Hari / tanggal",
          type: "text",
          placeholder: "Setiap Kamis pekan kedua",
          show: (r) => r.recurrence === "text",
        },
        { name: "startTime", label: "Jam mulai", type: "time", show: (r) => r.recurrence !== "text" },
        {
          name: "endTime",
          label: "Jam selesai (opsional)",
          type: "time",
          show: (r) => r.recurrence !== "text",
          help: "Setelah jam ini kajian berikutnya yang ditampilkan.",
        },
        { name: "time", label: "Keterangan waktu (opsional)", type: "text", placeholder: "Ba'da Maghrib" },
        { name: "location", label: "Tempat", type: "text" },
        { name: "banner", label: "Gambar latar (opsional)", type: "image" },
        { name: "active", label: "Aktif", type: "bool" },
        { name: "sort", label: "Urutan", type: "number" },
      ]}
      prepare={(p, lookups) => linkSpeaker(prepareKajian(p), lookups, "speakerId", "speaker")}
      header={(items, lookups) => <KajianTools items={items} lookups={lookups} />}
      renderItem={(k, lookups) => {
        const past = k.recurrence === "once" && !!k.date && k.date < today;
        const when = [kajianScheduleLabel(k), kajianTimeLabel(k)].filter(Boolean).join(" · ");
        return (
          <>
            {when && (
              <p className={`text-xs font-semibold uppercase ${past ? "text-muted" : "text-gold-400"}`}>{when}</p>
            )}
            <p className="font-semibold">{k.title}</p>
            <p className="text-sm text-white/60">{speakerName(lookups, k.speakerId, k.speaker)}</p>
            {(!k.active || past) && (
              <span className="mt-1 inline-block rounded-full bg-white/10 px-2 py-0.5 text-[11px]">
                {past ? "Sudah lewat" : "Nonaktif"}
              </span>
            )}
          </>
        );
      }}
    />
  );
}