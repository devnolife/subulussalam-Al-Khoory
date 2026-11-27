import { NextResponse } from "next/server";
import { authorize, handleError, jsonError } from "@/lib/api";
import { audit } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import {
  boardTable,
  DATED_EXPORTS,
  exportFilename,
  financeTable,
  isDateStr,
  isExportable,
  jumatTable,
  kajianTable,
  tarawihTable,
  type ExportName,
  type Range,
  type Table,
} from "@/lib/export";
import { RESOURCE_PERMISSION } from "@/lib/permissions";
import { listResource } from "@/lib/resources";
import { witaDateStr } from "@/lib/time";
import type { BoardMember, FinanceCategory, FinanceEntry, Jumat, Kajian, Speaker, Tarawih } from "@/lib/types";

/** Nama pembicara terbaru per id; data jadwal hanya menyimpan salinan nama saat disimpan. */
async function speakerNames(): Promise<(id: number | null, fallback: string) => string> {
  const names = new Map((await listResource<Speaker>("speakers")).map((s) => [s.id, s.name]));
  return (id, fallback) => (id !== null && names.get(id)) || fallback;
}

async function buildTable(name: ExportName, range: Range): Promise<Table> {
  switch (name) {
    case "finance": {
      const [entries, categories] = await Promise.all([
        listResource<FinanceEntry>("finance"),
        listResource<FinanceCategory>("finance_categories"),
      ]);
      return financeTable(entries, categories, range);
    }
    case "jumat": {
      const [list, nameOf] = await Promise.all([listResource<Jumat>("jumat"), speakerNames()]);
      return jumatTable(list.map((j) => ({ ...j, khatib: nameOf(j.khatibSpeakerId, j.khatib) })), range);
    }
    case "tarawih": {
      const [list, nameOf] = await Promise.all([listResource<Tarawih>("tarawih"), speakerNames()]);
      return tarawihTable(list.map((t) => ({ ...t, speaker: nameOf(t.speakerId, t.speaker) })), range);
    }
    case "kajian": {
      const [list, nameOf] = await Promise.all([listResource<Kajian>("kajian"), speakerNames()]);
      return kajianTable(list.map((k) => ({ ...k, speaker: nameOf(k.speakerId, k.speaker) })));
    }
    case "board_members":
      return boardTable(await listResource<BoardMember>("board_members"));
  }
}

/** GET /api/admin/export/{resource}?from=YYYY-MM-DD&to=YYYY-MM-DD → file CSV. */
export async function GET(request: Request, ctx: RouteContext<"/api/admin/export/[resource]">) {
  const { resource } = await ctx.params;
  if (!isExportable(resource)) return jsonError("Data ini tidak bisa diekspor", 404);
  const user = await authorize(RESOURCE_PERMISSION[resource]);
  if (user instanceof NextResponse) return user;

  const params = new URL(request.url).searchParams;
  const range: Range = {};
  if (DATED_EXPORTS.includes(resource)) {
    for (const key of ["from", "to"] as const) {
      const value = params.get(key);
      if (!value) continue;
      if (!isDateStr(value)) return jsonError(`Tanggal "${key}" harus berformat YYYY-MM-DD`, 422);
      range[key] = value;
    }
    if (range.from && range.to && range.from > range.to) return jsonError("Tanggal awal melewati tanggal akhir", 422);
  }

  try {
    const { headers, rows } = await buildTable(resource, range);
    const filename = exportFilename(resource, range, witaDateStr(Date.now()));
    await audit(user, "export", resource, `${filename} · ${rows.length} baris`);
    return new Response(toCsv(headers, rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
