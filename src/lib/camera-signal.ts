import { z } from "zod";
import { PEER_ID } from "./camera-protocol";

/** Validasi sinyal WebRTC yang diteruskan server (hanya untuk route API). */

export const MAX_SIGNAL_BYTES = 64_000;

const candidate = z.object({
  candidate: z.string().max(1000),
  sdpMid: z.string().max(64).nullish(),
  sdpMLineIndex: z.number().int().min(0).max(64).nullish(),
  usernameFragment: z.string().max(256).nullish(),
});

const description = <K extends "offer" | "answer">(kind: K) =>
  z.object({ type: z.literal(kind), sdp: z.string().min(1).max(60_000) });

const exactlyOne = (s: { description?: unknown; candidate?: unknown }) => !!s.description !== !!s.candidate;
const ONE_MESSAGE = "Kirim tepat satu deskripsi atau kandidat";

export const peerId = z.string().regex(PEER_ID, "Id layar tidak valid");
export const sessionId = z.string().min(1).max(64);

/** Kamera → layar: hanya penawaran (offer) dan kandidat. */
export const cameraSignalSchema = z
  .object({ session: sessionId, to: peerId, description: description("offer").optional(), candidate: candidate.optional() })
  .refine(exactlyOne, ONE_MESSAGE);

/** Layar → kamera: hanya jawaban (answer) dan kandidat, dengan token dari event `ready`. */
export const viewerSignalSchema = z
  .object({
    session: sessionId,
    peer: peerId,
    token: z.string().min(1).max(64),
    description: description("answer").optional(),
    candidate: candidate.optional(),
  })
  .refine(exactlyOne, ONE_MESSAGE);
