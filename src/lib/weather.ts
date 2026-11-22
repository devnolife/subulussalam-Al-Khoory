import type { Weather } from "./types";

const LABELS: [number[], string][] = [
  [[0], "Cerah"],
  [[1, 2], "Cerah Berawan"],
  [[3], "Berawan"],
  [[45, 48], "Berkabut"],
  [[51, 53, 55, 56, 57], "Gerimis"],
  [[61, 63, 80, 81], "Hujan"],
  [[65, 82], "Hujan Lebat"],
  [[95, 96, 99], "Badai Petir"],
];

export function weatherLabel(code: number): string {
  return LABELS.find(([codes]) => codes.includes(code))?.[1] ?? "Berawan";
}

const g = globalThis as typeof globalThis & { __weather?: Weather; __weatherAt?: number };
const TTL = 30 * 60_000;

/** Cuaca terkini dari Open-Meteo, cache 30 menit di memori server. */
export async function getWeather(lat: number, lng: number): Promise<Weather> {
  if (g.__weatherAt && Date.now() - g.__weatherAt < TTL) return g.__weather ?? null;
  g.__weatherAt = Date.now();
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&timezone=Asia%2FMakassar`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000), cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const json = await res.json();
    const code = Number(json.current.weather_code);
    g.__weather = {
      temperature: Math.round(Number(json.current.temperature_2m)),
      code,
      label: weatherLabel(code),
      updatedAt: Date.now(),
    };
  } catch (e) {
    console.warn("[weather] gagal:", (e as Error).message);
    g.__weatherAt = Date.now() - TTL + 5 * 60_000;
  }
  return g.__weather ?? null;
}
