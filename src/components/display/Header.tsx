import {
  CalendarClock,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  GraduationCap,
  MapPin,
  Sun,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import type { DisplayState } from "@/lib/types";
import { SunEmblem } from "./SunEmblem";
import { Chip, IconTile } from "./ui";

function weatherIcon(code: number): LucideIcon {
  if (code === 0) return Sun;
  if (code <= 2) return CloudSun;
  if (code === 3) return Cloud;
  if (code <= 48) return CloudFog;
  if (code <= 57) return CloudDrizzle;
  if (code >= 95) return CloudLightning;
  return CloudRain;
}

export function Header({ state, offline }: { state: DisplayState; offline: boolean }) {
  const { mosque, location } = state.settings;
  const weather = state.weather;

  return (
    <header className="flex h-[112px] shrink-0 items-end justify-between gap-10 px-14">
      <div className="flex min-w-0 items-center gap-6">
        <div
          className={`grid size-[88px] shrink-0 place-items-center overflow-hidden rounded-[28px] ${
            mosque.logo ? "bg-white p-2.5" : "card-brand p-3.5 text-white"
          }`}
        >
          {mosque.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mosque.logo} alt="" className="size-full object-contain" />
          ) : (
            <SunEmblem className="size-full" />
          )}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-[46px] leading-none font-extrabold tracking-[-0.025em]">{mosque.name}</h1>
          <div className="mt-3.5 flex min-w-0 items-center gap-7 text-[20px] font-medium text-sky-200/85">
            {mosque.subtitle && (
              <span className="flex shrink-0 items-center gap-2.5">
                <GraduationCap className="size-6 text-gold-400" aria-hidden="true" />
                {mosque.subtitle}
              </span>
            )}
            {mosque.address && (
              <span className="flex min-w-0 items-center gap-2.5">
                <MapPin className="size-6 shrink-0 text-gold-400" aria-hidden="true" />
                <span className="truncate">{mosque.address}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-4">
        {offline && (
          <Chip icon={WifiOff} tone="gold">
            Mode offline
          </Chip>
        )}
        {state.prayer.today.source === "offline" && <Chip icon={CalendarClock}>Jadwal perhitungan lokal</Chip>}
        {weather && (
          <div className="card flex h-[88px] items-center gap-4 rounded-[28px] pr-7 pl-4">
            <IconTile icon={weatherIcon(weather.code)} tone="soft" />
            <div>
              <p className="text-[34px] leading-none font-extrabold tabular-nums">{weather.temperature}°C</p>
              <p className="mt-1.5 text-[18px] font-medium text-sky-200/75">
                {weather.label} · {location.cityName}
              </p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
