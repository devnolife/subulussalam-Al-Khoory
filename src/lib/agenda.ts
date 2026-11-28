import { kajianScheduleLabel, kajianTimeLabel, type ArrangedKajian } from "./kajian";
import { addDays } from "./time";
import { IED_LABELS, type Ied, type Jumat, type Kajian, type Tarawih } from "./types";

export type AgendaKind = "jumat" | "kajian" | "ied" | "tarawih";

export type AgendaItem = {
  key: string;
  kind: AgendaKind;
  /** Tanggal kegiatan; null untuk kajian berjadwal teks bebas. */
  date: string | null;
  title: string;
  /** Pemateri/petugas dan lokasi. */
  detail: string;
  /** Jam atau keterangan waktu, mis. "16:00–17:30 · Ba'da Ashar". */
  time: string;
  /** Tema khutbah/ceramah atau catatan. */
  note: string;
  /** Kajian rutin pekanan. */
  weekly: boolean;
  /** Data belum lengkap (mis. petugas Jum'at belum diisi); `detail` berisi pengingatnya. */
  pending?: boolean;
  href: string;
};

const joinParts = (...parts: (string | null | undefined)[]) => parts.map((p) => p?.trim()).filter(Boolean).join(" · ");
const earliest = <T extends { date: string }>(list: T[]) => [...list].sort((a, b) => a.date.localeCompare(b.date))[0];
/** Jam untuk mengurutkan kegiatan di hari yang sama; tanpa jam dianggap tengah hari. */
const sortTime = (item: { kind: AgendaKind; time: string }) => item.time.match(/^\d{2}:\d{2}/)?.[0] ?? (item.kind === "tarawih" ? "19:30" : "12:00");

/** Jum'at terdekat mulai `today` ("YYYY-MM-DD"); hari ini sendiri bila hari ini Jum'at. */
export function nextFriday(today: string): string {
  const [y, m, d] = today.split("-").map(Number);
  return addDays(today, (12 - new Date(Date.UTC(y, m - 1, d)).getUTCDay()) % 7);
}

/**
 * Kegiatan masjid terdekat untuk beranda panel: Jum'at, sholat Ied, dan tarawih berikutnya (masing-masing satu),
 * ditambah kajian yang sudah diurutkan arrangeKajian. Data harus sudah dibatasi mulai hari ini.
 * Dengan `today`, Jum'at terdekat selalu tampil; bila petugasnya belum diisi, tampil sebagai pengingat.
 */
export function buildAgenda(
  input: { jumat: Jumat[]; kajian: ArrangedKajian<Kajian>[]; ied: Ied[]; tarawih: Tarawih[]; today?: string },
  limit = 6,
): AgendaItem[] {
  const items: AgendaItem[] = [];
  const jumat = earliest(input.jumat);
  const friday = input.today ? nextFriday(input.today) : null;
  if (jumat && (!friday || jumat.date <= friday)) {
    items.push({
      key: `jumat:${jumat.id}`,
      kind: "jumat",
      date: jumat.date,
      title: "Sholat Jum'at",
      detail: joinParts(jumat.khatib && `Khatib ${jumat.khatib}`, jumat.imam && `Imam ${jumat.imam}`),
      time: "",
      note: jumat.theme,
      weekly: false,
      href: "/admin/jumat",
    });
  } else if (friday) {
    items.push({
      key: `jumat:${friday}`,
      kind: "jumat",
      date: friday,
      title: "Sholat Jum'at",
      detail: "Petugas belum diisi",
      time: "",
      note: "",
      weekly: false,
      pending: true,
      href: "/admin/jumat",
    });
  }
  const ied = earliest(input.ied);
  if (ied) {
    items.push({
      key: `ied:${ied.id}`,
      kind: "ied",
      date: ied.date,
      title: `Sholat ${IED_LABELS[ied.kind]}`,
      detail: joinParts(ied.khatib && `Khatib ${ied.khatib}`, ied.location),
      time: ied.time,
      note: ied.note,
      weekly: false,
      href: "/admin/ied",
    });
  }
  const tarawih = earliest(input.tarawih);
  if (tarawih) {
    items.push({
      key: `tarawih:${tarawih.id}`,
      kind: "tarawih",
      date: tarawih.date,
      title: "Sholat tarawih",
      detail: joinParts(tarawih.imam && `Imam ${tarawih.imam}`, tarawih.speaker && `Ceramah ${tarawih.speaker}`),
      time: "",
      note: tarawih.theme,
      weekly: false,
      href: "/admin/tarawih",
    });
  }
  for (const k of input.kajian) {
    items.push({
      key: `kajian:${k.id}`,
      kind: "kajian",
      date: k.nextDate,
      title: k.title,
      detail: joinParts(k.speaker, k.location),
      time: k.nextDate ? kajianTimeLabel(k) : joinParts(kajianScheduleLabel(k), kajianTimeLabel(k)),
      note: "",
      weekly: k.recurrence === "weekly",
      href: "/admin/kajian",
    });
  }
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      if (a.item.date && b.item.date) {
        return a.item.date.localeCompare(b.item.date) || sortTime(a.item).localeCompare(sortTime(b.item)) || a.index - b.index;
      }
      if (a.item.date || b.item.date) return a.item.date ? -1 : 1;
      return a.index - b.index;
    })
    .slice(0, limit)
    .map(({ item }) => item);
}
