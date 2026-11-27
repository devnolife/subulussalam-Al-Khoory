import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "../src/lib/csv";
import { exportFilename, financeTable, isDateStr, jumatTable } from "../src/lib/export";
import { financePeriods, financeReport, monthPeriod } from "../src/lib/finance-report";
import { financeReportText, iedText, jumatText, kajianWeekText, waLink } from "../src/lib/share";
import type { FinanceCategory, FinanceEntry, Jumat, Kajian } from "../src/lib/types";

const MOSQUE = "Masjid Contoh";

describe("CSV", () => {
  it("meng-escape koma, kutip, dan baris baru", () => {
    expect(csvCell("Infaq, Jum'at")).toBe('"Infaq, Jum\'at"');
    expect(csvCell('Kata "amal"')).toBe('"Kata ""amal"""');
    expect(csvCell("baris1\nbaris2")).toBe('"baris1\nbaris2"');
    expect(csvCell(" spasi ")).toBe('" spasi "');
  });

  it("menetralkan teks yang bisa dibaca sebagai rumus, tetapi tidak angka", () => {
    expect(csvCell("=HYPERLINK(\"x\")")).toBe("\"'=HYPERLINK(\"\"x\"\")\"");
    expect(csvCell("+62811")).toBe("'+62811");
    expect(csvCell("@user")).toBe("'@user");
    expect(csvCell("-")).toBe("-");
    expect(csvCell(-5000)).toBe("-5000");
  });

  it("mengubah boolean dan kosong", () => {
    expect([true, false, null, undefined].map(csvCell)).toEqual(["Ya", "Tidak", "", ""]);
  });

  it("memakai BOM UTF-8 dan baris CRLF", () => {
    expect(toCsv(["A", "B"], [[1, "x"]])).toBe("\uFEFFA,B\r\n1,x\r\n");
  });
});

const categories: FinanceCategory[] = [
  { id: 1, name: "Kotak amal", kind: "in", ziswaf: "infaq", active: true, sort: 0 },
  { id: 2, name: "Listrik", kind: "out", ziswaf: null, active: true, sort: 0 },
];
let entryId = 1;
const entry = (patch: Partial<FinanceEntry>): FinanceEntry => ({
  id: entryId++,
  date: "2026-11-01",
  kind: "in",
  amount: 0,
  description: "",
  categoryId: null,
  donor: "",
  showDonor: false,
  ...patch,
});
const entries = [
  entry({ date: "2026-10-05", amount: 1_000_000, categoryId: 1 }),
  entry({ date: "2026-11-10", kind: "out", amount: 300_000, categoryId: 2, description: "Token listrik" }),
  entry({ date: "2026-11-02", amount: 500_000, categoryId: 1, donor: "Pak Ahmad", showDonor: true }),
  entry({ date: "2026-11-03", amount: 200_000 }),
  entry({ date: "2026-12-01", amount: 50_000, categoryId: 1 }),
];

describe("laporan kas", () => {
  it("menghitung batas bulan termasuk tahun kabisat", () => {
    expect(monthPeriod("2026-11")).toEqual({ key: "2026-11", from: "2026-11-01", to: "2026-11-30", label: "November 2026" });
    expect(monthPeriod("2026-12").to).toBe("2026-12-31");
    expect(monthPeriod("2028-02").to).toBe("2028-02-29");
  });

  it("menawarkan bulan berjalan, bulan bertransaksi, lalu tahun", () => {
    expect(financePeriods(entries, "2027-01-15").map((p) => p.key)).toEqual([
      "2027-01",
      "2026-12",
      "2026-11",
      "2026-10",
      "2027",
      "2026",
    ]);
  });

  it("merekap per kategori dengan saldo awal dari transaksi sebelumnya", () => {
    const report = financeReport(entries, categories, monthPeriod("2026-11"));
    expect(report).toMatchObject({ opening: 1_000_000, totalIn: 700_000, totalOut: 300_000, closing: 1_400_000 });
    expect(report.incomes).toEqual([
      { name: "Kotak amal", amount: 500_000 },
      { name: "Lainnya", amount: 200_000 },
    ]);
    expect(report.expenses).toEqual([{ name: "Listrik", amount: 300_000 }]);
  });

  it("teks WhatsApp memuat total tanpa nama donatur", () => {
    const text = financeReportText(financeReport(entries, categories, monthPeriod("2026-11")), MOSQUE);
    expect(text).toContain("*Laporan Kas · November 2026*");
    expect(text).toContain("Saldo awal: Rp 1.000.000");
    expect(text).toContain("• Lainnya: Rp 200.000");
    expect(text).toContain("*Saldo akhir: Rp 1.400.000*");
    expect(text).not.toContain("Pak Ahmad");
  });

  it("CSV kas berurutan tanggal dengan saldo awal, saldo berjalan, dan total", () => {
    const { rows } = financeTable(entries, categories, { from: "2026-11-01", to: "2026-11-30" });
    expect(rows.map((r) => [r[0], r[1], r[9]])).toEqual([
      ["2026-11-01", "Saldo awal", 1_000_000],
      ["2026-11-02", "Pemasukan", 1_500_000],
      ["2026-11-03", "Pemasukan", 1_700_000],
      ["2026-11-10", "Pengeluaran", 1_400_000],
      ["", "Total", 1_400_000],
    ]);
    expect(rows[1].slice(2, 7)).toEqual(["Kotak amal", "Infaq", "", "Pak Ahmad", true]);
    expect(rows[3].slice(7, 9)).toEqual(["", 300_000]);
    expect(rows[4].slice(7, 9)).toEqual([700_000, 300_000]);
  });
});

