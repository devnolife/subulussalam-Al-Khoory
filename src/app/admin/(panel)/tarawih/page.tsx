"use client";

import { useState } from "react";
import { CrudPage } from "@/components/admin/CrudPage";
import { ExportButton, ToolBar } from "@/components/admin/share";
import { linkSpeaker, speakerName, speakerOptions } from "@/components/admin/speakers";
import { WEEKDAYS, weekdayOf } from "@/lib/kajian";
import { formatDateStr, witaDateStr } from "@/lib/time";
import type { Tarawih } from "@/lib/types";

export default function TarawihAdmin() {
  const [today] = useState(() => witaDateStr(Date.now()));
  return (
    <CrudPage<Tarawih>
      resource="tarawih"
      title="Petugas Tarawih"
      description="Imam dan penceramah tiap malam Ramadhan. Tanggal diisi hari ketika tarawih dikerjakan pada malamnya."
      lookups={["speakers"]}
      defaults={() => ({ date: today, imam: "", speakerId: "", speaker: "", theme: "" })}
      fields={[
        { name: "date", label: "Tanggal", type: "date" },
        { name: "imam", label: "Imam", type: "text" },
        { name: "speakerId", label: "Penceramah", type: "select", options: speakerOptions("speakerId") },
        { name: "speaker", label: "Nama penceramah", type: "text", show: (r) => !r.speakerId, placeholder: "Ustadz ..." },
        { name: "theme", label: "Tema ceramah (opsional)", type: "text" },
      ]}
      prepare={(p, lookups) => linkSpeaker(p, lookups, "speakerId", "speaker")}
      header={() => (
        <ToolBar>
          <ExportButton resource="tarawih" />
        </ToolBar>
      )}
      renderItem={(t, lookups) => {
        const speaker = speakerName(lookups, t.speakerId, t.speaker);
        return (
          <>
            <p className={`text-sm font-semibold ${t.date < today ? "text-muted" : "text-gold-400"}`}>
              {WEEKDAYS[weekdayOf(t.date)]}, {formatDateStr(t.date)}
            </p>
            <p className="font-semibold">Imam: {t.imam || "-"}</p>
            <p className="text-sm text-white/60">
              Ceramah: {speaker || "-"}
              {t.theme ? ` · ${t.theme}` : ""}
            </p>
          </>
        );
      }}
    />
  );
}
