"use client";

import { useState } from "react";
import { useMosqueName } from "@/components/admin/AdminUser";
import { CrudPage, type Lookups } from "@/components/admin/CrudPage";
import { ExportButton, ShareButton, ToolBar } from "@/components/admin/share";
import { linkSpeaker, speakerName, speakerOptions } from "@/components/admin/speakers";
import { jumatText } from "@/lib/share";
import { addDays, formatDateStr, witaDateStr, witaParts } from "@/lib/time";
import type { Jumat } from "@/lib/types";

function nextFriday(): string {
  const now = Date.now();
  const diff = (5 - witaParts(now).weekday + 7) % 7;
  return addDays(witaDateStr(now), diff);
}

function JumatTools({ items, lookups, today }: { items: Jumat[]; lookups: Lookups; today: string }) {
  const mosque = useMosqueName();
  const named = items.map((j) => ({ ...j, khatib: speakerName(lookups, j.khatibSpeakerId, j.khatib) }));
  return (
    <ToolBar>
      <ShareButton text={jumatText(named, today, mosque)} emptyMessage="Belum ada jadwal Jum'at mendatang">
        Bagikan petugas terdekat
      </ShareButton>
      <ExportButton resource="jumat" />
    </ToolBar>
  );
}

export default function JumatAdmin() {
  const [today] = useState(() => witaDateStr(Date.now()));
  return (
    <CrudPage<Jumat>
      resource="jumat"
      title="Petugas Jum'at"
      description="Khatib, imam, dan muadzin. Hanya jadwal mendatang yang tampil di layar."
      lookups={["speakers"]}
      defaults={() => ({ date: nextFriday(), khatibSpeakerId: "", khatib: "", imam: "", muadzin: "", theme: "" })}
      fields={[
        { name: "date", label: "Tanggal", type: "date" },
        {
          name: "khatibSpeakerId",
          label: "Khatib",
          type: "select",
          options: speakerOptions("khatibSpeakerId"),
          help: "Pilih dari daftar Pembicara agar foto khatib tampil di layar.",
        },
        { name: "khatib", label: "Nama khatib", type: "text", show: (r) => !r.khatibSpeakerId },
        { name: "imam", label: "Imam", type: "text" },
        { name: "muadzin", label: "Muadzin", type: "text" },
        { name: "theme", label: "Tema khutbah (opsional)", type: "text" },
      ]}
      prepare={(p, lookups) => linkSpeaker(p, lookups, "khatibSpeakerId", "khatib")}
      header={(items, lookups) => <JumatTools items={items} lookups={lookups} today={today} />}
      renderItem={(j, lookups) => (
        <>
          <p className={`text-sm font-semibold ${j.date < today ? "text-muted" : "text-gold-400"}`}>
            {formatDateStr(j.date)}
          </p>
          <p className="font-semibold">Khatib: {speakerName(lookups, j.khatibSpeakerId, j.khatib) || "-"}</p>
          <p className="text-sm text-white/60">
            Imam: {j.imam || "-"} · Muadzin: {j.muadzin || "-"}
          </p>
        </>
      )}
    />
  );
}
