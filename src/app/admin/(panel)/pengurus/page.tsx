"use client";

import { CrudPage } from "@/components/admin/CrudPage";
import { Avatar } from "@/components/display/ui";
import type { BoardMember } from "@/lib/types";

export default function PengurusAdmin() {
  return (
    <CrudPage<BoardMember>
      resource="board_members"
      title="Pengurus Masjid"
      description="Susunan pengurus untuk modul layar “Pengurus Masjid”. Urutan kecil tampil lebih dulu."
      defaults={() => ({ name: "", position: "", photo: "", active: true, sort: 0 })}
      fields={[
        { name: "name", label: "Nama", type: "text" },
        { name: "position", label: "Jabatan", type: "text", placeholder: "Ketua / Sekretaris / Bendahara" },
        { name: "photo", label: "Foto (opsional)", type: "image", imageKind: "photo", help: "Tanpa foto, layar menampilkan inisial nama." },
        { name: "active", label: "Tampil di layar", type: "bool" },
        { name: "sort", label: "Urutan", type: "number" },
      ]}
      renderItem={(m) => (
        <div className="flex items-center gap-3">
          <Avatar name={m.name} photo={m.photo || null} className="size-12 rounded-xl text-base" />
          <div className="min-w-0">
            <p className="truncate font-semibold">{m.name}</p>
            {m.position && <p className="truncate text-sm text-gold-400">{m.position}</p>}
            {!m.active && <span className="mt-1 inline-block rounded-full bg-white/10 px-2 py-0.5 text-[11px]">Disembunyikan</span>}
          </div>
        </div>
      )}
    />
  );
}
