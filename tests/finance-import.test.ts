import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { toCsv } from "../src/lib/csv";
import { financeTable } from "../src/lib/export";
import {
  autoConfig,
  buildImportRows,
  categoryNeeds,
  classifyRows,
  detectDateOrder,
  guessColumns,
  guessZiswaf,
  matchCategory,
  parseAmount,
  parseDate,
  similarKey,
} from "../src/lib/finance-import";
import { columnLetter, decodeText, detectDelimiter, parseCsv, readSpreadsheet, SpreadsheetError } from "../src/lib/spreadsheet";
import type { FinanceCategory, FinanceEntry } from "../src/lib/types";

const csvFile = (name: string, text: string) => readSpreadsheet(name, new TextEncoder().encode(text))[0].rows;

describe("membaca CSV", () => {
  it("mengikuti RFC 4180: kutip, kutip ganda, dan baris baru di dalam kutip", () => {
    expect(parseCsv('a,"b, c","d ""e"""\r\n"baris\nbaru",2\n', ",")).toEqual([
      ["a", "b, c", 'd "e"'],
      ["baris\nbaru", "2"],
    ]);
  });

  it("mengenali pemisah titik koma dari Excel berbahasa Indonesia", () => {
    expect(detectDelimiter("Tanggal;Uraian;Nominal\n05/01/2026;Infaq, Jumat;1.250.000,-\n06/01/2026;Listrik;350.000\n")).toBe(";");
    expect(detectDelimiter("Tanggal,Nominal\n2026-01-05,1000\n")).toBe(",");
    expect(detectDelimiter("Tanggal\tNominal\n2026-01-05\t1000\n")).toBe("\t");
  });

  it("membaca BOM UTF-8/UTF-16 dan CSV lama Windows-1252", () => {
    expect(decodeText(new Uint8Array([0xef, 0xbb, 0xbf, 0x41]))).toBe("A");
    expect(decodeText(new Uint8Array([0xff, 0xfe, 0x41, 0x00, 0x42, 0x00]))).toBe("AB");
    expect(decodeText(new Uint8Array([0x43, 0x61, 0x66, 0xe9]))).toBe("Café");
  });
});

/** Workbook .xlsx minimal; sheet = isi <sheetData>. */
function xlsx(sheets: { name: string; data: string; hidden?: boolean }[], shared: string[]) {
  const files: Record<string, Uint8Array> = {
    "xl/workbook.xml": strToU8(
      `<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets
        .map((s, i) => `<sheet name="${s.name}" sheetId="${i + 1}"${s.hidden ? ' state="hidden"' : ""} r:id="rId${i + 1}"/>`)
        .join("")}</sheets></workbook>`,
    ),
    "xl/_rels/workbook.xml.rels": strToU8(
      `<Relationships>${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}</Relationships>`,
    ),
    "xl/sharedStrings.xml": strToU8(`<sst>${shared.join("")}</sst>`),
    "xl/styles.xml": strToU8(
      '<styleSheet><numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy;@"/></numFmts>' +
        '<cellXfs count="4"><xf numFmtId="0"/><xf numFmtId="14"/><xf numFmtId="164"/><xf numFmtId="3"/></cellXfs></styleSheet>',
    ),
  };
  sheets.forEach((s, i) => (files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(`<worksheet><sheetData>${s.data}</sheetData></worksheet>`)));
  return zipSync(files);
}

