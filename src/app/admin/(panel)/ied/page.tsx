"use client";

import { useMosqueName } from "@/components/admin/AdminUser";
import { CrudPage } from "@/components/admin/CrudPage";
import { ShareButton } from "@/components/admin/share";
import { WEEKDAYS, weekdayOf } from "@/lib/kajian";
import { upcomingIslamicDays } from "@/lib/islamic-days";
import { iedText } from "@/lib/share";
import { formatDateStr } from "@/lib/time";
import { IED_KINDS, IED_LABELS, type Ied } from "@/lib/types";

function IedShare({ ied }: { ied: Ied }) {
  const mosque = useMosqueName();
  return (
    <ShareButton text={iedText(ied, mosque)} emptyMessage="" className="mt-3">
      Bagikan
    </ShareButton>
  );
}

/** Perkiraan Ied terdekat menurut kalender Umm al-Qura sebagai isian awal. */
function nextIed(): { kind: Ied["kind"]; date: string } {
  const next = upcomingIslamicDays(Date.now(), 0, 9).find((d) => d.key === "idul-fitri" || d.key === "idul-adha");
  return { kind: next?.key === "idul-adha" ? "adha" : "fitri", date: next?.date ?? "" };
}

export default function IedAdmin() {
  return (
    <CrudPage<Ied>
      resource="ied"
      title="Sholat Ied"
      description="Info sholat Idul Fitri / Idul Adha tampil di layar mulai 30 hari sebelum tanggalnya."
      defaults={() => ({ ...nextIed(), time: "07:00", location: "", khatib: "", imam: "", note: "" })}
      fields={[
        { name: "kind", label: "Hari raya", type: "select", options: IED_KINDS.map((k) => ({ value: k, label: IED_LABELS[k] })) },
        { name: "date", label: "Tanggal", type: "date", help: "Isian awal berupa perkiraan kalender; sesuaikan dengan keputusan pemerintah." },
        { name: "time", label: "Jam sholat", type: "time" },
        { name: "location", label: "Tempat", type: "text", placeholder: "Halaman masjid / lapangan ..." },
        { name: "khatib", label: "Khatib", type: "text" },
        { name: "imam", label: "Imam", type: "text" },
        { name: "note", label: "Catatan (opsional)", type: "text", placeholder: "Jamaah dianjurkan membawa sajadah" },
      ]}
      renderItem={(e) => (
        <>
          <p className="text-sm font-semibold text-gold-400">
            {WEEKDAYS[weekdayOf(e.date)]}, {formatDateStr(e.date)}
            {e.time ? ` · ${e.time} WITA` : ""}
          </p>
          <p className="font-semibold">{IED_LABELS[e.kind]}</p>
          <p className="text-sm text-white/60">
            {[e.location, e.khatib && `Khatib: ${e.khatib}`, e.imam && `Imam: ${e.imam}`].filter(Boolean).join(" · ") || "-"}
          </p>
          <IedShare ied={e} />
        </>
      )}
    />
  );
}
