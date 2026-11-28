/** WITA (Asia/Makassar) selalu UTC+8 tanpa DST, jadi cukup offset tetap. */
export const WITA_OFFSET_MS = 8 * 60 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, "0");

/** Komponen kalender/jam WITA dari sebuah instant. */
export function witaParts(ms: number) {
  const d = new Date(ms + WITA_OFFSET_MS);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    second: d.getUTCSeconds(),
    weekday: d.getUTCDay(),
  };
}

export function witaDateStr(ms: number): string {
  const p = witaParts(ms);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** Instant (ms) dari tanggal "YYYY-MM-DD" + jam "HH:MM" WITA. */
export function witaToMs(dateStr: string, hhmm: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  return Date.UTC(y, m - 1, d, h, mi) - WITA_OFFSET_MS;
}

export function shiftHHMM(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

export function formatClock(ms: number, withSeconds = true): string {
  const p = witaParts(ms);
  return withSeconds ? `${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}` : `${pad(p.hour)}:${pad(p.minute)}`;
}

export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

const DAYS = ["Ahad", "Senin", "Selasa", "Rabu", "Kamis", "Jum'at", "Sabtu"];
const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export function formatGregorian(ms: number): string {
  const p = witaParts(ms);
  return `${DAYS[p.weekday]}, ${p.day} ${MONTHS[p.month - 1]} ${p.year}`;
}

export function formatDateStr(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function monthLabel(dateStr: string): string {
  const [y, m] = dateStr.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

/** Singkatan bulan Indonesia ("Jan", "Agu", "Des") dari "YYYY-MM" atau "YYYY-MM-DD". */
export function shortMonthLabel(dateStr: string): string {
  return MONTHS[Number(dateStr.slice(5, 7)) - 1].slice(0, 3);
}

export const rupiah = (n: number) => "Rp " + Math.round(n).toLocaleString("id-ID");

/** Rupiah ringkas untuk label grafik: "Rp 850 rb", "Rp 1,3 jt", "Rp 2 M". */
export function rupiahShort(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  const fmt = (v: number) => v.toLocaleString("id-ID", { maximumFractionDigits: 1 });
  if (abs >= 1e9) return `${sign}Rp ${fmt(abs / 1e9)} M`;
  if (abs >= 1e6) return `${sign}Rp ${fmt(abs / 1e6)} jt`;
  if (abs >= 1e3) return `${sign}Rp ${fmt(abs / 1e3)} rb`;
  return `${sign}Rp ${Math.round(abs)}`;
}
