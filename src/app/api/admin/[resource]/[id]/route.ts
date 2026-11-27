import { NextResponse } from "next/server";
import { deleteResource, describeRecord, getResource, isResource, RESOURCES, updateResource } from "@/lib/resources";
import { authorize, handleError, jsonError } from "@/lib/api";
import { audit } from "@/lib/auth";
import { RESOURCE_PERMISSION } from "@/lib/permissions";
import { publish } from "@/lib/realtime";

type Ctx = RouteContext<"/api/admin/[resource]/[id]">;

async function parse(ctx: Ctx) {
  const { resource, id } = await ctx.params;
  const n = Number(id);
  if (!isResource(resource) || !Number.isInteger(n)) return null;
  return { resource, id: n };
}

export async function PUT(request: Request, ctx: Ctx) {
  const p = await parse(ctx);
  if (!p) return jsonError("Tidak ditemukan", 404);
  const user = await authorize(RESOURCE_PERMISSION[p.resource]);
  if (user instanceof NextResponse) return user;
  try {
    const data = RESOURCES[p.resource].schema.partial().parse(await request.json());
    const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
    await updateResource(p.resource, p.id, clean);
    publish({ type: "update", topics: [p.resource] });
    const label = describeRecord(p.resource, await getResource(p.resource, p.id));
    await audit(user, "update", `${p.resource}:${p.id}`, [label, `ubah: ${Object.keys(clean).join(", ")}`].filter(Boolean).join(" — "));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const p = await parse(ctx);
  if (!p || p.resource === "playlist") return jsonError("Tidak ditemukan", 404);
  const user = await authorize(RESOURCE_PERMISSION[p.resource]);
  if (user instanceof NextResponse) return user;
  try {
    const label = describeRecord(p.resource, await getResource(p.resource, p.id));
    await deleteResource(p.resource, p.id);
    publish({ type: "update", topics: [p.resource] });
    await audit(user, "delete", `${p.resource}:${p.id}`, label);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
