"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BookOpenText,
  CalendarDays,
  CircleCheck,
  Clock3,
  HandHeart,
  Images,
  Info,
  Landmark,
  MapPin,
  Megaphone,
  Mic2,
  Quote,
  Radio,
  ScanLine,
  Smartphone,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserRound,
  Volume2,
  VolumeX,
  Wallet,
} from "lucide-react";
import type { DisplayState } from "@/lib/types";
import { formatDateStr, monthLabel, rupiah } from "@/lib/time";
import { youtubeSources } from "@/lib/youtube";
import { arrangeKajian, kajianScheduleLabel, kajianTimeLabel } from "@/lib/kajian";
import { Avatar, Chip, IconTile, PanelHeader, StarOrnament } from "./ui";
import { loadYouTubeApi, type YouTubeApi, type YouTubePlayer } from "./youtubeApi";

type P = { state: DisplayState };

/** Jeda masuk bertahap ~100 ms per bagian agar isi panel tidak muncul sekaligus. */
const delay = (step: number): CSSProperties => ({ animationDelay: `${step * 100}ms` });

const STREAM_START_TIMEOUT_MS = 30_000;
const STREAM_RETRY_MS = 5 * 60_000;
const UNMUTE_CHECK_MS = 1_500;

/**
 * Browser menahan suara sampai ada klik, sentuhan, atau tombol di halaman ini.
 * Disimpan per halaman agar percobaan yang pasti gagal tidak membuat video tersendat tiap rotasi.
 */
let soundBlocked = false;

function StreamNotice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex size-full flex-col items-center justify-center px-24 text-center">
      <IconTile icon={Radio} size="xl" className="rise" />
      <p className="rise mt-8 text-[46px] font-extrabold tracking-[-0.02em]" style={delay(1)}>
        {title}
      </p>
      <p className="rise mt-4 max-w-[820px] text-[26px] leading-snug text-sky-200/85" style={delay(2)}>
        {children}
      </p>
    </div>
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
      <div className="pointer-events-none absolute top-6 left-6 flex items-center gap-3">
        <span className="flex items-center gap-2.5 rounded-full bg-red-600 px-5 py-2.5 text-[20px] leading-none font-extrabold tracking-[0.1em] text-white">
          <span className="size-3 animate-soft-pulse rounded-full bg-white" />
          LIVE
        </span>
        <span className="flex items-center gap-2.5 rounded-full bg-black/60 px-5 py-2.5 text-[20px] leading-none font-bold text-white">
          <MapPin className="size-5.5 text-gold-400" aria-hidden="true" />
          Masjidil Haram, Makkah
        </span>
      </div>
      {sound && needsTap && (
        <p
          role="status"
          className="pointer-events-none absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full bg-gold-400 px-6 py-3.5 text-[22px] leading-none font-extrabold whitespace-nowrap text-navy-950 shadow-[0_16px_40px_-12px_rgb(0_0_0/0.8)]"
        >
          <VolumeX className="size-6.5 shrink-0" aria-hidden="true" />
          Tekan layar atau tombol apa saja untuk menyalakan suara
        </p>
      )}
    </div>
  );
}

