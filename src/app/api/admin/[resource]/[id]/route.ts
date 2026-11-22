import { NextResponse } from "next/server";
import { deleteResource, isResource, RESOURCES, updateResource } from "@/lib/resources";
import { handleError, jsonError, requireAdmin } from "@/lib/api";
import { publish } from "@/lib/realtime";

type Ctx = RouteContext<"/api/admin/[resource]/[id]">;

async function parse(ctx: Ctx) {
  const { resource, id } = await ctx.params;
  const n = Number(id);
  if (!isResource(resource) || !Number.isInteger(n)) return null;
  return { resource, id: n };
}

export async function PUT(request: Request, ctx: Ctx) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const p = await parse(ctx);
  if (!p) return jsonError("Tidak ditemukan", 404);
  try {
    const data = RESOURCES[p.resource].schema.partial().parse(await request.json());
    const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
    await updateResource(p.resource, p.id, clean);
    publish({ type: "update", topics: [p.resource] });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const p = await parse(ctx);
  if (!p || p.resource === "playlist") return jsonError("Tidak ditemukan", 404);
  try {
    await deleteResource(p.resource, p.id);
    publish({ type: "update", topics: [p.resource] });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