describe("membaca Excel", () => {
  it("membaca teks bersama, teks berformat, sel tanggal, angka, dan kolom yang dilompati; lembar tersembunyi diabaikan", () => {
    const file = xlsx(
      [
        {
          name: "Kas",
          data:
            '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1" t="inlineStr"><is><t>Nominal</t></is></c></row>' +
            '<row r="2"><c r="A2" s="1"><v>46027</v></c><c r="B2" t="s"><v>1</v></c><c r="C2" s="3"><v>1250000</v></c></row>' +
            '<row r="4"><c r="A4" s="2"><v>46028.5</v></c><c r="B4" t="s"><v>2</v></c><c r="C4"><v>-350000</v></c><c r="D4" t="b"><v>1</v></c></row>',
        },
        { name: "Rahasia", data: '<row r="1"><c r="A1"><v>1</v></c></row>', hidden: true },
      ],
      ["<si><t>Tanggal</t></si>", "<si><r><t>Infaq </t></r><r><t>Jumat &amp; Ahad</t></r></si>", "<si><t>Listrik</t><rPh><t>x</t></rPh></si>"],
    );
    const sheets = readSpreadsheet("kas.xlsx", file);
    expect(sheets.map((s) => s.name)).toEqual(["Kas"]);
    expect(sheets[0].rows).toEqual([
      ["Tanggal", null, "Nominal"],
      ["2026-01-05", "Infaq Jumat & Ahad", 1250000],
      [],
      ["2026-01-06", "Listrik", -350000, "TRUE"],
    ]);
  });

  it("membaca tabel HTML berakhiran .xls dan menolak .xls biner lama dengan saran yang jelas", () => {
    const html = "<html><body><table><tr><th>Tanggal</th><th>Nominal</th></tr><tr><td>05/01/2026</td><td>1.000&nbsp;</td></tr></table></body></html>";
    expect(readSpreadsheet("laporan.xls", strToU8(html))[0].rows).toEqual([
      ["Tanggal", "Nominal"],
      ["05/01/2026", "1.000"],
    ]);
    expect(() => readSpreadsheet("lama.xls", new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0, 0]))).toThrow(SpreadsheetError);
    expect(() => readSpreadsheet("lama.xls", new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0, 0]))).toThrow(/xlsx atau CSV/);
  });

  it("memberi huruf kolom seperti Excel", () => {
    expect([0, 25, 26, 51, 52, 701, 702].map(columnLetter)).toEqual(["A", "Z", "AA", "AZ", "BA", "ZZ", "AAA"]);
  });
});

describe("nominal dan tanggal", () => {
  it("mengenali penulisan rupiah yang umum", () => {
    const cases: [string | number, number | null][] = [
      [1500000, 1500000],
      ["Rp 1.500.000", 1500000],
      ["Rp. 10.000", 10000],
      ["IDR 2.000", 2000],
      ["1.500.000,00", 1500000],
      ["1,500,000.00", 1500000],
      ["1.234,56", 1235],
      ["150.000,-", 150000],
      ["(50.000)", -50000],
      ["-50.000", -50000],
      ["50.000-", -50000],
      ["1,000", 1000],
      ["-", 0],
      [" Rp - ", 0],
      ["Rp. -", 0],
      ["-,-", 0],
      ["Rp (350.000)", -350000],
      ["Rp(350.000,00)", -350000],
      ["", null],
      ["sepuluh ribu", null],
      ["1.2.3", null],
    ];
    for (const [input, expected] of cases) expect([input, parseAmount(input)]).toEqual([input, expected]);
  });

  it("mengenali tanggal angka, ISO, nama bulan, dan nomor seri Excel", () => {
    expect(parseDate("05/01/2026")).toBe("2026-01-05");
    expect(parseDate("05/01/2026", "mdy")).toBe("2026-05-01");
    expect(parseDate("5-1-26")).toBe("2026-01-05");
    expect(parseDate("2026-01-05T10:00:00")).toBe("2026-01-05");
    expect(parseDate("Senin, 5 Januari 2026")).toBe("2026-01-05");
    expect(parseDate("17 Agt 2026")).toBe("2026-08-17");
    expect(parseDate("05-Jan-26")).toBe("2026-01-05");
    expect(parseDate("Jan 5, 2026")).toBe("2026-01-05");
    expect(parseDate(46023)).toBe("2026-01-01");
    expect(parseDate("46023")).toBe("2026-01-01");
    expect(parseDate("31/02/2026")).toBeNull();
    expect(parseDate("01/01/1980")).toBeNull();
    expect(parseDate("besok")).toBeNull();
  });

  it("menebak urutan bulan/hari hanya bila datanya jelas", () => {
    expect(detectDateOrder(["12/25/2026", "01/02/2026"])).toBe("mdy");
    expect(detectDateOrder(["25/12/2026", "01/02/2026"])).toBe("dmy");
    expect(detectDateOrder(["01/02/2026"])).toBe("dmy");
  });
});

