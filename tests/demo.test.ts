import { describe, expect, it } from "vitest";
import { createDemoState } from "../src/lib/demo";
import { arrangeKajian } from "../src/lib/kajian";
import { contentAvailability, ramadhanFor } from "../src/lib/playlist";
import { prayerPhase } from "../src/lib/prayer/schedule";
import { witaDateStr } from "../src/lib/time";

describe("simulasi data contoh", () => {
  const now = Date.parse("2026-11-22T09:00:00Z");

  it("membuat kegiatan dan jadwal contoh untuk hari WITA yang diminta", () => {
    const state = createDemoState(now, "kajian", "normal");
    expect(state.demo?.phase).toBe("normal");
    expect(state.settings.override.type).toBe("kajian");
    expect(arrangeKajian(state.kajian, now)[0].relative).toBe("Hari ini");
    expect(state.kajian[0].presenter?.name).toContain("contoh");
    expect(state.prayer.today.date).toBe(witaDateStr(now));
    expect(state.prayer.tomorrow.date).toBe("2026-11-23");
    expect(state.prayer.today.source).toBe("offline");
    expect(state.settings.qris.image).toBe("/demo-qris.svg");
  });

  it.each(["adzan", "doa", "iqamah", "shalat"] as const)("memulai simulasi fase %s", (phase) => {
    const state = createDemoState(now, "kajian", phase);
    expect(prayerPhase(now, state.prayer.today, state.settings.prayer, state.settings.manualPrayer).kind).toBe(phase);
  });

  it("membatasi parameter dan menyiapkan pengumuman darurat contoh", () => {
    const state = createDemoState(now, "not-a-module", "emergency");
    expect(state.settings.override.type).toBe("kajian");
    expect(state.settings.emergency.active).toBe(true);
    expect(state.settings.emergency.text).toContain("SIMULASI");
    expect(createDemoState(now, null, "invalid").demo?.phase).toBe("normal");
  });

  it("menyimulasikan musim Ramadhan agar modul Ramadhan dan pengurus bisa dicoba kapan saja", () => {
    const state = createDemoState(now, "ramadhan", "normal");
    const view = ramadhanFor(state, now);
    expect(view?.fasting).toMatchObject({ when: "today", day: 12 });
    expect(view?.tonight?.night).toBe(13);
    expect(view?.ied?.kind).toBe("fitri");
    expect(contentAvailability(state, now)).toMatchObject({ ramadhan: true, pengurus: true, kajian: true });
  });
});
