import { NextResponse } from "next/server";
import { audit, createSession, setPassword } from "@/lib/auth";
import { authorize, handleError, jsonError } from "@/lib/api";
import { query } from "@/lib/db";
import { guardUserChange, ROLE_LABELS } from "@/lib/permissions";
import { updateUserSchema, userSummaries, type UserRow } from "@/lib/users";

/** Ubah nama/peran/status atau reset password pengguna. Akun tidak dihapus, cukup dinonaktifkan. */
export async function PUT(request: Request, ctx: RouteContext<"/api/admin/users/[id]">) {
  const actor = await authorize("users");
  if (actor instanceof NextResponse) return actor;
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return jsonError("Pengguna tidak ditemukan", 404);
  try {
    const data = updateUserSchema.parse(await request.json());
    const blocked = guardUserChange(await userSummaries(), actor.id, id, data);
    if (blocked) return jsonError(blocked, blocked === "Pengguna tidak ditemukan" ? 404 : 422);
    const [before] = await query<UserRow>("SELECT id, username, name, role, active FROM users WHERE id = $1", [id]);

    const changes: string[] = [];
    if (data.name !== undefined && data.name !== before.name) changes.push(`nama → ${data.name}`);
    if (data.role !== undefined && data.role !== before.role) changes.push(`peran → ${ROLE_LABELS[data.role]}`);
    if (data.active !== undefined && data.active !== before.active) changes.push(data.active ? "diaktifkan" : "dinonaktifkan");
    await query(
      "UPDATE users SET name = COALESCE($1, name), role = COALESCE($2, role), active = COALESCE($3, active) WHERE id = $4",
      [data.name ?? null, data.role ?? null, data.active ?? null, id],
    );
    if (data.active === false) await query("DELETE FROM sessions WHERE user_id = $1", [id]);
    if (data.password) {
      await setPassword(id, data.password);
      if (id === actor.id) await createSession(id);
      changes.push("password direset");
    }
    if (changes.length) await audit(actor, "user.update", `pengguna:${before.username}`, changes.join(", "));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
