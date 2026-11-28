import type { CameraMessage, EndReason, IceCandidate, Signal, ViewerInfo } from "@/lib/camera-protocol";
import type { IceServer } from "@/lib/types";

export type ViewerState = ViewerInfo & { state: RTCPeerConnectionState };

type Peer = ViewerInfo & {
  pc: RTCPeerConnection;
  video: RTCRtpSender;
  /** Pemrosesan sinyal dari layar, berurutan setelah penawaran dibuat. */
  inbox: Promise<unknown>;
  /** Kiriman ke layar, berurutan agar penawaran selalu tiba sebelum kandidat. */
  outbox: Promise<unknown>;
  offered: boolean;
  /** Kandidat kamera yang muncul sebelum penawaran terkirim. */
  pending: Signal[];
  /** Kandidat layar yang tiba sebelum jawabannya. */
  early: IceCandidate[];
};

type Events = {
  onViewers: (viewers: ViewerState[]) => void;
  /** Kanal sinyal ke server tersambung (true) atau sedang menyambung ulang (false). */
  onLink: (connected: boolean) => void;
  onEnded: (reason: EndReason) => void;
};

function parse<T extends CameraMessage["type"]>(e: Event): Extract<CameraMessage, { type: T }> {
  return JSON.parse((e as MessageEvent<string>).data);
}

/**
 * Mengirim video perangkat ini ke tiap layar TV yang bergabung, satu koneksi WebRTC per layar.
 * Server hanya meneruskan sinyal (penawaran, jawaban, kandidat) lewat SSE dan POST.
 */
export class Broadcaster {
  private peers = new Map<string, Peer>();
  private es: EventSource | null = null;
  private closed = false;

  constructor(
    readonly session: string,
    private iceServers: IceServer[],
    private stream: MediaStream,
    private events: Events,
  ) {}

  open(): void {
    const es = new EventSource(`/api/admin/camera/stream?session=${encodeURIComponent(this.session)}`);
    this.es = es;
    es.onopen = () => this.events.onLink(true);
    es.onerror = () => {
      if (this.closed) return;
      this.events.onLink(false);
      // CLOSED = ditolak server (mis. sesi login habis); selain itu browser menyambung ulang sendiri.
      if (es.readyState === EventSource.CLOSED) this.finish("lost");
    };
    es.addEventListener("viewers", (e) => this.sync(parse<"viewers">(e).viewers));
    es.addEventListener("join", (e) => {
      const { peer, tv, joinedAt } = parse<"join">(e);
      this.connect({ peer, tv, joinedAt });
    });
    es.addEventListener("leave", (e) => this.drop(parse<"leave">(e).peer));
    es.addEventListener("signal", (e) => {
      const { from, signal } = parse<"signal">(e);
      this.receive(from, signal);
    });
    es.addEventListener("ended", (e) => this.finish(parse<"ended">(e).reason));
  }

  /** Ganti kamera atau kualitas tanpa memutus layar yang sedang menonton. */
  replaceVideo(stream: MediaStream): void {
    this.stream = stream;
    const track = stream.getVideoTracks()[0] ?? null;
    for (const p of this.peers.values()) p.video.replaceTrack(track).catch(() => {});
  }

  close(): void {
    this.closed = true;
    this.es?.close();
    for (const p of this.peers.values()) p.pc.close();
    this.peers.clear();
  }

  private finish(reason: EndReason): void {
    if (this.closed) return;
    this.close();
    this.events.onEnded(reason);
  }

  private emit(): void {
    if (this.closed) return;
    this.events.onViewers([...this.peers.values()].map(({ peer, tv, joinedAt, pc }) => ({ peer, tv, joinedAt, state: pc.connectionState })));
  }

  /** Samakan dengan daftar layar dari server setiap kanal sinyal tersambung (ulang). */
  private sync(viewers: ViewerInfo[]): void {
    const ids = new Set(viewers.map((v) => v.peer));
    for (const peer of [...this.peers.keys()]) if (!ids.has(peer)) this.drop(peer, false);
    for (const v of viewers) {
      const known = this.peers.get(v.peer);
      if (!known || known.joinedAt !== v.joinedAt) this.connect(v, false);
    }
    this.emit();
  }

  private connect(v: ViewerInfo, notify = true): void {
    this.drop(v.peer, false);
    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    const init: RTCRtpTransceiverInit = { direction: "sendonly", streams: [this.stream] };
    // Video selalu punya pengirim sendiri agar kamera bisa diganti tanpa negosiasi ulang.
    const video = pc.addTransceiver(this.stream.getVideoTracks()[0] ?? "video", init).sender;
    for (const track of this.stream.getAudioTracks()) pc.addTransceiver(track, init);
    const peer: Peer = {
      ...v,
      pc,
      video,
      inbox: Promise.resolve(),
      outbox: Promise.resolve(),
      offered: false,
      pending: [],
      early: [],
    };
    const current = () => !this.closed && this.peers.get(v.peer) === peer;
    pc.onicecandidate = (e) => {
      if (!e.candidate || !current()) return;
      const signal: Signal = { candidate: e.candidate.toJSON() as IceCandidate };
      if (peer.offered) this.send(peer, signal);
      else peer.pending.push(signal);
    };
    pc.onconnectionstatechange = () => {
      if (current()) this.emit();
    };
    this.peers.set(v.peer, peer);
    peer.inbox = (async () => {
      await pc.setLocalDescription(await pc.createOffer());
      if (!current() || !pc.localDescription) return;
      this.send(peer, { description: { type: "offer", sdp: pc.localDescription.sdp } });
      peer.offered = true;
      for (const signal of peer.pending.splice(0)) this.send(peer, signal);
    })().catch(() => {});
    if (notify) this.emit();
  }

  private receive(from: string, signal: Signal): void {
    const peer = this.peers.get(from);
    if (!peer) return;
    const { pc } = peer;
    peer.inbox = peer.inbox
      .then(async () => {
        if (signal.description?.type === "answer") {
          if (pc.signalingState !== "have-local-offer") return;
          await pc.setRemoteDescription(signal.description);
          for (const c of peer.early.splice(0)) await pc.addIceCandidate(c).catch(() => {});
        } else if (signal.candidate) {
          if (pc.remoteDescription) await pc.addIceCandidate(signal.candidate);
          else peer.early.push(signal.candidate);
        }
      })
      .catch(() => {});
  }

  private drop(id: string, notify = true): void {
    const peer = this.peers.get(id);
    if (!peer) return;
    this.peers.delete(id);
    peer.pc.close();
    if (notify) this.emit();
  }

  private send(peer: Peer, signal: Signal): void {
    const body = JSON.stringify({ session: this.session, to: peer.peer, ...signal });
    peer.outbox = peer.outbox.then(() =>
      fetch("/api/admin/camera/signal", { method: "POST", headers: { "Content-Type": "application/json" }, body }).catch(() => {}),
    );
  }
}
