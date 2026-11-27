import { describe, expect, it } from "vitest";
import { IED_LEAD_DAYS, ramadhanNight, ramadhanView } from "../src/lib/ramadhan";
import { computeOfflineTimes } from "../src/lib/prayer/offline";
import { addDays, witaDateStr } from "../src/lib/time";
import type { Ied, Tarawih } from "../src/lib/types";

const LAT = -5.1477;
const LNG = 119.4327;
const wita = (date: string, hhmm: string) => Date.parse(`${date}T${hhmm}:00+08:00`);
const prayerAt = (now: number) => {
  const today = witaDateStr(now);
  return { today: computeOfflineTimes(today, LAT, LNG), tomorrow: computeOfflineTimes(addDays(today, 1), LAT, LNG) };
};
const view = (now: number, tarawih: Tarawih[] = [], ied: Ied[] = [], calendar = 0) =>
  ramadhanView(now, calendar, prayerAt(now), tarawih, ied);

const tarawih = (id: number, date: string): Tarawih => ({ id, date, imam: `Imam ${id}`, speaker: "", speakerId: null, theme: "" });
const ied = (id: number, kind: Ied["kind"], date: string): Ied => ({
  id, kind, date, time: "07:00", location: "", khatib: "", imam: "", note: "",
});

// Umm al-Qura: 17 Feb 2026 = 29 Sya'ban 1447, 18 Feb = 1 Ramadhan, 20 Mar = 1 Syawal, 27 Mei = 10 Dzulhijjah.
describe("modul Ramadhan & hari raya", () => {
  it("tidak tampil di luar musimnya", () => {
    expect(view(wita("2026-07-01", "10:00"))).toBeNull();
    expect(view(wita("2026-07-01", "10:00"), [tarawih(1, "2026-06-30")])).toBeNull();
  });

  it("menampilkan puasa hari ini sampai Maghrib, lalu puasa esok hari", () => {
    const afternoon = wita("2026-03-01", "15:00");
    const v = view(afternoon);
    const times = prayerAt(afternoon).today.times;
    expect(v).toMatchObject({ ramadhanYear: 1447, fasting: { when: "today", date: "2026-03-01", day: 12 } });
    expect(v?.fasting).toMatchObject({ imsak: times.imsak, maghrib: times.maghrib });

    const night = view(wita("2026-03-01", "19:30"));
    const tomorrow = prayerAt(wita("2026-03-01", "19:30")).tomorrow.times;
    expect(night?.fasting).toMatchObject({ when: "tomorrow", date: "2026-03-02", day: 13, imsak: tomorrow.imsak });
  });

  it("sudah tampil sehari sebelum 1 Ramadhan", () => {
    const v = view(wita("2026-02-17", "10:00"));
    expect(v).toMatchObject({ ramadhanYear: 1447, fasting: { when: "tomorrow", day: 1 } });
    expect(ramadhanNight("2026-02-17", 0)).toBe(1);
  });

  it("menomori malam tarawih dan memisahkan petugas malam ini dari berikutnya", () => {
    const now = wita("2026-03-01", "15:00");
    const v = view(now, [tarawih(1, "2026-02-28"), tarawih(3, "2026-03-03"), tarawih(2, "2026-03-01"), tarawih(4, "2026-03-02")]);
    expect(v?.tonight).toMatchObject({ id: 2, night: 13 });
    expect(v?.upcoming.map((t) => [t.id, t.night])).toEqual([
      [4, 14],
      [3, 15],
    ]);
    expect(ramadhanNight("2026-03-19", 0)).toBeNull();
    // Penyesuaian kalender ikut menggeser nomor malam.
    expect(ramadhanNight("2026-02-17", 1)).toBe(2);
  });

  it("menampilkan sholat Ied paling lambat 30 hari sebelumnya", () => {
    const adha = ied(1, "adha", "2026-05-27");
    const inRange = view(wita(addDays("2026-05-27", -IED_LEAD_DAYS), "08:00"), [], [adha]);
    expect(inRange).toMatchObject({ ramadhanYear: null, fasting: null, ied: { kind: "adha", daysLeft: 30 } });
    expect(view(wita(addDays("2026-05-27", -IED_LEAD_DAYS - 1), "08:00"), [], [adha])).toBeNull();
    expect(view(wita("2026-05-28", "08:00"), [], [adha])).toBeNull();
  });

  it("malam terakhir Ramadhan: tanpa puasa esok, Idul Fitri besok", () => {
    const v = view(wita("2026-03-19", "20:00"), [], [ied(2, "fitri", "2026-03-20"), ied(3, "adha", "2026-05-27")]);
    expect(v).toMatchObject({ ramadhanYear: 1447, fasting: null, ied: { id: 2, daysLeft: 1 } });
  });
});
