"use client";

import { CrudPage } from "@/components/admin/CrudPage";
import { Avatar } from "@/components/display/ui";
import type { Speaker } from "@/lib/types";

export default function PembicaraAdmin() {
  return (
    <CrudPage<Speaker>
      resource="speakers"
      title="Pembicara"
      description="Ustadz, khatib, dan pemateri. Pilih dari daftar ini saat mengisi kajian, petugas Jumat, atau tarawih agar foto tampil di layar."
      defaults={() => ({ name: "", profile: "", photo: "", active: true, sort: 0 })}
      fields={[
        { name: "name", label: "Nama", type: "text", placeholder: "Ustadz ..." },
        {
          name: "profile",
          label: "Profil singkat (opsional)",
          type: "text",
          placeholder: "Pengajar tafsir, alumni ...",
          help: "Satu baris, tampil di bawah nama. Jangan isi nomor telepon.",
        },
        { name: "photo", label: "Foto (opsional)", type: "image", imageKind: "photo", help: "Foto wajah tegak, akan dipotong persegi." },
        { name: "active", label: "Aktif", type: "bool" },
        { name: "sort", label: "Urutan", type: "number" },
      ]}
      renderItem={(s) => (
        <div className="flex items-center gap-3">
          <Avatar name={s.name} photo={s.photo || null} className="size-12 rounded-xl text-base" />
          <div className="min-w-0">
            <p className="truncate font-semibold">{s.name}</p>
            {s.profile && <p className="truncate text-sm text-white/60">{s.profile}</p>}
            {!s.active && <span className="mt-1 inline-block rounded-full bg-white/10 px-2 py-0.5 text-[11px]">Nonaktif</span>}
          </div>
        </div>
      )}
    />
  );
}
