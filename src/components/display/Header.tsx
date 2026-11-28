import {
  CalendarClock,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  Sun,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { displayLabel, type DisplayState } from "@/lib/types";
import { MosqueMark } from "@/components/MosqueMark";
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
    <header className="mx-14 flex h-[112px] shrink-0 items-center justify-between gap-6 border-b border-line">
      <div className="flex min-w-0 items-center gap-5">
        <MosqueMark logo={mosque.logo} className="size-[76px] rounded-2xl p-2" />
        <div className="min-w-0">
          <h1 className="truncate text-[44px] leading-tight font-bold tracking-[-0.04em]">{mosque.name}</h1>
          <div className="mt-1 flex min-w-0 items-center gap-3 text-[20px] font-medium text-muted">
            {mosque.subtitle && (
              <span className={`shrink-0 truncate ${mosque.address ? "max-w-3/5" : "max-w-full"}`}>
                {mosque.subtitle}
              </span>
            )}
            {mosque.subtitle && mosque.address && <span aria-hidden="true">·</span>}
            {mosque.address && <span className="truncate">{mosque.address}</span>}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-5">
        {offline && (
          <Chip icon={WifiOff} tone="gold">
            Mode offline
          </Chip>
        )}
        {state.prayer.today.source === "offline" && <Chip icon={CalendarClock}>Jadwal perhitungan lokal</Chip>}
        {weather && (
          <div className="flex items-center gap-3">
            <IconTile icon={weatherIcon(weather.code)} tone="soft" />
            <div>
              <p className="text-[32px] leading-none font-bold tabular-nums">{weather.temperature}°C</p>
              <p className="mt-1.5 max-w-[290px] truncate text-[18px] font-medium text-muted">
                {weather.label} · {location.cityName}
              </p>
            </div>
          </div>
        )}
        <p className="max-w-[260px] truncate border-l border-line pl-5 text-[27px] font-semibold tabular-nums">{displayLabel(state.display)}</p>
      </div>
    </header>
  );
}
