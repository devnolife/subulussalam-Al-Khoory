import { NextResponse } from "next/server";
import { createResource, describeRecord, isResource, listResource, RESOURCES } from "@/lib/resources";
import { authorize, handleError, jsonError } from "@/lib/api";
import { audit } from "@/lib/auth";
import { RESOURCE_PERMISSION } from "@/lib/permissions";
import { publish } from "@/lib/realtime";
import { parseDisplayId } from "@/lib/types";

/** GET /api/admin/playlist?tv=2 = urutan tampilan satu layar TV saja. */
export async function GET(request: Request, ctx: RouteContext<"/api/admin/[resource]">) {
  const { resource } = await ctx.params;
  if (!isResource(resource)) return jsonError("Resource tidak dikenal", 404);
  const user = await authorize(RESOURCE_PERMISSION[resource]);
  if (user instanceof NextResponse) return user;
  try {
    const tvParam = resource === "playlist" ? new URL(request.url).searchParams.get("tv") : null;
    const tv = tvParam === null ? null : parseDisplayId(tvParam);
    if (tvParam !== null && !tv) return jsonError("Layar TV tidak dikenal", 404);
    return NextResponse.json(await listResource(resource, tv ? `WHERE display_id = ${tv}` : ""));
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: Request, ctx: RouteContext<"/api/admin/[resource]">) {
  const { resource } = await ctx.params;
  if (!isResource(resource) || resource === "playlist") return jsonError("Resource tidak dikenal", 404);
  const user = await authorize(RESOURCE_PERMISSION[resource]);
  if (user instanceof NextResponse) return user;
  try {
    const data = RESOURCES[resource].schema.parse(await request.json());
    const row = await createResource(resource, data);
    publish({ type: "update", topics: [resource] });
    await audit(user, "create", `${resource}:${row?.id ?? ""}`, describeRecord(resource, data));
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
