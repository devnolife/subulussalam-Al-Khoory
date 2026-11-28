"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BookOpenText,
  CalendarDays,
  Clock3,
  Images,
  Landmark,
  MapPin,
  Megaphone,
  Mic2,
  Quote,
  Radio,
  TrendingDown,
  TrendingUp,
  UserRound,
  Volume2,
  VolumeX,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { DisplayState } from "@/lib/types";
import { formatDateStr, monthLabel, rupiah } from "@/lib/time";
import { youtubeSources } from "@/lib/youtube";
import { arrangeKajian, kajianScheduleLabel, kajianTimeLabel } from "@/lib/kajian";
import { Avatar, IconTile, PanelHeader } from "./ui";
import { loadYouTubeApi, type YouTubeApi, type YouTubePlayer } from "./youtubeApi";

type P = { state: DisplayState };

const STREAM_START_TIMEOUT_MS = 30_000;
const STREAM_RETRY_MS = 5 * 60_000;
const UNMUTE_CHECK_MS = 1_500;

/**
 * Browser menahan suara sampai ada klik, sentuhan, atau tombol di halaman ini.
 * Disimpan per halaman agar percobaan yang pasti gagal tidak membuat video tersendat tiap rotasi.
 */
let soundBlocked = false;

export function StreamNotice({ title, icon = Radio, children }: { title: string; icon?: LucideIcon; children: ReactNode }) {
  return (
    <div className="flex size-full flex-col items-center justify-center px-24 text-center">
      <IconTile icon={icon} size="md" />
      <p className="mt-5 text-[46px] font-bold tracking-tight">
        {title}
      </p>
      <p className="mt-4 max-w-[820px] text-[26px] leading-snug text-sky-200/85">
        {children}
      </p>
    </div>
  );
}

/** Lencana LIVE + lokasi siaran di pojok kiri atas video. */
export function LiveBadges({ place }: { place: string }) {
  return (
    <div className="pointer-events-none absolute top-6 left-6 flex items-center gap-3">
      <span className="flex items-center gap-2.5 rounded-lg bg-bata-700 px-4 py-2.5 text-[20px] leading-none font-bold tracking-[0.08em] text-white">
        <span className="size-3 animate-soft-pulse rounded-full bg-white" />
        LIVE
      </span>
      <span className="flex items-center gap-2.5 rounded-lg bg-navy-950/90 px-4 py-2.5 text-[20px] leading-none font-semibold text-white">
        <MapPin className="size-5.5 text-gold-400" aria-hidden="true" />
        {place}
      </span>
    </div>
  );
}

/** Ajakan menekan layar saat browser menahan suara video. */
export function SoundHint() {
  return (
    <p
      role="status"
      className="pointer-events-none absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-lg bg-gold-400 px-6 py-3.5 text-[22px] leading-none font-bold whitespace-nowrap text-navy-950"
    >
      <VolumeX className="size-6.5 shrink-0" aria-hidden="true" />
      Tekan layar atau tombol apa saja untuk menyalakan suara
    </p>
  );
}

/**
 * Memutar sumber berurutan: pindah ke cadangan bila pemutar error atau siaran tidak mulai dalam 30 detik.
 * Video selalu mulai senyap agar autoplay diizinkan, lalu suara dinyalakan bila pengaturan mengizinkan.
 */