export function KabahPanel({ state }: P) {
  const { youtubeUrl, backupUrl, sound } = state.settings.kabah;
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
      <img src={slide.image} alt="" className="absolute inset-0 size-full scale-110 object-cover opacity-40 blur-2xl" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={slide.id}
        src={slide.image}
        alt={slide.caption || "Poster kegiatan masjid"}
        className="animate-panel-in relative size-full object-contain"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-linear-to-t from-navy-950/85 to-transparent" />
      {slide.caption && (
        <p className="absolute bottom-7 left-7 flex max-w-[68%] items-center gap-4 rounded-[24px] bg-navy-950/70 py-3 pr-7 pl-3 text-[26px] leading-tight font-bold">
          <IconTile icon={Images} tone="gold" size="sm" />
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
  const featuredSchedule = kajianScheduleLabel(featured);
  const featuredTime = kajianTimeLabel(featured);
  const presenter = featured.presenter;
  return (
    <div className="flex size-full flex-col p-10">
      <PanelHeader
        icon={BookOpenText}
        title="Agenda kajian"
        meta={todayCount ? `${todayCount} hari ini · ${list.length} agenda` : `${list.length} agenda`}
      />
      <div className={`grid min-h-0 flex-1 gap-5 ${others.length ? "grid-cols-[1.15fr_1fr]" : "grid-cols-1"}`}>
        <article
          className="card-brand rise relative flex min-h-0 flex-col justify-between overflow-hidden rounded-[28px] p-8"
          style={delay(1)}
        >
          {featured.banner && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={featured.banner} alt="" className="absolute inset-0 size-full object-cover opacity-40" />
              {/* Peredup foto agar teks di atasnya tetap terbaca. */}
              <div className="absolute inset-0 bg-linear-to-t from-navy-950 via-navy-950/70 to-navy-950/30" />
            </>
          )}
          <div className="relative">
            <div className="flex flex-wrap gap-2.5">
              {featured.relative && (
                <Chip icon={Sparkles} tone="gold">
                  {featured.relative}
                </Chip>
              )}
              {featuredSchedule && (
                <Chip icon={CalendarDays} tone={featured.relative ? "glass" : "gold"}>
                  {featuredSchedule}
                </Chip>
              )}
              {featuredTime && <Chip icon={Clock3}>{featuredTime}</Chip>}
            </div>
            <h3 className="mt-6 line-clamp-3 text-[42px] leading-[1.1] font-extrabold tracking-[-0.02em]">{featured.title}</h3>
          </div>
          <div className="relative space-y-4">
            {presenter && (
              <div className="flex items-center gap-4 rounded-[22px] bg-white/12 p-3 pr-6">
                {presenter.photo ? (
                  <Avatar name={presenter.name} photo={presenter.photo} className="size-20 rounded-[18px]" />
                ) : (
                  <IconTile icon={Mic2} tone="gold" />
                )}
                <div className="min-w-0">
                  <p className="text-[16px] font-extrabold tracking-[0.14em] text-sky-200/80 uppercase">Pemateri</p>
                  <p className="truncate text-[28px] leading-tight font-bold">{presenter.name}</p>
                  {presenter.profile && <p className="truncate text-[19px] text-sky-100/75">{presenter.profile}</p>}
                </div>
              </div>
            )}
            {featured.location && (
              <p className="flex items-center gap-3 text-[22px] font-medium text-sky-100/90">
                <MapPin className="size-6 shrink-0 text-gold-400" aria-hidden="true" />
                {featured.location}
              </p>
            )}
          </div>
        </article>
        {others.length > 0 && (
          <ul className="flex min-h-0 flex-col gap-4">
            {others.map((k, idx) => {
              // Tiga kartu bertumpuk terlalu pendek untuk semua baris, jadi tempat disembunyikan.
              const compact = others.length >= 3;
              const roomy = others.length === 1;
              const when = [k.relative ? null : kajianScheduleLabel(k), kajianTimeLabel(k)].filter(Boolean).join(" · ");
              const p = k.presenter;
              return (
                <li
                  key={k.id}
                  className="tile rise flex min-h-0 flex-1 flex-col justify-between gap-3 rounded-[24px] px-7 py-5"
                  style={delay(idx + 2)}
                >
                  <div className="min-w-0">
                    {(k.relative || when) && (
                      <p className="flex min-w-0 items-center gap-2.5 text-[19px] font-bold text-gold-400">
                        {k.relative ? (
                          <span className="shrink-0 rounded-full bg-gold-400 px-3 py-1 text-[16px] leading-none text-navy-950">
                            {k.relative}
                          </span>
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
                      {p &&
                        (roomy ? (
                          <div className="mb-3 flex items-center gap-4 rounded-[20px] bg-white/8 p-3 pr-5">
                            {p.photo ? (
                              <Avatar name={p.name} photo={p.photo} className="size-14 rounded-[16px]" />
                            ) : (
                              <IconTile icon={Mic2} tone="soft" />
                            )}
                            <div className="min-w-0">
                              <p className="text-[16px] font-extrabold tracking-[0.14em] text-sky-200/75 uppercase">Pemateri</p>
                              <p className="truncate text-[25px] leading-tight font-bold">{p.name}</p>
                            </div>
                          </div>
                        ) : (
                          <p className="flex items-center gap-2.5 text-[21px] font-medium text-sky-200/85">
                            {p.photo ? (
                              <Avatar name={p.name} photo={p.photo} className="size-8 rounded-full" />
                            ) : (
                              <Mic2 className="size-5.5 shrink-0 text-sky-300" aria-hidden="true" />
                            )}
                            <span className="truncate">{p.name}</span>
                          </p>
                        ))}
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
            className="card-brand rise relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-[28px] text-center"
            style={delay(1)}
          >
            <p className="relative text-[20px] font-extrabold tracking-[0.24em] text-gold-400 uppercase">Jumat</p>
            <p className="relative mt-1 text-[128px] leading-none font-extrabold tracking-[-0.05em] tabular-nums">
              {Number(next.date.slice(8, 10))}
            </p>
            <p className="relative mt-2 text-[24px] font-bold">{monthLabel(next.date)}</p>
          </div>
          {rest.slice(0, 2).map((j, idx) => (
            <div key={j.id} className="tile rise rounded-[22px] px-5 py-3.5" style={delay(idx + 2)}>
              <p className="text-[16px] font-extrabold text-gold-400">{formatDateStr(j.date)}</p>
              <p className="mt-0.5 truncate text-[21px] font-bold">{j.khatibCard?.name || "Khatib belum diisi"}</p>
            </div>
          ))}
        </div>
        <div className="flex min-h-0 flex-col gap-4">
          {next.theme && (
            <div className="tile rise flex items-start gap-5 rounded-[24px] p-6" style={delay(2)}>
              <Quote className="size-10 shrink-0 text-gold-400" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-[16px] font-extrabold tracking-[0.14em] text-sky-200/75 uppercase">Tema khutbah</p>
                <p className="mt-1.5 line-clamp-2 text-[30px] leading-tight font-bold">{next.theme}</p>
              </div>
            </div>
          )}
          {roles.map(({ label, value, icon, photo, profile }, idx) => (
            <div
              key={label}
              className="tile rise flex min-h-0 flex-1 items-center gap-5 rounded-[24px] px-6"
              style={delay(idx + 3)}
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
            className="card-zamrud rise relative flex flex-1 flex-col justify-between overflow-hidden rounded-[28px] p-8"
            style={delay(1)}
          >
            <p className="relative flex items-center gap-3 text-[22px] font-bold text-sky-100">
              <Landmark className="size-7 text-gold-400" aria-hidden="true" />
              Saldo kas saat ini
            </p>
            <p className="relative text-[60px] leading-none font-extrabold tracking-[-0.03em] whitespace-nowrap tabular-nums">
              {rupiah(f.balance)}
            </p>
          </div>
          {stats.map(({ label, value, icon: Icon, tone }, idx) => (
            <div key={label} className="tile rise flex items-center gap-4 rounded-[24px] px-6 py-4" style={delay(idx + 2)}>
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
            <div className="tile rise rounded-[28px] px-7 py-5" style={delay(2)}>
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
            <div className="tile rise flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] px-7 pt-5 pb-2" style={delay(3)}>
              <p className="text-[20px] font-extrabold text-sky-200/85">Transaksi terakhir</p>
              <RecentList items={f.recent.slice(0, 2)} />
            </div>
          </div>
        ) : (
          <div className="tile rise flex min-h-0 flex-col rounded-[28px] px-7 py-6" style={delay(2)}>
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
      <Chip icon={BookOpenText} tone="gold" className="rise">
        Renungan hari ini
      </Chip>
      <p dir="rtl" lang="ar" className={`rise mt-9 font-arabic leading-[1.75] text-white ${arabicSize}`} style={delay(1)}>
        {v.arabic}
      </p>
      <div className="rise my-7 flex items-center gap-4 text-gold-400" style={delay(2)} aria-hidden="true">
        <span className="h-0.5 w-20 rounded-full bg-current opacity-40" />
        <StarOrnament className="size-6" />
        <span className="h-0.5 w-20 rounded-full bg-current opacity-40" />
      </div>
      <p className={`rise max-w-[1000px] leading-snug font-medium text-sky-100/90 ${translationSize}`} style={delay(3)}>
        &ldquo;{v.translation}&rdquo;
      </p>
      {v.source && (
        <p className="rise mt-6 text-[24px] font-extrabold text-gold-400" style={delay(4)}>
          {v.source}
        </p>
      )}
    </div>
  );
}

const QRIS_STEPS = [
  { icon: Smartphone, text: "Buka aplikasi bank atau dompet digital" },
  { icon: ScanLine, text: "Pindai kode QRIS di layar" },
  { icon: CircleCheck, text: "Periksa nama penerima, lalu bayar" },
] as const;

export function QrisPanel({ state }: P) {
  const q = state.settings.qris;
  return (
    <div className="flex size-full items-center gap-12 p-10">
      {q.image && (
        <div className="rise flex h-full shrink-0 flex-col items-center justify-center rounded-[32px] bg-white px-7 pt-7 pb-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={q.image} alt="Kode QRIS untuk donasi masjid" className="h-[430px] w-auto object-contain" />
          <p className="mt-3 flex items-center gap-2 text-[18px] font-extrabold tracking-[0.18em] text-navy-950 uppercase">
            <ScanLine className="size-5.5 text-royal-600" aria-hidden="true" />
            Pindai QRIS
          </p>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <Chip icon={HandHeart} tone="gold" className="rise">
          Infak &amp; sedekah
        </Chip>
        <h2 className="rise mt-5 text-[46px] leading-[1.1] font-extrabold tracking-[-0.02em]" style={delay(1)}>
          {q.note || "Mari berinfak untuk kemakmuran masjid"}
        </h2>
        {q.image && (
          <ol className="mt-7 grid grid-cols-3 gap-3">
            {QRIS_STEPS.map(({ icon: Icon, text }, idx) => (
              <li key={text} className="tile rise rounded-[22px] p-5" style={delay(idx + 2)}>
                <span className="flex items-center gap-3 text-gold-400">
                  <span className="grid size-8 place-items-center rounded-full bg-gold-400 text-[16px] font-extrabold text-navy-950">
                    {idx + 1}
                  </span>
                  <Icon className="size-6.5" aria-hidden="true" />
                </span>
                <p className="mt-3 text-[20px] leading-snug font-semibold">{text}</p>
              </li>
            ))}
          </ol>
        )}
        {q.accountNo && (
          <div className="card-brand rise relative mt-6 overflow-hidden rounded-[26px] px-7 py-6" style={delay(5)}>
            <div className="relative flex items-center justify-between gap-4">
              <p className="text-[22px] font-extrabold">{q.bankName || "Rekening masjid"}</p>
              <Landmark className="size-8 text-gold-400" aria-hidden="true" />
            </div>
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
      <PanelHeader icon={Megaphone} title="Pengumuman" meta={`${items.length} informasi`} tone="bata" />
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <article
          className="card-bata rise relative flex min-h-0 flex-[1.5] flex-col justify-center overflow-hidden rounded-[28px] px-9 py-7"
          style={delay(1)}
        >
          {first.title && (
            <p className="relative flex items-center gap-3 text-[24px] font-extrabold text-gold-400">
              <StarOrnament className="size-5" />
              {first.title}
            </p>
          )}
          <p className={`relative mt-3 leading-snug font-semibold ${rest.length ? "line-clamp-3 text-[32px]" : "line-clamp-6 text-[40px]"}`}>
            {first.body}
          </p>
        </article>
        {rest.map((a, idx) => (
          <article
            key={a.id}
            className="tile rise flex min-h-0 flex-1 items-center gap-5 rounded-[24px] px-7 py-4"
            style={delay(idx + 2)}
          >
            <IconTile icon={Info} tone="soft" />
            <div className="min-w-0">
              {a.title && <p className="text-[20px] font-extrabold text-gold-400">{a.title}</p>}
              <p className="line-clamp-2 text-[25px] leading-snug font-medium">{a.body}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
