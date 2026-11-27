"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { UsersRound } from "lucide-react";
import type { DisplayState } from "@/lib/types";
import { Avatar, PanelHeader } from "./ui";

const delay = (step: number): CSSProperties => ({ animationDelay: `${step * 100}ms` });

export const BOARD_PAGE_SIZE = 8;

export function boardPages(count: number): number {
  return Math.max(1, Math.ceil(count / BOARD_PAGE_SIZE));
}

/** Foto dan jabatan pengurus; lebih dari delapan orang ditampilkan bergantian per halaman. */
export function PengurusPanel({ state, perPageSec }: { state: DisplayState; perPageSec: number }) {
  const members = state.board;
  const pages = boardPages(members.length);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (pages <= 1) return;
    const iv = setInterval(() => setPage((p) => (p + 1) % pages), perPageSec * 1000);
    return () => clearInterval(iv);
  }, [pages, perPageSec]);

  const current = page % pages;
  const shown = members.slice(current * BOARD_PAGE_SIZE, (current + 1) * BOARD_PAGE_SIZE);
  if (!shown.length) return null;
  // Satu baris berisi foto besar bila orangnya sedikit; selebihnya dua baris berisi empat kartu.
  const single = members.length <= 4;
  const cols = single ? Math.max(2, shown.length) : 4;

  return (
    <div className="flex size-full flex-col p-10">
      <PanelHeader
        icon={UsersRound}
        title="Pengurus masjid"
        meta={pages > 1 ? `${current + 1} / ${pages}` : `${members.length} pengurus`}
      />
      <ul
        key={current}
        className={`grid min-h-0 flex-1 gap-5 ${single ? "grid-rows-1" : "grid-rows-2"}`}
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {shown.map((m, idx) => (
          <li
            key={m.id}
            className={`rise flex min-h-0 flex-col items-center justify-center rounded-[28px] px-5 text-center ${
              idx === 0 && current === 0 ? "card-brand" : "tile"
            }`}
            style={delay(idx + 1)}
          >
            <Avatar
              name={m.name}
              photo={m.photo || null}
              className={single ? "size-52 rounded-[36px] text-[64px]" : "size-32 rounded-[28px] text-[44px]"}
            />
            <p className={`mt-5 line-clamp-2 leading-tight font-bold ${single ? "text-[34px]" : "text-[25px]"}`}>{m.name}</p>
            {m.position && (
              <p className={`mt-1.5 line-clamp-2 font-semibold text-gold-400 ${single ? "text-[24px]" : "text-[19px]"}`}>
                {m.position}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
