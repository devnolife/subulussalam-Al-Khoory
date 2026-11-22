import { NextResponse } from "next/server";
import { createResource, isResource, listResource, RESOURCES } from "@/lib/resources";
import { handleError, jsonError, requireAdmin } from "@/lib/api";
import { publish } from "@/lib/realtime";

export async function GET(_req: Request, ctx: RouteContext<"/api/admin/[resource]">) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { resource } = await ctx.params;
  if (!isResource(resource)) return jsonError("Resource tidak dikenal", 404);
  try {
    return NextResponse.json(await listResource(resource));
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: Request, ctx: RouteContext<"/api/admin/[resource]">) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { resource } = await ctx.params;
  if (!isResource(resource) || resource === "playlist") return jsonError("Resource tidak dikenal", 404);
  try {
    const data = RESOURCES[resource].schema.parse(await request.json());
    const row = await createResource(resource, data);
    publish({ type: "update", topics: [resource] });
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
