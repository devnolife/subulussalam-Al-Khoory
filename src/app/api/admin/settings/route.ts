import { NextResponse } from "next/server";
import { z } from "zod";
import { getSettings, setSetting } from "@/lib/settings";
import { authorize, handleError } from "@/lib/api";
import { audit } from "@/lib/auth";
import { publish } from "@/lib/realtime";
import { clearPrayerCache } from "@/lib/prayer/service";
import { FARDH_KEYS, PRAYER_KEYS } from "@/lib/types";
import { hijriStartShift } from "@/lib/hijri";

const minutes = z.coerce.number().int().min(-60).max(60);
const fardhMinutes = z.coerce.number().int().min(0).max(120);
const str = (max: number) => z.string().trim().max(max);

const schema = z
  .object({
    mosque: z.object({
      name: str(120).min(1),
      subtitle: str(160),
      address: str(200),
      logo: z.string().max(300).nullable(),
    }),
    location: z.object({
      lat: z.coerce.number().min(-90).max(90),
      lng: z.coerce.number().min(-180).max(180),
      kemenagCityId: str(10).regex(/^\d+$/, "ID kota Kemenag harus angka"),
      cityName: str(120),
    }),
    prayer: z.object({
      corrections: z.object(Object.fromEntries(PRAYER_KEYS.map((k) => [k, minutes])) as Record<(typeof PRAYER_KEYS)[number], typeof minutes>),
      iqamahMin: z.object(Object.fromEntries(FARDH_KEYS.map((k) => [k, fardhMinutes])) as Record<(typeof FARDH_KEYS)[number], typeof fardhMinutes>),
      shalatMin: z.object(Object.fromEntries(FARDH_KEYS.map((k) => [k, fardhMinutes])) as Record<(typeof FARDH_KEYS)[number], typeof fardhMinutes>),
      adzanSec: z.coerce.number().int().min(30).max(900),
      doaSec: z.coerce.number().int().min(0).max(600).default(60),
      jumatMin: z.coerce.number().int().min(10).max(120),
    }),
    hijriOffset: z.coerce.number().int().min(-3).max(3),
    hijriMonths: z
      .array(
        z.object({
          year: z.coerce.number().int().min(1400).max(1600),
          month: z.coerce.number().int().min(1).max(12),
          start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal mulai harus YYYY-MM-DD"),
        }),
      )
      .max(36)
      .refine(
        (list) => new Set(list.map((m) => `${m.year}-${m.month}`)).size === list.length,
        "Bulan Hijriah yang sama diisi lebih dari sekali",
      )
      .refine(
        (list) => list.every((m) => hijriStartShift(m) !== null),
        "Ada tanggal awal bulan Hijriah yang selisihnya lebih dari 5 hari dari perhitungan. Periksa bulan dan tahunnya.",
      ),
    kabah: z.object({ youtubeUrl: str(300), backupUrl: str(300).default(""), sound: z.boolean().default(true) }),
    qris: z.object({
      image: z.string().max(300).nullable(),
      bankName: str(80),
      accountNo: str(60),
      accountName: str(120),
      note: str(200),
    }),
  })
  .partial();

export async function GET() {
  const user = await authorize(null);
  if (user instanceof NextResponse) return user;
  try {
    return NextResponse.json(await getSettings());
  } catch (e) {
    return handleError(e);
  }
}

const SECTION_LABELS: Record<string, string> = {
  mosque: "identitas masjid",
  location: "lokasi",
  prayer: "jadwal sholat",
  hijriOffset: "koreksi Hijriah",
  hijriMonths: "awal bulan Hijriah",
  kabah: "siaran Ka'bah",
  qris: "infak & QRIS",
};

export async function PUT(request: Request) {
  const user = await authorize("settings");
  if (user instanceof NextResponse) return user;
  try {
    const data = schema.parse(await request.json());
    const before = await getSettings();
    const changed: string[] = [];
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue;
      await setSetting(key as keyof typeof data, value as never);
      if (JSON.stringify(value) !== JSON.stringify(before[key as keyof typeof before])) changed.push(SECTION_LABELS[key] ?? key);
    }
    if (data.location && data.location.kemenagCityId !== before.location.kemenagCityId) await clearPrayerCache();
    publish({ type: "update", topics: ["settings"] });
    if (changed.length) await audit(user, "settings", "pengaturan", `Mengubah ${changed.join(", ")}`);
    return NextResponse.json(await getSettings());
  } catch (e) {
    return handleError(e);
  }
}
