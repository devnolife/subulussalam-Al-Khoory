import { createHmac } from "crypto";
import type { IceServer } from "./types";

const DEFAULT_STUN = "stun:stun.l.google.com:19302";
const TURN_TTL_SEC = 24 * 3600;

const list = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

/**
 * Server STUN/TURN untuk siaran kamera (WebRTC). STUN_URLS kosong = tanpa STUN.
 * TURN memakai TURN_SECRET (coturn `use-auth-secret`, kredensial sementara) atau TURN_USERNAME + TURN_CREDENTIAL.
 */
export function iceServers(now = Date.now()): IceServer[] {
  const servers: IceServer[] = [];
  const stun = list(process.env.STUN_URLS ?? DEFAULT_STUN);
  if (stun.length) servers.push({ urls: stun });
  const turn = list(process.env.TURN_URLS);
  if (!turn.length) return servers;
  const secret = process.env.TURN_SECRET;
  if (secret) {
    const username = `${Math.floor(now / 1000) + TURN_TTL_SEC}:masjid`;
    servers.push({ urls: turn, username, credential: createHmac("sha1", secret).update(username).digest("base64") });
  } else if (process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) {
    servers.push({ urls: turn, username: process.env.TURN_USERNAME, credential: process.env.TURN_CREDENTIAL });
  }
  return servers;
}
