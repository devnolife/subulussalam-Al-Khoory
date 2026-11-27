import { NextResponse } from "next/server";
import { createResource, describeRecord, isResource, listResource, RESOURCES } from "@/lib/resources";
import { authorize, handleError, jsonError } from "@/lib/api";
import { audit } from "@/lib/auth";
import { RESOURCE_PERMISSION } from "@/lib/permissions";
import { publish } from "@/lib/realtime";

export async function GET(_req: Request, ctx: RouteContext<"/api/admin/[resource]">) {
  const { resource } = await ctx.params;
  if (!isResource(resource)) return jsonError("Resource tidak dikenal", 404);
  const user = await authorize(RESOURCE_PERMISSION[resource]);
  if (user instanceof NextResponse) return user;
  try {
    return NextResponse.json(await listResource(resource));
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
