import { describe, expect, it } from "vitest";
import { createDemoState } from "../src/lib/demo";
import { prayerPhase } from "../src/lib/prayer/schedule";
import { witaDateStr } from "../src/lib/time";

describe("simulasi data contoh", () => {
  const now = Date.parse("2026-11-22T09:00:00Z");

  it("membuat kegiatan dan jadwal contoh untuk hari WITA yang diminta", () => {
    const state = createDemoState(now, "kajian", "normal");
    expect(state.demo?.phase).toBe("normal");
    expect(state.settings.override.type).toBe("kajian");
    expect(state.kajian[0].schedule).toBe("Hari ini");
    expect(state.kajian[0].speaker).toContain("contoh");
    expect(state.prayer.today.date).toBe(witaDateStr(now));
    expect(state.prayer.tomorrow.date).toBe("2026-11-23");
    expect(state.prayer.today.source).toBe("offline");
    expect(state.settings.qris.image).toBe("/demo-qris.svg");
  });

  it.each(["adzan", "iqamah", "shalat"] as const)("memulai simulasi fase %s", (phase) => {
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
});
