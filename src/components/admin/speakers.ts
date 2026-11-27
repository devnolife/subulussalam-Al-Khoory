import type { Lookups, Option } from "./CrudPage";

/** Pilihan pembicara untuk <select>: input manual, pembicara aktif, dan pilihan lama meski sudah nonaktif. */
export function speakerOptions(field: string) {
  return (record: Record<string, unknown>, lookups: Lookups): Option[] => {
    const current = String(record[field] ?? "");
    const list = (lookups.speakers ?? []).filter((s) => s.active || String(s.id) === current);
    return [
      { value: "", label: "— Ketik nama manual —" },
      ...list.map((s) => ({ value: String(s.id), label: s.active ? String(s.name) : `${s.name} (nonaktif)` })),
    ];
  };
}

/**
 * Bila pembicara dipilih dari daftar, namanya disalin ke kolom teks
 * agar tetap terbaca seandainya data pembicara kelak dihapus.
 */
export function linkSpeaker(payload: Record<string, unknown>, lookups: Lookups, idField: string, nameField: string) {
  const id = payload[idField];
  const speaker = id ? (lookups.speakers ?? []).find((s) => String(s.id) === String(id)) : undefined;
  return {
    ...payload,
    [idField]: speaker ? speaker.id : null,
    [nameField]: speaker ? String(speaker.name) : payload[nameField],
  };
}

/** Nama pembicara terbaru bila terhubung, selain itu nama yang diketik. */
export function speakerName(lookups: Lookups, id: number | null, fallback: string): string {
  const s = id !== null ? (lookups.speakers ?? []).find((x) => x.id === id) : undefined;
  return s ? String(s.name) : fallback;
}
