import { AlarmClock, MoonStar, Sun, SunMedium, SunMoon, Sunrise, Sunset, type LucideIcon } from "lucide-react";
import type { PrayerKey } from "@/lib/types";

export const PRAYER_ICONS: Record<PrayerKey, LucideIcon> = {
  imsak: AlarmClock,
  subuh: SunMoon,
  terbit: Sunrise,
  dzuhur: Sun,
  ashar: SunMedium,
  maghrib: Sunset,
  isya: MoonStar,
};
