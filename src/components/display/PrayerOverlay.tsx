import { TriangleAlert } from "lucide-react";
import type { PrayerPhase } from "@/lib/prayer/schedule";
import { PRAYER_LABELS } from "@/lib/types";
import { formatClock, formatDuration } from "@/lib/time";
import { ProgressRing } from "./ui";

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
      </div>
    );
  }

  if (phase.kind === "adzan") {
    return (
      <div className="scene absolute inset-0 z-40 flex flex-col items-center justify-center overflow-hidden text-center">
        <p dir="rtl" lang="ar" className="font-arabic text-[84px] leading-tight text-gold-400">
          حَيَّ عَلَى الصَّلَاةِ
        </p>
        <h2 className="mt-8 text-[128px] leading-none font-bold tracking-tight">Adzan {phase.isJumat ? "Jumat" : name}</h2>
        <p className="mt-8 text-[34px] text-sky-100/90">
          Mari hentikan aktivitas dan menjawab seruan adzan.
        </p>
        <p className="mt-10 text-[36px] font-semibold tabular-nums">
          {formatClock(now)} WITA
        </p>
      </div>
    );
  }

  if (phase.kind === "doa") {
    return (
      <div className="scene absolute inset-0 z-40 flex flex-col items-center justify-center overflow-hidden px-24 text-center">
        <h2 className="text-[36px] font-semibold">Doa setelah adzan</h2>
        <p dir="rtl" lang="ar" className="relative mt-10 max-w-[1500px] font-arabic text-[62px] leading-[1.8] text-white">
          {DOA_ADZAN.arabic}
        </p>
        <p className="relative mt-8 max-w-[1400px] text-[30px] leading-snug font-medium text-sky-100/90">
          &ldquo;{DOA_ADZAN.translation}&rdquo;
        </p>
        <p className="relative mt-4 text-[22px] font-bold text-sky-200/70">{DOA_ADZAN.source}</p>
        <p className="mt-12 text-[30px] font-semibold text-gold-300">
          Iqamah {name} pukul <span className="tabular-nums">{formatClock(phase.iqamahAt, false)}</span> WITA
        </p>
      </div>
    );
  }

  const progress = (now - phase.startsAt) / Math.max(1, phase.endsAt - phase.startsAt);
  return (
    <div className="scene absolute inset-0 z-40 flex items-center justify-center gap-28 overflow-hidden px-24">
      <ProgressRing size={600} stroke={24} progress={progress} trackClassName="text-white/10" barClassName="text-gold-400">
        <p className="text-[150px] leading-none font-bold tracking-tight tabular-nums">
          <span className="sr-only">Iqamah dalam </span>{formatDuration(phase.endsAt - now)}
        </p>
      </ProgressRing>
      <div className="max-w-[720px]">
        <h2 className="text-[88px] leading-tight font-bold tracking-tight">Iqamah {name}</h2>
        <ul className="mt-10 space-y-3 text-[36px]">
          <li>Luruskan dan rapatkan shaf.</li>
          <li>Senyapkan telepon genggam.</li>
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
      className="card-bata absolute inset-x-14 top-[132px] z-30 flex h-[676px] flex-col justify-center overflow-hidden rounded-2xl p-16"
    >
      <div className="relative flex items-center gap-5">
        <TriangleAlert className="size-10" aria-hidden="true" />
        <p className="text-[32px] font-bold">Pengumuman penting</p>
      </div>
      <p className="relative mt-8 line-clamp-6 text-[58px] leading-[1.15] font-extrabold tracking-[-0.02em] whitespace-pre-line">
        {text}
      </p>
    </div>
  );
}
