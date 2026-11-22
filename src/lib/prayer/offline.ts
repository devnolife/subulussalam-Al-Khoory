import { CalculationMethod, Coordinates, Madhab, PrayerTimes as AdhanTimes, Rounding } from "adhan";
import { shiftHHMM, witaParts } from "../time";
import type { DayTimes, PrayerTimes } from "../types";

const pad = (n: number) => String(n).padStart(2, "0");

function toHHMM(d: Date): string {
  const p = witaParts(d.getTime());
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

/**
 * Perhitungan offline mendekati metode Kemenag RI:
 * sudut Subuh 20°, Isya 18°, Ashar Syafi'i dan ihtiyat.
 * Hasil perkiraan perlu diverifikasi terhadap jadwal resmi setempat.
 */
export function computeOfflineTimes(dateStr: string, lat: number, lng: number): DayTimes {
  const [y, m, d] = dateStr.split("-").map(Number);
  const params = CalculationMethod.Other();
  params.fajrAngle = 20;
  params.ishaAngle = 18;
  params.madhab = Madhab.Shafi;
  params.rounding = Rounding.Up;
  params.adjustments = { fajr: 3, sunrise: -4, dhuhr: 4, asr: 3, maghrib: 3, isha: 2 };
  const t = new AdhanTimes(new Coordinates(lat, lng), new Date(y, m - 1, d), params);
  const subuh = toHHMM(t.fajr);
  const times: PrayerTimes = {
    imsak: shiftHHMM(subuh, -10),
    subuh,
    terbit: toHHMM(t.sunrise),
    dzuhur: toHHMM(t.dhuhr),
    ashar: toHHMM(t.asr),
    maghrib: toHHMM(t.maghrib),
    isya: toHHMM(t.isha),
  };
  return { date: dateStr, times, source: "offline" };
}
