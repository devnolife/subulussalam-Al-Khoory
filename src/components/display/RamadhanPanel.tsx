"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  BookOpenText,
  CalendarDays,
  Clock3,
  MapPin,
  Mic2,
  MoonStar,
  Sparkles,
  Sunrise,
  Sunset,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { IED_LABELS, type DisplayTarawih } from "@/lib/types";
import type { FastingDay, NightTarawih, RamadhanView } from "@/lib/ramadhan";
import { formatDateStr, formatGregorian, witaToMs } from "@/lib/time";
import { WEEKDAYS, weekdayOf } from "@/lib/kajian";
import { Avatar, Chip, IconTile, PanelHeader } from "./ui";

const delay = (step: number): CSSProperties => ({ animationDelay: `${step * 100}ms` });
const countdown = (days: number) => (days === 0 ? "Hari ini" : days === 1 ? "Besok" : `${days} hari lagi`);
const dayDate = (date: string) => `${WEEKDAYS[weekdayOf(date)]}, ${formatDateStr(date)}`;

function untilLabel(ms: number): string {
  const minutes = Math.max(0, Math.ceil(ms / 60_000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} jam ${m} menit` : `${m} menit`;
}

function FastingCard({ fasting, now }: { fasting: FastingDay; now: number }) {
  const left = witaToMs(fasting.date, fasting.maghrib) - now;
  const today = fasting.when === "today";
  return (
    <article className="card-ungu rise relative flex min-h-0 flex-col justify-between overflow-hidden rounded-[28px] p-8" style={delay(1)}>
      <div className="relative">
        <Chip icon={MoonStar} tone="gold">
          {today ? `Puasa hari ke-${fasting.day}` : `Besok puasa hari ke-${fasting.day}`}
        </Chip>
        <p className="mt-4 text-[26px] font-semibold text-sky-100/85">{formatGregorian(witaToMs(fasting.date, "12:00"))}</p>
      </div>
      <div className="relative grid grid-cols-2 gap-4">
        {[
          { label: "Imsak", value: fasting.imsak, icon: Sunrise, accent: "" },
          { label: "Berbuka", value: fasting.maghrib, icon: Sunset, accent: "text-gold-400" },
        ].map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className="rounded-[24px] bg-white/10 px-6 py-5">
            <p className="flex items-center gap-2.5 text-[18px] font-extrabold tracking-[0.14em] text-sky-200/80 uppercase">
              <Icon className="size-6" aria-hidden="true" />
              {label}
            </p>
            <p className={`mt-2 text-[76px] leading-none font-extrabold tracking-[-0.04em] tabular-nums ${accent}`}>{value}</p>
          </div>
        ))}
      </div>
      <p className="relative text-[26px] font-bold text-sky-50">
        {today && left > 0 ? (
          <>
            Berbuka <span className="text-gold-400">{untilLabel(left)}</span> lagi
          </>
        ) : (
          "Jangan lupa makan sahur sebelum imsak"
        )}
      </p>
    </article>
  );
}

/**
 * - `wide`: kartu utama selebar panel.
 * - `large`: kartu utama di kolom kiri (berbagi lebar dengan kolom kanan).
 * - `compact`: kartu pendamping di kolom kanan; tingginya mengikuti isi.
 */
type Variant = "wide" | "large" | "compact";

function Row({
  icon,
  label,
  children,
  photo,
  compact,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
  photo?: { name: string; src: string | null };
  compact?: boolean;
}) {
  return (
    <div className={`flex min-w-0 items-center ${compact ? "gap-3.5" : "gap-4"}`}>
      {photo?.src ? (
        <Avatar name={photo.name} photo={photo.src} className={compact ? "size-11 rounded-[14px]" : "size-14 rounded-[18px]"} />
      ) : (
        <IconTile icon={icon} tone="soft" size={compact ? "sm" : "md"} />
      )}
      <div className="min-w-0">
        <p className={`font-extrabold tracking-[0.14em] text-sky-200/70 uppercase ${compact ? "text-[13px]" : "text-[15px]"}`}>{label}</p>
        <div className={`truncate leading-tight font-bold ${compact ? "text-[23px]" : "text-[27px]"}`}>{children}</div>
      </div>
    </div>
  );
}

function Line({ icon: Icon, children, className = "" }: { icon: LucideIcon; children: ReactNode; className?: string }) {
  return (
    <p className={`flex min-w-0 items-center gap-3 ${className}`}>
      <Icon className="size-6 shrink-0 text-gold-400" aria-hidden="true" />
      <span className="truncate">{children}</span>
    </p>
  );
}

function TarawihCard({ t, step, variant }: { t: NightTarawih<DisplayTarawih>; step: number; variant: Variant }) {
  const compact = variant === "compact";
  return (
    <div
      className={`rise flex min-h-0 flex-col overflow-hidden rounded-[28px] ${
        compact ? "tile flex-auto justify-center gap-2.5 px-7 py-6" : "card-ungu relative justify-center gap-4 p-8"
      }`}
      style={delay(step)}
    >
      <p className={`flex items-center gap-3 font-extrabold text-gold-400 ${compact ? "text-[20px]" : "text-[22px]"}`}>
        <MoonStar className="size-6" aria-hidden="true" />
        Tarawih malam ini{t.night ? ` · malam ke-${t.night}` : ""}
      </p>
      {t.imam && (
        <Row icon={UserRound} label="Imam" compact={compact}>
          {t.imam}
        </Row>
      )}
      {t.presenter && (
        <Row icon={Mic2} label="Penceramah" photo={{ name: t.presenter.name, src: t.presenter.photo }} compact={compact}>
          {t.presenter.name}
        </Row>
      )}
      {t.theme &&
        (compact ? (
          <Line icon={BookOpenText} className="text-[20px] text-sky-100/85">
            Tema: {t.theme}
          </Line>
        ) : (
          <Row icon={BookOpenText} label="Tema">
            {t.theme}
          </Row>
        ))}
    </div>
  );
}

type IedInfo = NonNullable<RamadhanView<DisplayTarawih>["ied"]>;

function IedCompact({ ied, step }: { ied: IedInfo; step: number }) {
  return (
    <div className="tile rise flex min-h-0 flex-auto flex-col justify-center gap-3 overflow-hidden rounded-[28px] px-7 py-6" style={delay(step)}>
      <div className="flex min-w-0 items-center gap-3">
        <Chip icon={Sparkles} tone="gold">
          {countdown(ied.daysLeft)}
        </Chip>
        <p className="truncate text-[24px] font-extrabold">Sholat {IED_LABELS[ied.kind]}</p>
      </div>
      <div className="flex flex-col gap-1 text-[20px] text-sky-100/85">
        <Line icon={CalendarDays} className="font-semibold text-sky-50">
          {dayDate(ied.date)}
          {ied.time ? ` · ${ied.time} WITA` : ""}
        </Line>
        {ied.location && <Line icon={MapPin}>{ied.location}</Line>}
        {ied.khatib && (
          <Line icon={Mic2}>
            Khatib: <b className="font-bold text-sky-50">{ied.khatib}</b>
          </Line>
        )}
        {ied.imam && (
          <Line icon={UserRound}>
            Imam: <b className="font-bold text-sky-50">{ied.imam}</b>
          </Line>
        )}
      </div>
    </div>
  );
}

function IedCard({ ied, step, variant }: { ied: IedInfo; step: number; variant: Variant }) {
  if (variant === "compact") return <IedCompact ied={ied} step={step} />;
  return (
    <div className="card-ungu rise relative flex min-h-0 flex-col justify-between gap-4 overflow-hidden rounded-[28px] p-8" style={delay(step)}>
      <div className="relative">
        <Chip icon={Sparkles} tone="gold">
          {countdown(ied.daysLeft)}
        </Chip>
        <h3 className="mt-6 text-[56px] leading-[1.05] font-extrabold tracking-[-0.025em]">Sholat {IED_LABELS[ied.kind]}</h3>
        <Line icon={CalendarDays} className="mt-4 text-[28px] font-semibold text-sky-100/90">
          {dayDate(ied.date)}
          {ied.time ? ` · ${ied.time} WITA` : ""}
        </Line>
        {ied.location && (
          <Line icon={MapPin} className="mt-2 text-[24px] text-sky-100/80">
            {ied.location}
          </Line>
        )}
      </div>
      {(ied.khatib || ied.imam) && (
        <div className={`relative grid gap-4 ${variant === "wide" ? "grid-cols-2" : "grid-cols-1"}`}>
          {ied.khatib && (
            <Row icon={Mic2} label="Khatib">
              {ied.khatib}
            </Row>
          )}
          {ied.imam && (
            <Row icon={UserRound} label="Imam">
              {ied.imam}
            </Row>
          )}
        </div>
      )}
      {ied.note && <p className="relative line-clamp-2 text-[22px] text-sky-100/80">{ied.note}</p>}
    </div>
  );
}

function UpcomingList({ items, step }: { items: NightTarawih<DisplayTarawih>[]; step: number }) {
  return (
    <div className="tile rise flex min-h-0 flex-auto flex-col rounded-[28px] px-7 pt-6 pb-2" style={delay(step)}>
      <p className="flex items-center gap-3 text-[22px] font-extrabold text-gold-400">
        <Clock3 className="size-6" aria-hidden="true" />
        Petugas tarawih berikutnya
      </p>
      <ul className="mt-2 flex min-h-0 flex-1 flex-col">
        {items.map((t) => (
          <li key={t.id} className="flex min-h-0 flex-1 items-center gap-4 border-b border-white/10 py-2 last:border-0">
            <span className="w-[150px] shrink-0 text-[19px] leading-tight font-bold text-sky-200/85">
              {t.night ? `Malam ke-${t.night}` : dayDate(t.date)}
              {t.night && <span className="block text-[16px] font-medium text-sky-200/60">{formatDateStr(t.date)}</span>}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[24px] leading-tight font-bold">{t.imam || t.presenter?.name || "Belum diisi"}</span>
              {t.imam && t.presenter && <span className="block truncate text-[18px] text-sky-200/70">Ceramah: {t.presenter.name}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Info puasa (imsak/berbuka), petugas tarawih, dan sholat Ied; hanya tampil di musimnya. */
export function RamadhanPanel({ view, now }: { view: RamadhanView<DisplayTarawih> | null; now: number }) {
  if (!view) return null;
  const { fasting, tonight, upcoming, ied } = view;

  // Kartu utama di kiri, sisanya bertumpuk di kanan (maksimal dua).
  type Block = "fasting" | "tonight" | "ied" | "upcoming";
  let main: Block | undefined = fasting ? "fasting" : ied ? "ied" : tonight ? "tonight" : undefined;
  const side: Block[] = [];
  if (tonight && main !== "tonight") side.push("tonight");
  if (ied && main !== "ied") side.push("ied");
  if (side.length < 2 && upcoming.length) side.push("upcoming");
  main ??= side.shift();
  if (!main) return null;
  const wide = side.length === 0;

  const render = (block: Block, step: number, variant: Variant): ReactNode => {
    switch (block) {
      case "fasting":
        return fasting && <FastingCard key={block} fasting={fasting} now={now} />;
      case "tonight":
        return tonight && <TarawihCard key={block} t={tonight} step={step} variant={variant} />;
      case "ied":
        return ied && <IedCard key={block} ied={ied} step={step} variant={variant} />;
      case "upcoming":
        return <UpcomingList key={block} items={upcoming.slice(0, tonight ? 2 : 3)} step={step} />;
    }
  };

  const title = view.ramadhanYear ? `Ramadhan ${view.ramadhanYear} H` : ied ? IED_LABELS[ied.kind] : "Ramadhan";
  const meta = fasting
    ? fasting.when === "today"
      ? `Hari ke-${fasting.day}`
      : `Besok hari ke-${fasting.day}`
    : ied
      ? countdown(ied.daysLeft)
      : undefined;

  return (
    <div className="flex size-full flex-col p-10">
      <PanelHeader icon={MoonStar} title={title} meta={meta} tone="ungu" />
      <div className={`grid min-h-0 flex-1 gap-5 ${wide ? "grid-cols-1" : "grid-cols-[1fr_1.05fr]"}`}>
        {render(main, 1, wide ? "wide" : "large")}
        {!wide && <div className="flex min-h-0 flex-col gap-5">{side.map((block, i) => render(block, i + 2, "compact"))}</div>}
      </div>
    </div>
  );
}
