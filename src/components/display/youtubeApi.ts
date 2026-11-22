export type YouTubePlayer = {
  destroy(): void;
  mute(): void;
  unMute(): void;
  playVideo(): void;
  isMuted?: () => boolean;
  getPlayerState?: () => number;
};

type PlayerEvent = { data: number };

export type YouTubeApi = {
  Player: new (
    iframe: HTMLIFrameElement,
    options: {
      events: {
        onStateChange?: (event: PlayerEvent) => void;
        onError?: (event: PlayerEvent) => void;
        onAutoplayBlocked?: () => void;
      };
    },
  ) => YouTubePlayer;
  PlayerState: { PLAYING: number; PAUSED: number };
};

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let loading: Promise<YouTubeApi> | null = null;

/** Memuat YouTube IFrame API satu kali per halaman; gagal muat boleh dicoba lagi. */
export function loadYouTubeApi(): Promise<YouTubeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  loading ??= new Promise<YouTubeApi>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT) resolve(window.YT);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      loading = null;
      script.remove();
      reject(new Error("YouTube IFrame API gagal dimuat"));
    };
    document.head.appendChild(script);
  });
  return loading;
}