describe("pemetaan kolom", () => {
  it("menebak kolom dari judul tanpa menebak Debet/Kredit atau kolom 'No'", () => {
    const c = guessColumns(["No", "Tgl", "No. Bukti", "Uraian", "Debet", "Kredit", "Kategori", "Nama Donatur"]);
    expect(c.date).toBe(1);
    expect(c.ref).toBe(2);
    expect(c.description).toBe(3);
    expect(c.category).toBe(6);
    expect(c.donor).toBe(7);
    expect([c.amountIn, c.amountOut, c.amount]).toEqual([-1, -1, -1]);
  });

  it("memakai kolom 'Jenis' sebagai kategori bila isinya bukan masuk/keluar, dan menebak arah dari nama file", () => {
    const rows = [
      ["Tanggal", "Jenis", "Nominal"],
      ["05/01/2026", "Infaq Jumat", "100.000"],
      ["06/01/2026", "Zakat Fitrah", "50.000"],
    ];
    const plain = autoConfig(rows);
    expect(plain.columns.kind).toBe(-1);
    expect(plain.columns.category).toBe(1);
    expect(plain.kindMode).toBe("sign");
    expect(autoConfig(rows, "Pemasukan Januari.csv").kindMode).toBe("in");
    expect(autoConfig(rows, "Data Pengeluaran.xlsx").kindMode).toBe("out");
  });
});

describe("buku kas dari Excel berbahasa Indonesia", () => {
  const text = [
    "Laporan Kas Masjid Contoh;;;;",
    "Periode Januari 2026;;;;",
    ";;;;",
    "No;Tanggal;Uraian;Pemasukan;Pengeluaran",
    "1;05/01/2026;Kotak amal Jumat;1.250.000;",
    "2;06/01/2026;Bayar listrik;;Rp 350.000,-",
    "No;Tanggal;Uraian;Pemasukan;Pengeluaran",
    "3;tgl salah;Sumbangan;100.000;",
    "4;07/01/2026;Salah ketik;100.000;50.000",
    "5;08/01/2026;Belum diisi;;",
    "6;09/01/2026;Koreksi;0;",
    ";;Jumlah;1.250.000;350.000",
    ";;Saldo akhir;900.000;",
  ].join("\r\n");
  const rows = csvFile("buku-kas.csv", text);
  const config = autoConfig(rows);
  const result = buildImportRows(rows, config);

  it("menemukan baris judul di bawah judul laporan dan memakai dua kolom nominal", () => {
    expect(config.headerRow).toBe(3);
    expect(config.kindMode).toBe("split");
    expect([config.columns.date, config.columns.description, config.columns.amountIn, config.columns.amountOut]).toEqual([1, 2, 3, 4]);
  });

  it("menghasilkan transaksi dan melaporkan baris bermasalah dengan nomor barisnya", () => {
    expect(result.rows.map((r) => [r.line, r.date, r.kind, r.amount, r.description])).toEqual([
      [5, "2026-01-05", "in", 1250000, "Kotak amal Jumat"],
      [6, "2026-01-06", "out", 350000, "Bayar listrik"],
    ]);
    expect(result.issues).toEqual([
      { line: 8, level: "error", message: "Tanggal tidak dikenali: “tgl salah”" },
      { line: 9, level: "error", message: "Pemasukan dan pengeluaran terisi di baris yang sama" },
      { line: 10, level: "error", message: "Nominal kosong" },
      { line: 11, level: "skip", message: "Nominal 0" },
      { line: 12, level: "skip", message: "Baris saldo/total, bukan transaksi" },
      { line: 13, level: "skip", message: "Baris saldo/total, bukan transaksi" },
    ]);
  });

  it("memberi kunci yang sama setiap kali file yang sama dibaca", () => {
    const again = buildImportRows(csvFile("buku-kas.csv", text), autoConfig(csvFile("buku-kas.csv", text)));
    expect(again.rows.map((r) => r.ref)).toEqual(result.rows.map((r) => r.ref));
    expect(new Set(result.rows.map((r) => r.ref)).size).toBe(result.rows.length);
  });
});

