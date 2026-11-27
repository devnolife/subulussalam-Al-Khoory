import { describe, expect, it } from "vitest";
import { arrangeKajian, kajianScheduleLabel, kajianTimeLabel } from "../src/lib/kajian";
import type { Kajian } from "../src/lib/types";

// Ahad, 1 Maret 2026 pukul 17.00 WITA.
const NOW = Date.parse("2026-03-01T09:00:00Z");
const at = (hhmm: string) => Date.parse(`2026-03-01T${hhmm}:00+08:00`);

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

describe("jadwal kajian terstruktur", () => {
  it("menandai kajian rutin hari ini sampai jam selesai, lalu pindah ke pekan berikutnya", () => {
    const k = kajian({ recurrence: "weekly", dayOfWeek: 0, startTime: "16:00", endTime: "17:30" });
    expect(arrangeKajian([k], NOW)[0]).toMatchObject({ nextDate: "2026-03-01", relative: "Hari ini" });
    expect(arrangeKajian([k], at("17:30"))[0]).toMatchObject({ nextDate: "2026-03-08", relative: null });
    // Tanpa jam selesai tetap "Hari ini" sampai pergantian hari.
    expect(arrangeKajian([{ ...k, endTime: "" }], at("23:59"))[0].relative).toBe("Hari ini");
  });

  it("menghitung pertemuan rutin berikutnya", () => {
    const monday = kajian({ recurrence: "weekly", dayOfWeek: 1 });
    const saturday = kajian({ recurrence: "weekly", dayOfWeek: 6 });
    const [first, second] = arrangeKajian([saturday, monday], NOW);
    expect(first).toMatchObject({ id: monday.id, nextDate: "2026-03-02", relative: "Besok" });
    expect(second).toMatchObject({ id: saturday.id, nextDate: "2026-03-07", relative: null });
  });

  it("menyembunyikan kajian sekali yang sudah lewat atau sudah selesai hari ini", () => {
    const yesterday = kajian({ recurrence: "once", date: "2026-02-28" });
    const endedToday = kajian({ recurrence: "once", date: "2026-03-01", startTime: "08:00", endTime: "16:30" });
    const laterToday = kajian({ recurrence: "once", date: "2026-03-01", startTime: "19:00" });
    const result = arrangeKajian([yesterday, endedToday, laterToday], NOW);
    expect(result.map((k) => k.id)).toEqual([laterToday.id]);
    expect(result[0].relative).toBe("Hari ini");
  });

  it("mengurutkan kajian bertanggal (tanggal, jam) sebelum jadwal teks bebas", () => {
    const text2 = kajian({ schedule: "Setiap pekan kedua", sort: 2 });
    const text1 = kajian({ schedule: "Ahad pagi", sort: 1 });
    const later = kajian({ recurrence: "once", date: "2026-03-01", startTime: "20:00" });
    const earlier = kajian({ recurrence: "weekly", dayOfWeek: 0, startTime: "18:30" });
    const nextWeek = kajian({ recurrence: "once", date: "2026-03-05" });
    const ids = arrangeKajian([text2, nextWeek, later, text1, earlier], NOW).map((k) => k.id);
    expect(ids).toEqual([earlier.id, later.id, nextWeek.id, text1.id, text2.id]);
  });

  it("membuat label hari dan jam yang mudah dibaca", () => {
    expect(kajianScheduleLabel(kajian({ recurrence: "weekly", dayOfWeek: 4 }))).toBe("Setiap Kamis");
    expect(kajianScheduleLabel(kajian({ recurrence: "once", date: "2026-03-07" }))).toBe("Sabtu, 7 Maret 2026");
    expect(kajianScheduleLabel(kajian({ schedule: "Hari ini" }))).toBe("Hari ini");
    expect(kajianTimeLabel(kajian({ recurrence: "weekly", startTime: "16:00", endTime: "17:30", time: "Ba'da Ashar" }))).toBe(
      "16:00–17:30 · Ba'da Ashar",
    );
    expect(kajianTimeLabel(kajian({ recurrence: "once", startTime: "08:00" }))).toBe("08:00");
    // Jadwal teks lama tidak memakai jam terstruktur.
    expect(kajianTimeLabel(kajian({ startTime: "08:00", time: "Ba'da Maghrib" }))).toBe("Ba'da Maghrib");
  });
});
