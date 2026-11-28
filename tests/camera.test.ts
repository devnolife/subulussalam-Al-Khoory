import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { keyMatches } from "../src/lib/access-key";
import {
  attachCamera,
  CAMERA_GRACE_MS,
  cameraStatus,
  dropViewers,
  joinViewer,
  leaveViewer,
  liveCamera,
  MAX_VIEWERS,
  signalFromCamera,
  signalFromViewer,
  startCamera,
  stopCamera,
} from "../src/lib/camera";
import type { CameraMessage, ViewerMessage } from "../src/lib/camera-protocol";
import { cameraSignalSchema, viewerSignalSchema } from "../src/lib/camera-signal";
import { createDemoState } from "../src/lib/demo";
import { contentAvailability } from "../src/lib/playlist";
import { listen } from "../src/lib/realtime";
import { parseDisplayId } from "../src/lib/types";

const offer = { description: { type: "offer" as const, sdp: "v=0" } };
const answer = { description: { type: "answer" as const, sdp: "v=0" } };
const candidate = { candidate: "candidate:1 1 udp 1 192.0.2.1 5000 typ host", sdpMid: "0", sdpMLineIndex: 0 };

let unlisten: (() => void)[] = [];
function inbox<T>(channel: string): T[] {
  const got: T[] = [];
  unlisten.push(listen<T>(channel, (m) => got.push(m)));
  return got;
}

describe("siaran kamera", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    stopCamera();
    unlisten.forEach((off) => off());
    unlisten = [];
    vi.useRealTimers();
  });

  it("siaran baru menggantikan siaran lama", () => {
    const first = startCamera({ by: "a", audio: false });
    const old = inbox<CameraMessage>(`camera:${first.id}`);
    const second = startCamera({ by: "b", audio: true });
    expect(old).toEqual([{ type: "ended", reason: "takeover" }]);
    expect(liveCamera()).toEqual({ id: second.id, audio: true });
    expect(attachCamera(first.id)).toEqual({ ended: "takeover" });
  });

  it("hanya menghentikan siaran yang dimaksud", () => {
    const { id } = startCamera({ by: "a", audio: false });
    expect(stopCamera("siaran-lain")).toBe(false);
    expect(stopCamera(id)).toBe(true);
    expect(cameraStatus()).toEqual({ live: false });
    expect(joinViewer(id, "peer0001", 1, "c1")).toEqual({ ended: "stopped" });
  });

  it("berakhir bila halaman kamera tidak tersambung selama masa tenggang", () => {
    const onLost = vi.fn();
    const { id } = startCamera({ by: "a", audio: false, onLost });
    const link = attachCamera(id);
    if (!("detach" in link)) throw new Error("siaran seharusnya masih berjalan");
    vi.advanceTimersByTime(CAMERA_GRACE_MS * 2);
    expect(cameraStatus()).toMatchObject({ live: true, connected: true });

    link.detach();
    link.detach();
    vi.advanceTimersByTime(CAMERA_GRACE_MS - 1);
    expect(cameraStatus()).toMatchObject({ live: true, connected: false });
    vi.advanceTimersByTime(1);
    expect(cameraStatus()).toEqual({ live: false });
    expect(onLost).toHaveBeenCalledOnce();
    expect(attachCamera(id)).toEqual({ ended: "lost" });
  });

  it("meneruskan jawaban layar hanya dengan token miliknya", () => {
    const { id } = startCamera({ by: "a", audio: false });
    const camera = inbox<CameraMessage>(`camera:${id}`);
    const tv = inbox<ViewerMessage>("viewer:c1");
    const joined = joinViewer(id, "peer0001", 2, "c1");
    if (!("token" in joined)) throw new Error("layar seharusnya bisa bergabung");
    expect(camera).toContainEqual(expect.objectContaining({ type: "join", peer: "peer0001", tv: 2 }));

    expect(signalFromCamera(id, "peer0001", offer)).toBe(true);
    expect(signalFromCamera(id, "peer9999", offer)).toBe(false);
    expect(tv).toEqual([{ type: "signal", signal: offer }]);

    expect(signalFromViewer(id, "peer0001", "token-palsu", answer)).toBe(false);
    expect(signalFromViewer(id, "peer0001", joined.token, answer)).toBe(true);
    expect(camera).toContainEqual({ type: "signal", from: "peer0001", signal: answer });
  });

  it("koneksi lama yang baru tertutup tidak mengeluarkan layar yang sudah menyambung ulang", () => {
    const { id } = startCamera({ by: "a", audio: false });
    joinViewer(id, "peer0001", 1, "lama");
    joinViewer(id, "peer0001", 1, "baru");
    leaveViewer(id, "peer0001", "lama");
    expect(cameraStatus()).toMatchObject({ viewers: [expect.objectContaining({ peer: "peer0001" })] });
    leaveViewer(id, "peer0001", "baru");
    expect(cameraStatus()).toMatchObject({ viewers: [] });
  });

  it(`menerima paling banyak ${MAX_VIEWERS} layar dan memutus layar yang kuncinya diganti`, () => {
    const { id } = startCamera({ by: "a", audio: false });
    for (let i = 0; i < MAX_VIEWERS; i++) joinViewer(id, `peer000${i}`, i % 2 ? 2 : 3, `c${i}`);
    expect(joinViewer(id, "peerbaru1", 1, "x")).toEqual({ full: true });
    expect(joinViewer(id, "peer0000", 3, "c0-ulang")).toHaveProperty("token");

    const camera = inbox<CameraMessage>(`camera:${id}`);
    const revoked = inbox<ViewerMessage>("viewer:c1");
    dropViewers(2);
    expect(revoked).toEqual([{ type: "ended", reason: "revoked" }]);
    expect(camera.filter((m) => m.type === "leave")).toHaveLength(MAX_VIEWERS / 2);
    const status = cameraStatus();
    expect(status.live && status.viewers.map((v) => v.tv)).toEqual([3, 3, 3]);
  });
});

