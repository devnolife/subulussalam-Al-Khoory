import { describe, expect, it } from "vitest";
import { activeItems } from "../src/lib/playlist";
import { youtubeEmbedUrl, youtubeSources } from "../src/lib/youtube";
import { formatHijri } from "../src/lib/hijri";
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
    expect(res).toHaveLength(6);
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
