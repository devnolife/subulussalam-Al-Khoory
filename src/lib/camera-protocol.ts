import type { DisplayId } from "./types";

/** Pesan sinyal WebRTC antara halaman kamera dan layar TV (diteruskan apa adanya oleh server). */
export type SessionDescription = { type: "offer" | "answer"; sdp: string };
export type IceCandidate = {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
};
export type Signal = { description?: SessionDescription; candidate?: IceCandidate };

/** stopped = dihentikan pengurus, takeover = digantikan perangkat lain, lost = perangkat kamera terputus. */
export type EndReason = "stopped" | "takeover" | "lost";

/** `joinedAt` berubah setiap layar menyambung ulang, sehingga kamera tahu koneksi lamanya sudah tidak dipakai. */
export type ViewerInfo = { peer: string; tv: DisplayId; joinedAt: number };

/** Event SSE untuk halaman kamera. */
export type CameraMessage =
  | { type: "viewers"; viewers: ViewerInfo[] }
  | ({ type: "join" } & ViewerInfo)
  | { type: "leave"; peer: string }
  | { type: "signal"; from: string; signal: Signal }
  | { type: "ended"; reason: EndReason };

/** Event SSE untuk layar TV yang menonton; `revoked` = kunci layar baru saja diganti. */
export type ViewerMessage =
  | { type: "ready"; token: string }
  | { type: "signal"; signal: Signal }
  | { type: "ended"; reason: EndReason | "revoked" }
  | { type: "full" };

export type CameraStatus =
  | { live: false }
  | {
      live: true;
      id: string;
      startedAt: number;
      by: string;
      audio: boolean;
      /** Halaman kamera sedang tersambung ke server. */
      connected: boolean;
      viewers: ViewerInfo[];
    };

/** Id acak penonton yang dibuat layar TV. */
export const PEER_ID = /^[a-z0-9]{8,40}$/i;
