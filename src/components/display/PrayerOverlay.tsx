import { BellRing, HandHeart, PhoneOff, Rows3, TriangleAlert } from "lucide-react";
import type { PrayerPhase } from "@/lib/prayer/schedule";
import { PRAYER_LABELS } from "@/lib/types";
import { formatClock, formatDuration } from "@/lib/time";
import { SunEmblem } from "./SunEmblem";
import { IconTile, ProgressRing } from "./ui";

const DOA_ADZAN = {
  arabic:
    "اللَّهُمَّ رَبَّ هَذِهِ الدَّعْوَةِ التَّامَّةِ، وَالصَّلَاةِ الْقَائِمَةِ، آتِ مُحَمَّدًا الْوَسِيلَةَ وَالْفَضِيلَةَ، وَابْعَثْهُ مَقَامًا مَحْمُودًا الَّذِي وَعَدْتَهُ",
  translation:
    "Ya Allah, Tuhan pemilik seruan yang sempurna ini dan shalat yang akan didirikan, berikanlah kepada Nabi Muhammad al-wasilah dan keutamaan, dan bangkitkanlah beliau pada kedudukan terpuji yang telah Engkau janjikan.",
  source: "HR. Al-Bukhari",
};

/** Layar penuh saat waktu sholat: Adzan → doa → Iqamah → Shalat/Khutbah. */
export function PrayerOverlay({ phase, now }: { phase: Exclude<PrayerPhase, { kind: "normal" }>; now: number }) {
  const name = PRAYER_LABELS[phase.prayer];

  if (phase.kind === "shalat") {
    // Sengaja gelap dan tenang agar tidak mengganggu kekhusyukan.
    return (
      <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-[#02030d] text-center">
        <p className="text-[60px] font-bold text-white/20 tabular-nums">{formatClock(now, false)}</p>
        <p className="mt-10 text-[64px] font-extrabold tracking-[-0.02em] text-white/80">
          {phase.isJumat ? "Khutbah & Shalat Jumat" : `Shalat ${name}`} sedang berlangsung
        </p>
        <p className="mt-6 max-w-[1300px] text-[34px] leading-snug text-white/45">
          {phase.isJumat
            ? "Mohon tidak berbicara ketika khatib sedang berkhutbah."
            : "Luruskan dan rapatkan shaf. Mohon matikan atau senyapkan telepon genggam Anda."}
        </p>
        <PhoneOff className="mt-12 size-16 text-white/25" aria-hidden="true" />
      </div>
    );
  }

  if (phase.kind === "adzan") {
    return (
      <div className="scene absolute inset-0 z-40 flex flex-col items-center justify-center overflow-hidden text-center">
        <div className="pattern pattern-fade absolute inset-0" />
        <div className="relative grid place-items-center">
          <span className="animate-ripple absolute size-[176px] rounded-full border-2 border-gold-400/50" />
          <span className="animate-ripple absolute size-[176px] rounded-full border-2 border-gold-400/50 [animation-delay:1.8s]" />
          <span className="card-brand relative grid size-[176px] place-items-center rounded-[52px] text-white">
            <SunEmblem className="size-28" />
          </span>
        </div>
        <p dir="rtl" lang="ar" className="relative mt-14 font-arabic text-[84px] leading-tight text-gold-400">
          حَيَّ عَلَى الصَّلَاةِ
        </p>
        <p className="relative mt-5 text-[26px] font-extrabold tracking-[0.3em] text-sky-200/80 uppercase">
          {phase.isJumat ? "Adzan Jumat" : "Waktu adzan"}
        </p>
        <h2 className="relative mt-3 text-[150px] leading-none font-extrabold tracking-[-0.045em]">{name}</h2>
        <p className="relative mt-8 flex items-center gap-4 text-[34px] font-medium text-sky-100/90">
          <BellRing className="size-9 text-gold-400" aria-hidden="true" />
          Mari hentikan aktivitas dan menjawab seruan adzan.
        </p>
        <p className="card relative mt-10 rounded-full px-9 py-4 text-[36px] leading-none font-extrabold tabular-nums">
          {formatClock(now)} WITA
        </p>
      </div>
    );
  }

  if (phase.kind === "doa") {
    return (
      <div className="scene absolute inset-0 z-40 flex flex-col items-center justify-center overflow-hidden px-24 text-center">
        <div className="pattern pattern-fade absolute inset-0" />
        <p className="relative flex items-center gap-4 text-[28px] font-extrabold tracking-[0.24em] text-gold-400 uppercase">
          <HandHeart className="size-9" aria-hidden="true" />
          Doa setelah adzan
        </p>
        <p dir="rtl" lang="ar" className="relative mt-10 max-w-[1500px] font-arabic text-[62px] leading-[1.8] text-white">
          {DOA_ADZAN.arabic}
        </p>
        <p className="relative mt-8 max-w-[1400px] text-[30px] leading-snug font-medium text-sky-100/90">
          &ldquo;{DOA_ADZAN.translation}&rdquo;
        </p>
        <p className="relative mt-4 text-[22px] font-bold text-sky-200/70">{DOA_ADZAN.source}</p>
        <p className="card relative mt-12 rounded-full px-9 py-4 text-[30px] leading-none font-extrabold">
          Iqamah {name} pukul <span className="tabular-nums">{formatClock(phase.iqamahAt, false)}</span> WITA
        </p>
      </div>
    );
  }

  const progress = (now - phase.startsAt) / Math.max(1, phase.endsAt - phase.startsAt);
  return (
    <div className="scene absolute inset-0 z-40 flex items-center justify-center gap-28 overflow-hidden px-24">
      <div className="pattern pattern-fade absolute inset-0" />
      <ProgressRing size={600} stroke={24} progress={progress} trackClassName="text-white/10" barClassName="text-gold-400">
        <div className="text-center">
          <p className="text-[28px] font-extrabold tracking-[0.24em] text-sky-200/80 uppercase">Iqamah dalam</p>
          <p className="mt-3 text-[160px] leading-none font-extrabold tracking-[-0.05em] tabular-nums">
            {formatDuration(phase.endsAt - now)}
          </p>
        </div>
      </ProgressRing>
      <div className="relative max-w-[720px]">
        <p className="text-[28px] font-extrabold tracking-[0.24em] text-gold-400 uppercase">Menuju iqamah</p>
        <h2 className="mt-3 text-[132px] leading-none font-extrabold tracking-[-0.045em]">{name}</h2>
        <ul className="mt-14 space-y-5">
          <li className="flex items-center gap-6 text-[36px] font-bold">
            <IconTile icon={Rows3} tone="gold" size="lg" />
            Luruskan dan rapatkan shaf
          </li>
          <li className="flex items-center gap-6 text-[36px] font-bold">
            <IconTile icon={PhoneOff} size="lg" />
            Senyapkan telepon genggam
          </li>
        </ul>
      </div>
    </div>
  );
}

/** Menutupi area konten utama; jadwal sholat dan teks berjalan tetap terlihat. */
export function EmergencyOverlay({ text }: { text: string }) {
  return (
    <div
      role="alert"
      className="card-brand outline-gold absolute inset-x-14 top-[132px] z-30 flex h-[676px] flex-col justify-center overflow-hidden rounded-[36px] p-16"
    >
      <div className="pattern pattern-fade absolute inset-0" />
      <div className="relative flex items-center gap-5">
        <IconTile icon={TriangleAlert} tone="gold" size="lg" />
        <p className="text-[30px] font-extrabold tracking-[0.14em] text-gold-400 uppercase">Pengumuman penting</p>
      </div>
      <p className="relative mt-8 line-clamp-6 text-[58px] leading-[1.15] font-extrabold tracking-[-0.02em] whitespace-pre-line">
        {text}
      </p>
    </div>
  );
}