function LiveStream({ sources, sound }: { sources: string[]; sound: boolean }) {
  const [index, setIndex] = useState(0);
  const [needsTap, setNeedsTap] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const src = sources[index];

  useEffect(() => {
    if (src) return;
    const retry = setTimeout(() => setIndex(0), STREAM_RETRY_MS);
    return () => clearTimeout(retry);
  }, [src]);

  useEffect(() => {
    const container = host.current;
    if (!src || !container) return;
    // Dibuat manual, bukan lewat JSX, karena player.destroy() ikut menghapus iframe dari DOM.
    const iframe = document.createElement("iframe");
    iframe.src = `${src}&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;
    iframe.title = "Siaran langsung Masjidil Haram, Makkah";
    iframe.allow = "autoplay; encrypted-media; picture-in-picture";
    iframe.className = "absolute inset-0 size-full border-0";
    container.appendChild(iframe);
    container.dataset.sound = sound ? "pending" : "off";

    let active = true;
    let started = false;
    let player: YouTubePlayer | undefined;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const skip = () => {
      if (!active) return;
      active = false;
      setIndex((i) => i + 1);
    };
    const holdSound = () => {
      soundBlocked = true;
      player?.mute();
      player?.playVideo();
      container.dataset.sound = "blocked";
      setNeedsTap(true);
    };
    const enableSound = (YT: YouTubeApi) => {
      if (!active || !player) return;
      player.unMute();
      player.playVideo();
      // Browser yang menolak suara akan menjeda video, jadi cek hasilnya lalu kembali senyap bila gagal.
      timers.push(
        setTimeout(() => {
          if (!active || !player) return;
          if (player.getPlayerState?.() === YT.PlayerState.PAUSED || player.isMuted?.()) return holdSound();
          soundBlocked = false;
          container.dataset.sound = "on";
          setNeedsTap(false);
        }, UNMUTE_CHECK_MS),
      );
    };

    let api: YouTubeApi | undefined;
    const onActivate = () => {
      if (sound && started && api && container.dataset.sound === "blocked") enableSound(api);
    };
    window.addEventListener("pointerdown", onActivate);
    window.addEventListener("keydown", onActivate);

    loadYouTubeApi()
      .then((YT) => {
        if (!active) return;
        api = YT;
        player = new YT.Player(iframe, {
          events: {
            onStateChange: (e) => {
              if (e.data !== YT.PlayerState.PLAYING || started) return;
              started = true;
              if (!sound) return;
              if (soundBlocked && !navigator.userActivation?.hasBeenActive) holdSound();
              else enableSound(YT);
            },
            onAutoplayBlocked: () => {
              if (sound && started) holdSound();
            },
            onError: skip,
          },
        });
        timers.push(
          setTimeout(() => {
            if (!started && player?.getPlayerState?.() !== YT.PlayerState.PLAYING) skip();
          }, STREAM_START_TIMEOUT_MS),
        );
      })
      // Tanpa IFrame API siaran tetap diputar senyap, hanya tanpa suara dan tanpa pindah otomatis ke cadangan.
      .catch(() => {});

    return () => {
      active = false;
      timers.forEach(clearTimeout);
      window.removeEventListener("pointerdown", onActivate);
      window.removeEventListener("keydown", onActivate);
      player?.destroy();
      iframe.remove();
    };
  }, [src, sound]);

  if (!src) {
    return (
      <StreamNotice title="Siaran langsung belum tersedia">
        Siaran utama dan cadangan tidak dapat diputar. Layar akan mencoba lagi secara otomatis.
      </StreamNotice>
    );
  }
  return (
    <div className="relative size-full bg-black">
      <div ref={host} className="absolute inset-0" />
      {/* Penangkap ketukan: mencegah klik menjeda video dan menjadikannya interaksi halaman untuk menyalakan suara. */}
      <div className="absolute inset-0" aria-hidden="true" />
      <LiveBadges place="Masjidil Haram, Makkah" />
      {sound && needsTap && <SoundHint />}
    </div>
  );
}

export function KabahPanel({ state }: P) {
  const { youtubeUrl, backupUrl } = state.settings.kabah;
  // Suara harus diizinkan di Pengaturan Live Ka'bah dan di pengaturan layar TV ini.
  const sound = state.settings.kabah.sound && state.display.sound;
  const sources = youtubeSources([youtubeUrl, backupUrl]);
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("preview")) {
    return (
      <StreamNotice title="Live Ka'bah">
        Siaran langsung hanya diputar di layar TV agar pratinjau di HP hemat kuota.
      </StreamNotice>
    );
  }
  if (!sources.length) {
    return <StreamNotice title="Live Ka'bah">Belum ada URL siaran. Isi URL YouTube di menu Pengaturan panel pengurus.</StreamNotice>;
  }
  return <LiveStream key={sources.join(" ")} sources={sources} sound={sound} />;
}

export function SlidesPanel({ state, perSlideSec }: P & { perSlideSec: number }) {
  const slides = state.slides;
  const [i, setI] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setI((v) => (v + 1) % Math.max(1, slides.length)), perSlideSec * 1000);
    return () => clearInterval(iv);
  }, [slides.length, perSlideSec]);
  const index = i % Math.max(1, slides.length);
  const slide = slides[index];
  if (!slide) return null;
  return (
    <div className="relative size-full overflow-hidden bg-navy-950">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={slide.id}
        src={slide.image}
        alt={slide.caption || "Poster kegiatan masjid"}
        className="animate-panel-in relative size-full object-contain"
      />
      {slide.caption && (
        <p className="absolute bottom-7 left-7 flex max-w-[68%] items-center gap-3 rounded-xl bg-navy-950/95 px-5 py-3 text-[26px] leading-tight font-semibold">
          <Images className="size-6 shrink-0 text-sky-300" aria-hidden="true" />
          <span className="line-clamp-2">{slide.caption}</span>
        </p>
      )}
      {slides.length > 1 && (
        <span className="absolute top-6 right-6 rounded-full bg-navy-950/70 px-4 py-2 text-[18px] leading-none font-extrabold tabular-nums">
          {index + 1} / {slides.length}
        </span>
      )}
    </div>
  );
}

export function KajianPanel({ state, now }: P & { now: number }) {
  const list = arrangeKajian(state.kajian, now);
  const [featured, ...rest] = list;
  if (!featured) return null;
  const others = rest.slice(0, 3);
  const todayCount = list.filter((k) => k.relative === "Hari ini").length;
  const whenFeatured = [featured.relative, kajianScheduleLabel(featured), kajianTimeLabel(featured)].filter(Boolean).join(" · ");
  const presenter = featured.presenter;
  return (
    <div className="flex size-full flex-col p-10">
      <PanelHeader
        icon={BookOpenText}
        title="Agenda kajian"
        meta={todayCount ? `${todayCount} hari ini · ${list.length} agenda` : `${list.length} agenda`}
      />
      <div className={`grid min-h-0 flex-1 gap-5 ${others.length ? "grid-cols-[1.15fr_1fr]" : "grid-cols-1"}`}>
        <article className="relative isolate grid min-h-0 overflow-hidden rounded-xl bg-royal-700">
          {featured.banner && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={featured.banner} alt="" className="absolute inset-0 size-full object-cover" />
          )}
          <div className={`relative flex min-w-0 flex-col gap-5 p-8 ${featured.banner ? "photo-caption" : "justify-between"}`}>
            <div>
              <h3 className="line-clamp-3 text-[42px] leading-[1.1] font-bold tracking-tight">{featured.title}</h3>
              {whenFeatured && <p className="mt-4 text-[22px] leading-snug font-semibold text-gold-300">{whenFeatured}</p>}
            </div>
            {(presenter || featured.location) && (
              <div className="space-y-4">
                {presenter && (
                  <div className="flex items-center gap-4">
                    {presenter.photo && <Avatar name={presenter.name} photo={presenter.photo} className="size-16 rounded-lg" />}
                    <div className="min-w-0">
                      <p className="text-[18px] text-sky-200">Pemateri</p>
                      <p className="truncate text-[28px] leading-tight font-bold">{presenter.name}</p>
                      {presenter.profile && <p className="truncate text-[19px] text-sky-200">{presenter.profile}</p>}
                    </div>
                  </div>
                )}
                {featured.location && (
                  <p className="flex items-center gap-3 text-[22px] font-medium text-sky-200">
                    <MapPin className="size-6 shrink-0 text-gold-400" aria-hidden="true" />
                    {featured.location}
                  </p>
                )}
              </div>
            )}
          </div>
        </article>
        {others.length > 0 && (
          <ul className="flex min-h-0 flex-col gap-4">
            {others.map((k) => {
              // Tiga kartu bertumpuk terlalu pendek untuk semua baris, jadi tempat disembunyikan.
              const compact = others.length >= 3;
              const roomy = others.length === 1;
              const when = [k.relative ? null : kajianScheduleLabel(k), kajianTimeLabel(k)].filter(Boolean).join(" · ");
              const p = k.presenter;
              return (
                <li
                  key={k.id}
                  className="flex min-h-0 flex-1 flex-col justify-center gap-3 border-b border-line px-2 py-4 last:border-0"
                >
                  <div className="min-w-0">
                    {(k.relative || when) && (
                      <p className="flex min-w-0 items-center gap-2.5 text-[19px] font-bold text-gold-400">
                        {k.relative ? (
                          <span className="shrink-0">{k.relative}</span>
                        ) : (
                          <Clock3 className="size-5.5 shrink-0" aria-hidden="true" />
                        )}
                        <span className="truncate">{when}</span>
                      </p>
                    )}
                    <p
                      className={`mt-2 leading-tight font-bold tracking-[-0.01em] ${
                        roomy ? "mt-4 line-clamp-3 text-[36px]" : compact ? "line-clamp-1 text-[29px]" : "line-clamp-2 text-[29px]"
                      }`}
                    >
                      {k.title}
                    </p>
                  </div>
                  {(p || (!compact && k.location)) && (
                    <div className="min-w-0 space-y-1.5">
                      {p && (
                        <p className="flex items-center gap-2.5 text-[21px] text-sky-200">
                          {p.photo && <Avatar name={p.name} photo={p.photo} className="size-8 rounded-md" />}
                          <span className="truncate">Pemateri: {p.name}</span>
                        </p>
                      )}
                      {!compact && k.location && (
                        <p className="flex items-center gap-2.5 text-[19px] text-sky-200/70">
                          <MapPin className="size-5 shrink-0" aria-hidden="true" />
                          <span className="truncate">{k.location}</span>
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export function JumatPanel({ state }: P) {
  const [next, ...rest] = state.jumat;
  if (!next) return null;
  const khatib = next.khatibCard;
  const roles = [
    { label: "Khatib", value: khatib?.name ?? next.khatib, icon: Mic2, photo: khatib?.photo ?? null, profile: khatib?.profile ?? "" },
    { label: "Imam", value: next.imam, icon: UserRound, photo: null, profile: "" },
    { label: "Muazin", value: next.muadzin, icon: Volume2, photo: null, profile: "" },
  ].filter((r) => r.value);
  return (
    <div className="flex size-full flex-col p-10">
      <PanelHeader icon={CalendarDays} title="Petugas Jumat" meta={rest.length ? `${rest.length + 1} jadwal` : undefined} />
      <div className="grid min-h-0 flex-1 grid-cols-[290px_1fr] gap-5">
        <div className="flex min-h-0 flex-col gap-4">
          <div
            className="card-brand relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-[28px] text-center"
          >
            <p className="relative text-[20px] font-extrabold tracking-[0.24em] text-gold-400 uppercase">Jumat</p>
            <p className="relative mt-1 text-[128px] leading-none font-extrabold tracking-[-0.05em] tabular-nums">
              {Number(next.date.slice(8, 10))}
            </p>
            <p className="relative mt-2 text-[24px] font-bold">{monthLabel(next.date)}</p>
          </div>
          {rest.slice(0, 2).map((j) => (
            <div key={j.id} className="tile rounded-[22px] px-5 py-3.5">
              <p className="text-[16px] font-extrabold text-gold-400">{formatDateStr(j.date)}</p>
              <p className="mt-0.5 truncate text-[21px] font-bold">{j.khatibCard?.name || "Khatib belum diisi"}</p>
            </div>
          ))}
        </div>
        <div className="flex min-h-0 flex-col gap-4">
          {next.theme && (
            <div className="tile flex items-start gap-5 rounded-[24px] p-6">
              <Quote className="size-10 shrink-0 text-gold-400" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-[16px] font-extrabold tracking-[0.14em] text-sky-200/75 uppercase">Tema khutbah</p>
                <p className="mt-1.5 line-clamp-2 text-[30px] leading-tight font-bold">{next.theme}</p>
              </div>
            </div>
          )}
          {roles.map(({ label, value, icon, photo, profile }) => (
            <div
              key={label}
              className="tile flex min-h-0 flex-1 items-center gap-5 rounded-[24px] px-6"
            >
              {photo ? <Avatar name={value} photo={photo} className="size-20 rounded-[20px]" /> : <IconTile icon={icon} />}
              <div className="min-w-0">
                <p className="text-[16px] font-extrabold tracking-[0.14em] text-sky-200/75 uppercase">{label}</p>
                <p className="mt-1 truncate text-[32px] leading-tight font-bold">{value}</p>
                {profile && <p className="truncate text-[19px] text-sky-200/70">{profile}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RecentList({ items }: { items: DisplayState["finance"]["recent"] }) {
  return (
    <ul className="mt-2 flex min-h-0 flex-1 flex-col">
      {items.map((r) => {
        const isIn = r.kind === "in";
        return (
          <li key={r.id} className="flex items-center gap-4 border-b border-white/8 py-3.5 last:border-b-0">
            <span
              className={`grid size-12 shrink-0 place-items-center rounded-[16px] ${
                isIn ? "bg-emerald-400/15 text-emerald-300" : "bg-rose-400/15 text-rose-300"
              }`}
            >
              {isIn ? <ArrowDownLeft className="size-6" aria-hidden="true" /> : <ArrowUpRight className="size-6" aria-hidden="true" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[22px] font-semibold">
                {r.description || r.category || (isIn ? "Pemasukan" : "Pengeluaran")}
              </span>
              <span className="block truncate text-[17px] text-sky-200/65">
                {[formatDateStr(r.date), r.description ? r.category : null].filter(Boolean).join(" · ")}
              </span>
            </span>
            <span className={`shrink-0 text-[24px] font-extrabold tabular-nums ${isIn ? "text-emerald-300" : "text-rose-300"}`}>
              {isIn ? "+" : "−"}
              {rupiah(r.amount).replace("Rp ", "")}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function KasPanel({ state }: P) {
  const f = state.finance;
  const stats = [
    { label: "Pemasukan", value: f.monthIn, icon: TrendingUp, tone: "bg-emerald-400/15 text-emerald-300" },
    { label: "Pengeluaran", value: f.monthOut, icon: TrendingDown, tone: "bg-rose-400/15 text-rose-300" },
  ];
  const breakdown = f.categories.slice(0, 3);
  const max = Math.max(1, ...breakdown.map((c) => c.amount));
  return (
    <div className="flex size-full flex-col p-10">
      <PanelHeader icon={Wallet} title="Laporan kas masjid" meta={f.monthLabel} tone="zamrud" />
      <div className="grid min-h-0 flex-1 grid-cols-[1.05fr_1fr] gap-5">
        <div className="flex min-h-0 flex-col gap-4">
          <div
            className="card-zamrud relative flex flex-1 flex-col justify-between overflow-hidden rounded-[28px] p-8"
          >
            <p className="relative flex items-center gap-3 text-[22px] font-bold text-sky-100">
              <Landmark className="size-7 text-gold-400" aria-hidden="true" />
              Saldo kas saat ini
            </p>
            <p className="relative text-[60px] leading-none font-extrabold tracking-[-0.03em] whitespace-nowrap tabular-nums">
              {rupiah(f.balance)}
            </p>
          </div>
          {stats.map(({ label, value, icon: Icon, tone }) => (
            <div key={label} className="tile flex items-center gap-4 rounded-[24px] px-6 py-4">
              <span className={`grid size-12 shrink-0 place-items-center rounded-[16px] ${tone}`}>
                <Icon className="size-6" aria-hidden="true" />
              </span>
              <span className="flex-1 text-[22px] font-semibold text-sky-100/90">{label}</span>
              <span className="text-[32px] leading-none font-extrabold tabular-nums">{rupiah(value)}</span>
            </div>
          ))}
        </div>
        {breakdown.length ? (
          <div className="flex min-h-0 flex-col gap-4">
            <div className="tile rounded-[28px] px-7 py-5">
              <p className="text-[20px] font-extrabold text-sky-200/85">Rincian bulan ini</p>
              <ul className="mt-3 space-y-3">
                {breakdown.map((c) => (
                  <li key={`${c.kind}:${c.name}`}>
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="truncate text-[21px] font-semibold">{c.name}</span>
                      <span
                        className={`shrink-0 text-[22px] font-extrabold tabular-nums ${c.kind === "in" ? "text-emerald-300" : "text-rose-300"}`}
                      >
                        {c.kind === "in" ? "+" : "−"}
                        {rupiah(c.amount).replace("Rp ", "")}
                      </span>
                    </div>
                    <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-white/8">
                      <span
                        className={`block h-full rounded-full ${c.kind === "in" ? "bg-emerald-400/70" : "bg-rose-400/70"}`}
                        style={{ width: `${Math.max(4, (c.amount / max) * 100)}%` }}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="tile flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] px-7 pt-5 pb-2">
              <p className="text-[20px] font-extrabold text-sky-200/85">Transaksi terakhir</p>
              <RecentList items={f.recent.slice(0, 2)} />
            </div>
          </div>
        ) : (
          <div className="tile flex min-h-0 flex-col rounded-[28px] px-7 py-6">
            <p className="text-[20px] font-extrabold text-sky-200/85">Transaksi terakhir</p>
            <RecentList items={f.recent.slice(0, 5)} />
          </div>
        )}
      </div>
    </div>
  );
}

export function AyatPanel({ state }: P) {
  const v = state.verse;
  if (!v) return null;
  const arabicSize = v.arabic.length > 160 ? "text-[50px]" : v.arabic.length > 90 ? "text-[60px]" : "text-[72px]";
  const translationSize =
    v.translation.length > 220 ? "text-[25px]" : v.translation.length > 130 ? "text-[29px]" : "text-[34px]";
  return (
    <div className="flex size-full flex-col items-center justify-center px-20 py-12 text-center">
      <h2 className="sr-only">Renungan hari ini</h2>
      <p dir="rtl" lang="ar" className={`font-arabic leading-[1.75] text-white ${arabicSize}`}>
        {v.arabic}
      </p>
      <p className={`mt-8 max-w-[1000px] leading-snug text-sky-100/90 ${translationSize}`}>
        &ldquo;{v.translation}&rdquo;
      </p>
      {v.source && (
        <p className="mt-6 text-[24px] font-semibold text-muted">
          {v.source}
        </p>
      )}
    </div>
  );
}

export function QrisPanel({ state }: P) {
  const q = state.settings.qris;
  return (
    <div className="flex size-full items-center gap-12 p-10">
      {q.image && (
        <div className="flex h-full shrink-0 items-center justify-center rounded-xl bg-white px-7">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={q.image} alt="Kode QRIS untuk donasi masjid" className="h-[430px] w-auto object-contain" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h2 className="text-[46px] leading-tight font-bold tracking-tight">Infak dan sedekah</h2>
        {q.note && <p className="mt-3 text-[26px] leading-snug text-sky-200">{q.note}</p>}
        {q.image && (
          <ol className="mt-7 list-decimal space-y-2 pl-8 text-[24px] leading-snug">
            <li>Buka aplikasi bank atau dompet digital.</li>
            <li>Pindai kode QRIS di layar.</li>
            <li>Periksa nama penerima, lalu bayar.</li>
          </ol>
        )}
        {q.accountNo && (
          <div className="mt-6 border-t border-line pt-5">
            <p className="text-[22px] font-semibold">{q.bankName || "Rekening masjid"}</p>
            <p className="relative mt-3 text-[42px] leading-none font-extrabold tracking-[0.06em] tabular-nums">{q.accountNo}</p>
            {q.accountName && <p className="relative mt-2 text-[20px] font-medium text-sky-100/85">a.n. {q.accountName}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

export function PengumumanPanel({ state }: P) {
  const items = state.announcements.filter((a) => a.showPanel).slice(0, 3);
  const [first, ...rest] = items;
  if (!first) return null;
  return (
    <div className="flex size-full flex-col p-10">
      <PanelHeader icon={Megaphone} title="Pengumuman" tone="bata" />
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <article
          className="flex min-h-0 flex-[1.5] flex-col justify-center py-4"
        >
          {first.title && (
            <h3 className="text-[32px] leading-tight font-bold text-bata-200">{first.title}</h3>
          )}
          <p className={`relative mt-3 leading-snug font-semibold ${rest.length ? "line-clamp-3 text-[32px]" : "line-clamp-6 text-[40px]"}`}>
            {first.body}
          </p>
        </article>
        {rest.map((a) => (
          <article key={a.id} className="flex min-h-0 flex-1 items-center border-t border-line py-4">
            <div className="min-w-0">
              {a.title && <h3 className="text-[24px] font-bold text-bata-200">{a.title}</h3>}
              <p className="line-clamp-2 text-[25px] leading-snug font-medium">{a.body}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