describe("validasi sinyal kamera", () => {
  it("kamera hanya mengirim offer, layar hanya mengirim answer", () => {
    const toTv = { session: "s1", to: "peer0001" };
    const fromTv = { session: "s1", peer: "peer0001", token: "t" };
    expect(cameraSignalSchema.safeParse({ ...toTv, ...offer }).success).toBe(true);
    expect(cameraSignalSchema.safeParse({ ...toTv, ...answer }).success).toBe(false);
    expect(viewerSignalSchema.safeParse({ ...fromTv, ...answer }).success).toBe(true);
    expect(viewerSignalSchema.safeParse({ ...fromTv, ...offer }).success).toBe(false);
    expect(viewerSignalSchema.safeParse({ ...fromTv, token: "", candidate }).success).toBe(false);
  });

  it("menolak pesan kosong, ganda, atau id layar yang tidak valid", () => {
    const toTv = { session: "s1", to: "peer0001" };
    expect(cameraSignalSchema.safeParse({ ...toTv, candidate }).success).toBe(true);
    expect(cameraSignalSchema.safeParse(toTv).success).toBe(false);
    expect(cameraSignalSchema.safeParse({ ...toTv, ...offer, candidate }).success).toBe(false);
    expect(cameraSignalSchema.safeParse({ ...toTv, to: "../peer", candidate }).success).toBe(false);
  });
});

describe("layar TV", () => {
  it("hanya mengenal TV 1 sampai 3", () => {
    expect(parseDisplayId("2")).toBe(2);
    expect(parseDisplayId(3)).toBe(3);
    for (const bad of ["4", "0", "1.5", "", "tv1", null, undefined, 4]) expect(parseDisplayId(bad)).toBeNull();
  });

  it("mencocokkan kunci layar tanpa memedulikan huruf besar dan spasi", () => {
    expect(keyMatches("ab23cd45", " AB23CD45 ")).toBe(true);
    expect(keyMatches("ab23cd45", "ab23cd4")).toBe(false);
    expect(keyMatches("ab23cd45", "")).toBe(false);
    expect(keyMatches("ab23cd45", null)).toBe(false);
  });

  it("slot Live Ka'bah tersedia selama siaran kamera kecuali kamera dimatikan untuk layar itu", () => {
    const state = createDemoState(Date.parse("2026-11-22T09:00:00Z"), "kajian", "normal");
    state.settings.kabah = { ...state.settings.kabah, youtubeUrl: "", backupUrl: "" };
    expect(contentAvailability(state).kabah).toBe(false);
    state.camera = { session: "s1", audio: false, iceServers: [] };
    expect(contentAvailability(state).kabah).toBe(true);
    state.display = { ...state.display, cameraMode: "off" };
    expect(contentAvailability(state).kabah).toBe(false);
  });
});