describe("ekspor", () => {
  it("memvalidasi tanggal kalender", () => {
    expect(isDateStr("2028-02-29")).toBe(true);
    expect(isDateStr("2026-02-30")).toBe(false);
    expect(isDateStr("2026-2-1")).toBe(false);
  });

  it("menamai file sesuai data dan rentang", () => {
    expect(exportFilename("finance", { from: "2026-11-01", to: "2026-11-30" }, "2026-11-27")).toBe(
      "kas_2026-11-01_2026-11-30.csv",
    );
    expect(exportFilename("finance", { from: "2026-12-01" }, "2026-11-27")).toBe("kas_mulai-2026-12-01.csv");
    expect(exportFilename("jumat", { to: "2026-11-30" }, "2026-11-27")).toBe("petugas-jumat_sampai-2026-11-30.csv");
    expect(exportFilename("board_members", {}, "2026-11-27")).toBe("pengurus_2026-11-27.csv");
  });

  it("membatasi petugas Jum'at pada rentang tanggal", () => {
    const list = ["2026-11-06", "2026-11-13", "2026-12-04"].map((date, i) => jumat({ id: i + 1, date }));
    expect(jumatTable(list, { from: "2026-11-10", to: "2026-11-30" }).rows.map((r) => r[0])).toEqual(["2026-11-13"]);
  });
});

function jumat(patch: Partial<Jumat>): Jumat {
  return { id: 1, date: "2026-11-27", khatib: "", khatibSpeakerId: null, imam: "", muadzin: "", theme: "", ...patch };
}

let kajianId = 1;
const kajian = (patch: Partial<Kajian>): Kajian => ({
  id: kajianId++,
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
});

describe("teks WhatsApp", () => {
  // Ahad, 1 Maret 2026 pukul 17.00 WITA; jendela pekan ini sampai Sabtu 7 Maret.
  const NOW = Date.parse("2026-03-01T09:00:00Z");

  it("jadwal kajian pekan ini: hanya 7 hari ke depan, jadwal teks bebas terpisah", () => {
    const text = kajianWeekText(
      [
        kajian({ title: "Tafsir", recurrence: "weekly", dayOfWeek: 4, startTime: "19:30", speaker: "Ust. Ahmad", location: "Ruang utama" }),
        kajian({ title: "Fiqih Zakat", recurrence: "once", date: "2026-03-05" }),
        kajian({ title: "Terlalu jauh", recurrence: "once", date: "2026-03-10" }),
        kajian({ title: "Nonaktif", recurrence: "weekly", dayOfWeek: 2, active: false }),
        kajian({ title: "Tahsin", schedule: "Setiap Sabtu pekan kedua", time: "Ba'da Subuh" }),
      ],
      NOW,
      MOSQUE,
    );
    expect(text).toBe(
      [
        "*Jadwal Kajian Pekan Ini*\nMasjid Contoh\n1 Maret 2026 – 7 Maret 2026",
        "📖 *Tafsir*\n🗓 Kamis, 5 Maret 2026 · 19:30\n👤 Ust. Ahmad\n📍 Ruang utama",
        "📖 *Fiqih Zakat*\n🗓 Kamis, 5 Maret 2026",
        "*Jadwal lainnya*",
        "📖 *Tahsin*\n🗓 Setiap Sabtu pekan kedua · Ba'da Subuh",
        "Mari hadir dan ajak keluarga serta sahabat.",
      ].join("\n\n"),
    );
  });

  it("jadwal kajian kosong menghasilkan null", () => {
    expect(kajianWeekText([kajian({ recurrence: "once", date: "2026-03-20" })], NOW, MOSQUE)).toBeNull();
  });

  it("petugas Jum'at terdekat mulai hari ini dan baris kosong dilewati", () => {
    const list = [
      jumat({ date: "2026-11-20", khatib: "Lama" }),
      jumat({ date: "2026-12-04", khatib: "Berikutnya" }),
      jumat({ date: "2026-11-27", khatib: "Ust. Hasan", imam: "Ust. Ali", theme: "Syukur" }),
    ];
    expect(jumatText(list, "2026-11-27", MOSQUE)).toBe(
      "*Petugas Sholat Jum'at*\nMasjid Contoh\n🗓 Jum'at, 27 November 2026\n\n🎙 Khatib: Ust. Hasan\n👤 Imam: Ust. Ali\n📝 Tema khutbah: Syukur",
    );
    expect(jumatText(list, "2026-12-05", MOSQUE)).toBeNull();
  });

  it("info sholat Ied", () => {
    const text = iedText(
      { id: 1, kind: "fitri", date: "2027-03-09", time: "07:00", location: "Lapangan", khatib: "", imam: "", note: "" },
      MOSQUE,
    );
    expect(text).toBe("*Sholat Idul Fitri*\nMasjid Contoh\n\n🗓 Selasa, 9 Maret 2027\n🕖 Pukul 07:00 WITA\n📍 Lapangan");
  });

  it("tautan wa.me meng-encode teks", () => {
    expect(waLink("*Halo* & salam\nbaris")).toBe("https://wa.me/?text=*Halo*%20%26%20salam%0Abaris");
  });
});
