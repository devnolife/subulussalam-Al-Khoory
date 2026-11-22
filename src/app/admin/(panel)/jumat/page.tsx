"use client";

import { useState } from "react";
import { CrudPage } from "@/components/admin/CrudPage";
import { addDays, formatDateStr, witaDateStr, witaParts } from "@/lib/time";
import type { Jumat } from "@/lib/types";

function nextFriday(): string {
  const now = Date.now();
  const diff = (5 - witaParts(now).weekday + 7) % 7;
  return addDays(witaDateStr(now), diff);
}

export default function JumatAdmin() {
  const [today] = useState(() => witaDateStr(Date.now()));
  return (
    <CrudPage<Jumat>
      resource="jumat"
      title="Petugas Jum'at"
      description="Khatib, imam, dan muadzin. Hanya jadwal mendatang yang tampil di layar."
      defaults={() => ({ date: nextFriday(), khatib: "", imam: "", muadzin: "", theme: "" })}
      fields={[
        { name: "date", label: "Tanggal", type: "date" },
        { name: "khatib", label: "Khatib", type: "text" },
        { name: "imam", label: "Imam", type: "text" },
        { name: "muadzin", label: "Muadzin", type: "text" },
        { name: "theme", label: "Tema khutbah (opsional)", type: "text" },
      ]}
      renderItem={(j) => (
        <>
          <p className={`text-sm font-semibold ${j.date < today ? "text-white/40" : "text-gold-400"}`}>
            {formatDateStr(j.date)}
          </p>
          <p className="font-semibold">Khatib: {j.khatib || "-"}</p>
          <p className="text-sm text-white/60">
            Imam: {j.imam || "-"} · Muadzin: {j.muadzin || "-"}
          </p>
        </>
      )}
    />
  );
}
