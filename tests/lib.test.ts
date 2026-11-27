import { describe, expect, it } from "vitest";
import { activeItems } from "../src/lib/playlist";
import { youtubeEmbedUrl, youtubeSources } from "../src/lib/youtube";
import { formatHijri, hijriStartShift } from "../src/lib/hijri";
import { upcomingIslamicDays } from "../src/lib/islamic-days";
import { witaToMs } from "../src/lib/time";
import { MODULE_TYPES, type ModuleType, type PlaylistItem } from "../src/lib/types";

const items: PlaylistItem[] = MODULE_TYPES.map((type, i) => ({
  id: i + 1,
  type,
  durationSec: 20,
  sort: i,
  enabled: true,
  pinned: false,
}));
const all = Object.fromEntries(MODULE_TYPES.map((t) => [t, true])) as Record<ModuleType, boolean>;
const noOverride = { type: null, until: null };
const types = (list: PlaylistItem[]) => list.map((i) => i.type);

describe("activeItems", () => {
  it("melewati modul nonaktif dan modul tanpa konten", () => {
    const list = items.map((i) => (i.type === "kas" ? { ...i, enabled: false } : i));
    const res = activeItems(list, { ...all, qris: false }, noOverride, 0);
    expect(types(res)).not.toContain("kas");
    expect(types(res)).not.toContain("qris");
    expect(res).toHaveLength(MODULE_TYPES.length - 2);
  });

  it("mengikuti urutan sort", () => {
    const list = items.map((i) => (i.type === "ayat" ? { ...i, sort: -1 } : i));
    expect(activeItems(list, all, noOverride, 0)[0].type).toBe("ayat");
  });

  it("hanya memutar item yang di-pin", () => {
    const list = items.map((i) => (i.type === "kabah" || i.type === "jumat" ? { ...i, pinned: true } : i));
    expect(types(activeItems(list, all, noOverride, 0))).toEqual(["kabah", "jumat"]);
  });

  it("override admin menang sampai kedaluwarsa, walau modul nonaktif", () => {
    const list = items.map((i) => (i.type === "qris" ? { ...i, enabled: false } : i));
    const override = { type: "qris" as const, until: 1000 };
    expect(types(activeItems(list, all, override, 999))).toEqual(["qris"]);
    expect(types(activeItems(list, all, override, 1000))).not.toContain("qris");
  });
});

describe("youtubeEmbedUrl", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "embed/dQw4w9WgXcQ?"],
    ["https://youtu.be/dQw4w9WgXcQ?si=abc", "embed/dQw4w9WgXcQ?"],
    ["https://www.youtube.com/live/dQw4w9WgXcQ", "embed/dQw4w9WgXcQ?"],
    ["dQw4w9WgXcQ", "embed/dQw4w9WgXcQ?"],
    ["https://www.youtube.com/channel/UCos52azQNBgW63_9uDJoPDA/live", "live_stream?channel=UCos52azQNBgW63_9uDJoPDA"],
  ])("%s", (input, expected) => {
    const url = youtubeEmbedUrl(input);
    expect(url).toContain(expected);
    expect(url).toContain("mute=1");
  });

  it("menolak URL yang tidak dikenali", () => {
    expect(youtubeEmbedUrl("")).toBeNull();
    expect(youtubeEmbedUrl("https://example.com")).toBeNull();
  });
});

describe("youtubeSources", () => {
  it("menjaga urutan utama lalu cadangan, membuang duplikat dan URL tidak dikenal", () => {
    const sources = youtubeSources([
      "bukan url",
      "https://youtu.be/NGJ2z3cIKHI",
      "",
      "NGJ2z3cIKHI",
      "https://www.youtube.com/watch?v=l43w1oD0B8g",
    ]);
    expect(sources).toHaveLength(2);
    expect(sources[0]).toContain("embed/NGJ2z3cIKHI?");
    expect(sources[1]).toContain("embed/l43w1oD0B8g?");
  });
});

describe("formatHijri", () => {
  it("memakai tanggal WITA dan mendukung koreksi hari", () => {
    const ms = witaToMs("2026-11-18", "23:30");
    const base = formatHijri(ms);
    expect(base).toMatch(/^\d{1,2} [A-Za-z' ]+ 14\d\d H$/);
    expect(formatHijri(ms, 1)).not.toBe(base);
  });
});

describe("awal bulan Hijriah sesuai penetapan", () => {
  const noon = (date: string) => witaToMs(date, "12:00");
  const ramadhanLater = { offset: 0, months: [{ year: 1447, month: 9, start: "2026-02-19" }] };

  it("tanpa penetapan mengikuti Umm al-Qura", () => {
    expect(formatHijri(noon("2026-02-18"), { offset: 0, months: [] })).toBe("1 Ramadhan 1447 H");
  });

  it("menggeser kalender sehingga tanggal yang diisi menjadi hari pertama", () => {
    expect(formatHijri(noon("2026-02-18"), ramadhanLater)).toBe("29 Sya'ban 1447 H");
    expect(formatHijri(noon("2026-02-19"), ramadhanLater)).toBe("1 Ramadhan 1447 H");
    expect(formatHijri(noon("2026-03-20"), ramadhanLater)).toBe("30 Ramadhan 1447 H");
    expect(formatHijri(noon("2026-03-21"), ramadhanLater)).toBe("1 Syawal 1447 H");
  });

  it("penetapan berikutnya menggantikan geseran sebelumnya", () => {
    const cal = { offset: 0, months: [...ramadhanLater.months, { year: 1447, month: 10, start: "2026-03-20" }] };
    expect(formatHijri(noon("2026-03-19"), cal)).toBe("30 Ramadhan 1447 H");
    expect(formatHijri(noon("2026-03-20"), cal)).toBe("1 Syawal 1447 H");
  });

  it("penetapan yang terlalu jauh dari perhitungan ditolak dan diabaikan", () => {
    const wrong = { year: 1447, month: 9, start: "2026-04-30" };
    expect(hijriStartShift(wrong)).toBeNull();
    expect(hijriStartShift(ramadhanLater.months[0])).toBe(-1);
    expect(formatHijri(noon("2026-04-30"), { offset: 0, months: [wrong] })).toBe(formatHijri(noon("2026-04-30")));
  });
});

describe("upcomingIslamicDays", () => {
  const from = witaToMs("2026-02-01", "12:00");

  it("mengurutkan hari besar terdekat beserta hitung mundurnya", () => {
    const list = upcomingIslamicDays(from, 0, 4);
    expect(list.map((e) => [e.key, e.date, e.daysLeft])).toEqual([
      ["nisfu-syaban", "2026-02-03", 2],
      ["ramadhan", "2026-02-18", 17],
      ["nuzulul-quran", "2026-03-06", 33],
      ["idul-fitri", "2026-03-20", 47],
    ]);
  });

  it("mengikuti awal bulan yang ditetapkan pengurus", () => {
    const cal = { offset: 0, months: [{ year: 1447, month: 10, start: "2026-03-21" }] };
    const idulFitri = upcomingIslamicDays(from, cal, 9).find((e) => e.key === "idul-fitri");
    expect(idulFitri?.date).toBe("2026-03-21");
  });

  it("hari ini dihitung sebagai 0 hari", () => {
    const [first] = upcomingIslamicDays(witaToMs("2026-05-27", "08:00"), 0, 1);
    expect(first).toMatchObject({ key: "idul-adha", daysLeft: 0 });
  });
});
