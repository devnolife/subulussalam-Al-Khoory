import { describe, expect, it } from "vitest";
import { applyCorrections, currentPrayer, nextPrayer, prayerPhase, previousPrayerAt } from "../src/lib/prayer/schedule";
import { computeOfflineTimes } from "../src/lib/prayer/offline";
import { witaToMs } from "../src/lib/time";
import type { DayTimes, PrayerConfig } from "../src/lib/types";

const times = {
  imsak: "04:01",
  subuh: "04:11",
  terbit: "05:30",
  dhuha: "05:57",
  dzuhur: "11:50",
  ashar: "15:10",
  maghrib: "18:05",
  isya: "19:17",
};
const day = (date: string): DayTimes => ({ date, times: { ...times }, source: "kemenag" });
const WED = "2026-11-18";
const FRI = "2026-11-20";
const at = (date: string, hhmm: string, sec = 0) => witaToMs(date, hhmm) + sec * 1000;

const cfg: PrayerConfig = {
  corrections: { imsak: 0, subuh: 0, terbit: 0, dzuhur: 0, ashar: 0, maghrib: 0, isya: 0 },
  iqamahMin: { subuh: 10, dzuhur: 10, ashar: 10, maghrib: 7, isya: 10 },
  shalatMin: { subuh: 10, dzuhur: 10, ashar: 10, maghrib: 10, isya: 10 },
  adzanSec: 180,
  doaSec: 0,
  jumatMin: 45,
};

describe("nextPrayer / currentPrayer", () => {
  it("mencari waktu berikutnya hari ini", () => {
    const n = nextPrayer(at(WED, "12:00"), day(WED), day("2026-11-19"));
    expect(n).toEqual({ key: "ashar", at: at(WED, "15:10"), tomorrow: false });
    expect(currentPrayer(at(WED, "12:00"), day(WED))).toBe("dzuhur");
  });

  it("setelah Isya beralih ke Imsak besok", () => {
    const n = nextPrayer(at(WED, "21:00"), day(WED), day("2026-11-19"));
    expect(n.key).toBe("imsak");
    expect(n.tomorrow).toBe(true);
    expect(n.at).toBe(at("2026-11-19", "04:01"));
  });

  it("sebelum Subuh tidak ada waktu yang sedang berlangsung", () => {
    expect(currentPrayer(at(WED, "03:00"), day(WED))).toBeNull();
  });

  it("rentang hitung mundur dimulai dari waktu terakhir yang sudah lewat", () => {
    expect(previousPrayerAt(at(WED, "12:00"), day(WED))).toBe(at(WED, "11:50"));
    expect(previousPrayerAt(at(WED, "03:00"), day(WED))).toBe(at(WED, "19:17") - 86_400_000);
  });
});

describe("applyCorrections", () => {
  it("menggeser menit, termasuk lintas jam", () => {
    const d = applyCorrections(day(WED), { dzuhur: 12, subuh: -15 });
    expect(d.times.dzuhur).toBe("12:02");
    expect(d.times.subuh).toBe("03:56");
    expect(d.times.ashar).toBe("15:10");
  });
});

describe("prayerPhase", () => {
  it("alur adzan → iqamah → shalat → normal", () => {
    expect(prayerPhase(at(WED, "11:49"), day(WED), cfg).kind).toBe("normal");
    expect(prayerPhase(at(WED, "11:50", 30), day(WED), cfg)).toMatchObject({ kind: "adzan", prayer: "dzuhur" });
    expect(prayerPhase(at(WED, "11:55"), day(WED), cfg)).toMatchObject({
      kind: "iqamah",
      startsAt: at(WED, "11:53"),
      endsAt: at(WED, "12:00"),
    });
    expect(prayerPhase(at(WED, "12:05"), day(WED), cfg)).toMatchObject({ kind: "shalat", endsAt: at(WED, "12:10") });
    expect(prayerPhase(at(WED, "12:10"), day(WED), cfg).kind).toBe("normal");
  });

  it("Maghrib memakai menit iqamah sendiri", () => {
    expect(prayerPhase(at(WED, "18:10"), day(WED), cfg)).toMatchObject({ kind: "iqamah", endsAt: at(WED, "18:12") });
  });

  it("Dzuhur hari Jum'at = adzan lalu khutbah & sholat Jum'at tanpa iqamah", () => {
    expect(prayerPhase(at(FRI, "11:51"), day(FRI), cfg)).toMatchObject({ kind: "adzan", isJumat: true });
    expect(prayerPhase(at(FRI, "12:00"), day(FRI), cfg)).toMatchObject({ kind: "shalat", isJumat: true, endsAt: at(FRI, "12:35") });
    expect(prayerPhase(at(FRI, "12:35"), day(FRI), cfg).kind).toBe("normal");
    // Ashar di hari Jum'at tetap normal
    expect(prayerPhase(at(FRI, "15:15"), day(FRI), cfg)).toMatchObject({ kind: "iqamah", prayer: "ashar" });
  });

  it("mode sholat manual dari admin didahulukan", () => {
    const manual = { prayer: "ashar" as const, startedAt: at(WED, "09:00") };
    expect(prayerPhase(at(WED, "09:01"), day(WED), cfg, manual)).toMatchObject({ kind: "adzan", prayer: "ashar" });
    expect(prayerPhase(at(WED, "09:30"), day(WED), cfg, manual).kind).toBe("normal");
  });

  it("layar doa setelah adzan sebelum hitung mundur iqamah", () => {
    const withDoa = { ...cfg, doaSec: 60 };
    expect(prayerPhase(at(WED, "11:53", 30), day(WED), withDoa)).toMatchObject({
      kind: "doa",
      prayer: "dzuhur",
      startsAt: at(WED, "11:53"),
      endsAt: at(WED, "11:54"),
      iqamahAt: at(WED, "12:00"),
    });
    expect(prayerPhase(at(WED, "11:55"), day(WED), withDoa)).toMatchObject({
      kind: "iqamah",
      startsAt: at(WED, "11:54"),
      endsAt: at(WED, "12:00"),
    });
  });

  it("iqamah tidak dimulai sebelum doa selesai", () => {
    const longDoa = { ...cfg, doaSec: 600, iqamahMin: { ...cfg.iqamahMin, maghrib: 5 } };
    expect(prayerPhase(at(WED, "18:12"), day(WED), longDoa)).toMatchObject({ kind: "doa", iqamahAt: at(WED, "18:18") });
    expect(prayerPhase(at(WED, "18:18"), day(WED), longDoa)).toMatchObject({ kind: "shalat", endsAt: at(WED, "18:28") });
  });

  it("Jum'at tidak menampilkan layar doa", () => {
    const withDoa = { ...cfg, doaSec: 60 };
    expect(prayerPhase(at(FRI, "11:53", 30), day(FRI), withDoa)).toMatchObject({ kind: "shalat", isJumat: true });
  });
});

describe("computeOfflineTimes (Makassar)", () => {
  it("mendekati jadwal Kemenag (selisih ≤ 2 menit)", () => {
    // Jadwal Kemenag Kota Makassar, 18 Nov 2026
    const kemenag = { subuh: "04:17", dzuhur: "11:51", ashar: "15:13", maghrib: "18:01", isya: "19:14" };
    const off = computeOfflineTimes(WED, -5.1834, 119.4445);
    for (const [k, v] of Object.entries(kemenag)) {
      const diff = (witaToMs(WED, off.times[k as keyof typeof kemenag]) - witaToMs(WED, v)) / 60_000;
      expect(Math.abs(diff), k).toBeLessThanOrEqual(2);
    }
  });
});
