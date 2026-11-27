import { NextResponse } from "next/server";
import { authorize, handleError } from "@/lib/api";
import { query } from "@/lib/db";
import type { AuditEntry } from "@/lib/users";

const PAGE = 50;

/** Riwayat aktivitas terbaru, halaman berikutnya lewat `?before=<id>`. */
export async function GET(request: Request) {
  const user = await authorize("audit");
  if (user instanceof NextResponse) return user;
  try {
    const before = Number(new URL(request.url).searchParams.get("before"));
    const rows = await query<AuditEntry & { id: string }>(
      `SELECT a.id, a.at, a.username, COALESCE(u.name, '') AS name, a.action, a.target, a.detail
       FROM audit_log a LEFT JOIN users u ON u.id = a.user_id
       WHERE ($1::bigint IS NULL OR a.id < $1) ORDER BY a.id DESC LIMIT ${PAGE + 1}`,
      [Number.isSafeInteger(before) && before > 0 ? before : null],
    );
    const items = rows.slice(0, PAGE).map((r) => ({ ...r, id: Number(r.id) }));
    return NextResponse.json({ items, nextBefore: rows.length > PAGE ? items[items.length - 1].id : null });
  } catch (e) {
    return handleError(e);
  }
}