describe("kunci impor dan status", () => {
  it("memakai nomor bukti bila ada dan membedakan baris kembar di file yang sama", () => {
    const rows = csvFile(
      "kas.csv",
      "Tanggal,No Bukti,Keterangan,Nominal\n2026-01-05,BKM-001,Infaq,100000\n2026-01-05,,Infaq,50000\n2026-01-05,,Infaq,50000\n",
    );
    const refs = buildImportRows(rows, autoConfig(rows)).rows.map((r) => r.ref);
    expect(refs[0]).toBe("id:2026-01-05:in:bkm-001");
    expect(refs[1]).toMatch(/^fp:2026-01-05:in:50000:/);
    expect(refs[2]).toBe(`${refs[1]}#2`);
  });

  it("nomor bukti yang mulai lagi dari 1 di bulan berikutnya tetap dianggap transaksi baru", () => {
    const jan = csvFile("jan.csv", "Tanggal,No Bukti,Nominal\n2026-01-05,1,100000\n");
    const feb = csvFile("feb.csv", "Tanggal,No Bukti,Nominal\n2026-02-03,1,250000\n");
    const janRefs = buildImportRows(jan, autoConfig(jan)).rows.map((r) => r.ref);
    const febRows = buildImportRows(feb, autoConfig(feb)).rows;
    expect(classifyRows(febRows, new Set(janRefs), new Set())).toEqual(["new"]);
  });

  it("membedakan nominal bertanda dan menolak nominal negatif di file khusus pemasukan", () => {
    const rows = csvFile("kas.csv", 'Tanggal,Keterangan,Nominal\n2026-01-05,Infaq,150.000\n2026-01-06,Listrik,-75.000\n2026-01-07,ATK,"(20.000)"\n');
    expect(buildImportRows(rows, autoConfig(rows)).rows.map((r) => [r.kind, r.amount])).toEqual([
      ["in", 150000],
      ["out", 75000],
      ["out", 20000],
    ]);
    const incomeOnly = buildImportRows(rows, autoConfig(rows, "pemasukan.csv"));
    expect(incomeOnly.rows).toHaveLength(1);
    expect(incomeOnly.issues.map((i) => i.line)).toEqual([3, 4]);
  });

  it("membagi status baru, sudah diimpor, dan mirip", () => {
    const rows = [
      { ref: "a", date: "2026-01-05", kind: "in" as const, amount: 1000 },
      { ref: "b", date: "2026-01-05", kind: "in" as const, amount: 2000 },
      { ref: "c", date: "2026-01-06", kind: "out" as const, amount: 2000 },
    ];
    expect(classifyRows(rows, new Set(["a"]), new Set([similarKey(rows[0]), similarKey(rows[1])]))).toEqual(["duplicate", "similar", "new"]);
  });
});

