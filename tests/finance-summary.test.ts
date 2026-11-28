import { describe, expect, it } from "vitest";
import {
  financeWindowStart,
  HIDDEN_DONOR,
  monthlySeries,
  monthlySeriesStart,
  summarizeFinance,
  type FinanceRow,
} from "../src/lib/finance-summary";

let nextId = 1;
const row = (r: Partial<FinanceRow> & Pick<FinanceRow, "date" | "kind" | "amount">): FinanceRow => ({
  id: nextId++,
  donor: "",
  showDonor: false,
  category: null,
  ziswaf: null,
  ...r,
});

const TODAY = "2026-03-15";

describe("ringkasan kas", () => {
  it("menjumlah pemasukan dan pengeluaran bulan ini saja", () => {
    const s = summarizeFinance(
      [
        row({ date: "2026-03-01", kind: "in", amount: 100 }),
        row({ date: "2026-03-10", kind: "out", amount: 40 }),
        row({ date: "2026-02-28", kind: "in", amount: 999 }),
      ],
      TODAY,
    );
    expect(s.monthIn).toBe(100);
    expect(s.monthOut).toBe(40);
    expect(s.year).toBe(2026);
  });

  it("merinci kategori bulan ini, terbesar dulu, dan memisahkan jenis", () => {
    const s = summarizeFinance(
      [
        row({ date: "2026-03-02", kind: "in", amount: 300, category: "Kotak amal" }),
        row({ date: "2026-03-09", kind: "in", amount: 200, category: "Kotak amal" }),
        row({ date: "2026-03-05", kind: "out", amount: 700, category: "Listrik" }),
        row({ date: "2026-03-06", kind: "in", amount: 50 }),
        row({ date: "2026-02-20", kind: "out", amount: 5000, category: "Listrik" }),
      ],
      TODAY,
    );
    expect(s.categories).toEqual([
      { name: "Listrik", kind: "out", amount: 700 },
      { name: "Kotak amal", kind: "in", amount: 500 },
      { name: "Tanpa kategori", kind: "in", amount: 50 },
    ]);
  });

  it("tidak membuat rincian bila semua transaksi tanpa kategori", () => {
    const s = summarizeFinance([row({ date: "2026-03-02", kind: "in", amount: 300 })], TODAY);
    expect(s.categories).toEqual([]);
  });

  it("merekap ZISWAF per jenis: pemasukan = penerimaan, pengeluaran = penyaluran", () => {
    const s = summarizeFinance(
      [
        row({ date: "2026-03-03", kind: "in", amount: 1000, ziswaf: "zakat", category: "Zakat mal" }),
        row({ date: "2026-03-04", kind: "out", amount: 400, ziswaf: "zakat", category: "Penyaluran zakat" }),
        row({ date: "2026-01-10", kind: "in", amount: 500, ziswaf: "zakat", category: "Zakat mal" }),
        row({ date: "2025-12-31", kind: "in", amount: 9999, ziswaf: "zakat", category: "Zakat mal" }),
        row({ date: "2026-02-01", kind: "in", amount: 70, ziswaf: "wakaf", category: "Wakaf" }),
      ],
      TODAY,
    );
    const by = Object.fromEntries(s.ziswaf.map((z) => [z.kind, z]));
    expect(by.zakat).toEqual({ kind: "zakat", monthIn: 1000, monthOut: 400, yearIn: 1500, yearOut: 400 });
    expect(by.wakaf).toEqual({ kind: "wakaf", monthIn: 0, monthOut: 0, yearIn: 70, yearOut: 0 });
    expect(by.infaq.yearIn).toBe(0);
    expect(s.ziswaf.map((z) => z.kind)).toEqual(["zakat", "infaq", "sedekah", "wakaf"]);
  });

  it("menyembunyikan nama donatur yang tidak bersedia tampil", () => {
    const s = summarizeFinance(
      [
        row({ date: "2026-03-10", kind: "in", amount: 100, donor: "Bapak Ahmad", showDonor: true }),
        row({ date: "2026-03-12", kind: "in", amount: 200, donor: "Ibu Rahasia", showDonor: false }),
      ],
      TODAY,
    );
    expect(s.donors.map((d) => d.name)).toEqual([HIDDEN_DONOR, "Bapak Ahmad"]);
    expect(JSON.stringify(s)).not.toContain("Rahasia");
  });

  it("hanya memuat donatur pemasukan bernama dalam 60 hari terakhir, terbaru dulu, maksimal 8", () => {
    const rows = [
      row({ date: "2026-03-14", kind: "out", amount: 10, donor: "Bukan donatur", showDonor: true }),
      row({ date: "2026-03-14", kind: "in", amount: 10, donor: "   ", showDonor: true }),
      row({ date: "2026-01-10", kind: "in", amount: 10, donor: "Terlalu lama", showDonor: true }),
      row({ date: "2026-03-20", kind: "in", amount: 10, donor: "Tanggal depan", showDonor: true }),
      ...Array.from({ length: 9 }, (_, i) =>
        row({ date: `2026-03-${String(i + 1).padStart(2, "0")}`, kind: "in", amount: 10, donor: `Donatur ${i + 1}`, showDonor: true }),
      ),
    ];
    const names = summarizeFinance(rows, TODAY).donors.map((d) => d.name);
    expect(names).toHaveLength(8);
    expect(names[0]).toBe("Donatur 9");
    expect(names).not.toContain("Donatur 1");
    expect(names.join()).not.toMatch(/Bukan donatur|Terlalu lama|Tanggal depan/);
  });

  it("menghitung donatur berbeda bulan ini tanpa peduli huruf besar", () => {
    const s = summarizeFinance(
      [
        row({ date: "2026-03-01", kind: "in", amount: 10, donor: "Ahmad" }),
        row({ date: "2026-03-08", kind: "in", amount: 10, donor: " ahmad " }),
        row({ date: "2026-03-09", kind: "in", amount: 10, donor: "Fatimah" }),
        row({ date: "2026-02-27", kind: "in", amount: 10, donor: "Bulan lalu" }),
      ],
      TODAY,
    );
    expect(s.monthDonors).toBe(2);
  });

  it("memuat data sejak awal tahun atau 60 hari lalu, mana yang lebih dulu", () => {
    expect(financeWindowStart("2026-08-20")).toBe("2026-01-01");
    expect(financeWindowStart("2026-01-15")).toBe("2025-11-16");
  });
});

describe("grafik kas bulanan", () => {
  it("mengisi bulan kosong dengan 0 dan melintasi pergantian tahun", () => {
    const series = monthlySeries(
      [
        { month: "2025-10", kind: "in", total: 500 },
        { month: "2025-10", kind: "out", total: 200 },
        { month: "2026-02", kind: "in", total: 75 },
        { month: "2025-08", kind: "in", total: 9999 },
      ],
      "2026-02-14",
    );
    expect(series.map((m) => m.month)).toEqual(["2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02"]);
    expect(series[1]).toEqual({ month: "2025-10", short: "Okt", label: "Oktober 2025", in: 500, out: 200 });
    expect(series[0]).toMatchObject({ in: 0, out: 0 });
    expect(series[5]).toMatchObject({ short: "Feb", in: 75, out: 0 });
  });

  it("memuat transaksi sejak awal bulan terlama", () => {
    expect(monthlySeriesStart("2026-02-14")).toBe("2025-09-01");
    expect(monthlySeriesStart("2026-12-31", 3)).toBe("2026-10-01");
  });
});
