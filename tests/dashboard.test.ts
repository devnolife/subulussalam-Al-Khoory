import { describe, expect, it } from "vitest";
import { buildAgenda, nextFriday } from "../src/lib/agenda";
import { arrangeKajian } from "../src/lib/kajian";
import { activeHref } from "../src/lib/nav";
import { rupiahShort } from "../src/lib/time";
import type { Ied, Jumat, Kajian, Tarawih } from "../src/lib/types";

// Rabu, 4 Maret 2026 pukul 10.00 WITA.
const NOW = Date.parse("2026-03-04T02:00:00Z");

let nextId = 1;
function kajian(patch: Partial<Kajian>): Kajian {
  return {
    id: nextId++,
    title: "Kajian",
    speaker: "",
    speakerId: null,
    recurrence: "text",
    dayOfWeek: null,
    date: null,
    startTime: "",
    endTime: "",
    schedule: "",
    time: "",
    location: "",
    banner: "",
    active: true,
    sort: 0,
    ...patch,
  };
}
const jumat = (date: string): Jumat => ({ id: nextId++, date, khatib: "Ust. Ahmad", khatibSpeakerId: null, imam: "", muadzin: "", theme: "Takwa" });
const ied = (date: string): Ied => ({ id: nextId++, kind: "fitri", date, time: "07:00", location: "Lapangan kampus", khatib: "", imam: "", note: "" });
const tarawih = (date: string): Tarawih => ({ id: nextId++, date, imam: "Ust. Rahman", speaker: "", speakerId: null, theme: "" });

describe("agenda beranda panel", () => {
  it("mengambil satu Jum'at, Ied, dan tarawih terdekat lalu mengurutkannya bersama kajian", () => {
    const list = arrangeKajian(
      [
        kajian({ title: "Tafsir pagi", recurrence: "weekly", dayOfWeek: 5, startTime: "06:00" }),
        kajian({ title: "Fiqih", recurrence: "weekly", dayOfWeek: 4, startTime: "16:00" }),
        kajian({ title: "Kajian bulanan", schedule: "Ahad pekan pertama" }),
      ],
      NOW,
    );
    const agenda = buildAgenda({
      jumat: [jumat("2026-03-13"), jumat("2026-03-06")],
      // Daftar Ied dari database terurut menurun; yang dipakai tetap tanggal terdekat.
      ied: [ied("2026-03-20"), ied("2026-05-27")].reverse(),
      tarawih: [tarawih("2026-03-04"), tarawih("2026-03-05")],
      kajian: list,
    });
    expect(agenda.map((a) => [a.title, a.date])).toEqual([
      ["Sholat tarawih", "2026-03-04"],
      ["Fiqih", "2026-03-05"],
      ["Tafsir pagi", "2026-03-06"],
      ["Sholat Jum'at", "2026-03-06"],
      ["Sholat Idul Fitri", "2026-03-20"],
      ["Kajian bulanan", null],
    ]);
    expect(agenda[3]).toMatchObject({ detail: "Khatib Ust. Ahmad", note: "Takwa", href: "/admin/jumat" });
    expect(agenda[1]).toMatchObject({ weekly: true, time: "16:00" });
    expect(agenda[5].time).toBe("Ahad pekan pertama");
  });

  it("membatasi jumlah kegiatan", () => {
    const list = arrangeKajian(
      Array.from({ length: 8 }, (_, i) => kajian({ title: `K${i}`, recurrence: "once", date: `2026-03-1${i}` })),
      NOW,
    );
    expect(buildAgenda({ jumat: [], ied: [], tarawih: [], kajian: list }, 3).map((a) => a.title)).toEqual(["K0", "K1", "K2"]);
  });

  it("selalu menampilkan Jum'at terdekat dan mengingatkan bila petugasnya belum diisi", () => {
    expect(nextFriday("2026-03-04")).toBe("2026-03-06");
    expect(nextFriday("2026-03-06")).toBe("2026-03-06");
    expect(nextFriday("2026-03-07")).toBe("2026-03-13");

    const base = { ied: [], tarawih: [], kajian: [], today: "2026-03-04" };
    // Petugas baru diisi untuk pekan depan; Jum'at lusa tetap muncul sebagai pengingat.
    expect(buildAgenda({ ...base, jumat: [jumat("2026-03-13")] })).toEqual([
      expect.objectContaining({ date: "2026-03-06", detail: "Petugas belum diisi", pending: true, href: "/admin/jumat" }),
    ]);
    const filled = buildAgenda({ ...base, jumat: [jumat("2026-03-06")] });
    expect(filled).toHaveLength(1);
    expect(filled[0]).toMatchObject({ date: "2026-03-06", detail: "Khatib Ust. Ahmad" });
    expect(filled[0].pending).toBeUndefined();
  });
});

describe("menu aktif", () => {
  const hrefs = ["/admin", "/admin/kas", "/admin/kas/kategori", "/admin/pengaturan"];

  it("memilih menu terpanjang yang menjadi induk alamat", () => {
    expect(activeHref("/admin/kas/kategori", hrefs, ["/admin"])).toBe("/admin/kas/kategori");
    expect(activeHref("/admin/kas/impor", hrefs, ["/admin"])).toBe("/admin/kas");
    expect(activeHref("/admin/kasir", hrefs, ["/admin"])).toBeNull();
  });

  it("beranda hanya aktif di alamatnya sendiri", () => {
    expect(activeHref("/admin", hrefs, ["/admin"])).toBe("/admin");
    expect(activeHref("/admin/pengumuman", hrefs, ["/admin"])).toBeNull();
    expect(activeHref("/admin/pengumuman", hrefs)).toBe("/admin");
  });
});

describe("rupiah ringkas untuk grafik", () => {
  it("memakai satuan rb, jt, dan M dengan satu desimal", () => {
    expect(rupiahShort(0)).toBe("Rp 0");
    expect(rupiahShort(850_000)).toBe("Rp 850 rb");
    expect(rupiahShort(1_250_000)).toBe("Rp 1,3 jt");
    expect(rupiahShort(25_000_000)).toBe("Rp 25 jt");
    expect(rupiahShort(2_000_000_000)).toBe("Rp 2 M");
  });
});