describe("kategori", () => {
  const categories: FinanceCategory[] = [
    { id: 1, name: "Infaq Jumat", kind: "in", ziswaf: "infaq", active: false, sort: 0 },
    { id: 2, name: "infaq  jumat", kind: "in", ziswaf: "infaq", active: true, sort: 1 },
    { id: 3, name: "Infaq Jumat", kind: "out", ziswaf: null, active: true, sort: 2 },
  ];

  it("mencocokkan nama tanpa membedakan huruf besar dan jenisnya, mengutamakan yang aktif", () => {
    expect(matchCategory({ kind: "in", name: "INFAQ JUMAT" }, categories)?.id).toBe(2);
    expect(matchCategory({ kind: "out", name: "Infaq Jumat" }, categories)?.id).toBe(3);
    expect(matchCategory({ kind: "in", name: "Zakat" }, categories)).toBeNull();
  });

  it("mengelompokkan kebutuhan kategori per jenis dan menebak ZISWAF kategori baru", () => {
    const row = (kind: "in" | "out", category: string) => ({ line: 1, ref: "", date: "2026-01-01", kind, amount: 1, description: "", category, donor: "", showDonor: false });
    const needs = categoryNeeds([row("in", "Zakat Fitrah"), row("in", "zakat fitrah"), row("out", "Zakat Fitrah"), row("in", "")]);
    expect(needs.map((n) => [n.kind, n.name, n.count])).toEqual([
      ["in", "Zakat Fitrah", 2],
      ["out", "Zakat Fitrah", 1],
    ]);
    expect(["Zakat Fitrah", "Infak Pembangunan", "Shodaqoh", "Wakaf Tanah", "Listrik"].map(guessZiswaf)).toEqual([
      "zakat",
      "infaq",
      "sedekah",
      "wakaf",
      null,
    ]);
  });
});

describe("impor ulang CSV ekspor Kas", () => {
  const categories: FinanceCategory[] = [
    { id: 1, name: "Infaq Jumat", kind: "in", ziswaf: "infaq", active: true, sort: 0 },
    { id: 2, name: "Operasional", kind: "out", ziswaf: null, active: true, sort: 1 },
  ];
  const entry = (e: Partial<FinanceEntry> & Pick<FinanceEntry, "id" | "date" | "kind" | "amount">): FinanceEntry => ({
    description: "",
    categoryId: null,
    donor: "",
    showDonor: false,
    ...e,
  });
  const entries = [
    entry({ id: 1, date: "2026-01-20", kind: "in", amount: 200000, description: "Bulan lalu" }),
    entry({ id: 2, date: "2026-02-01", kind: "in", amount: 500000, description: "Saldo awal" }),
    entry({ id: 3, date: "2026-02-05", kind: "in", amount: 1250000, description: "Kotak amal, Jum'at", categoryId: 1, donor: "Bapak Ahmad", showDonor: true }),
    entry({ id: 4, date: "2026-02-06", kind: "out", amount: 350000, description: "Listrik", categoryId: 2 }),
  ];
  const { headers, rows: table } = financeTable(entries, categories, { from: "2026-02-01", to: "2026-02-28" });
  const rows = csvFile("kas-2026-02.csv", toCsv(headers, table));
  const result = buildImportRows(rows, autoConfig(rows, "kas-2026-02.csv"));

  it("mengembalikan transaksi yang sama dan melewati baris saldo awal serta total", () => {
    expect(result.rows.map(({ date, kind, amount, description, category, donor, showDonor }) => ({ date, kind, amount, description, category, donor, showDonor }))).toEqual([
      { date: "2026-02-01", kind: "in", amount: 500000, description: "Saldo awal", category: "", donor: "", showDonor: false },
      { date: "2026-02-05", kind: "in", amount: 1250000, description: "Kotak amal, Jum'at", category: "Infaq Jumat", donor: "Bapak Ahmad", showDonor: true },
      { date: "2026-02-06", kind: "out", amount: 350000, description: "Listrik", category: "Operasional", donor: "", showDonor: false },
    ]);
    expect(result.issues.map((i) => [i.line, i.level])).toEqual([
      [2, "skip"],
      [6, "skip"],
    ]);
  });
});
