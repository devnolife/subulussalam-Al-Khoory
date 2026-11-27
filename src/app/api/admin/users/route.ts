import { NextResponse } from "next/server";
import { audit, hashPassword } from "@/lib/auth";
import { authorize, handleError, jsonError } from "@/lib/api";
import { query } from "@/lib/db";
import { ROLE_LABELS } from "@/lib/permissions";
import { createUserSchema, isUniqueViolation, listUsers } from "@/lib/users";

export async function GET() {
  const user = await authorize("users");
  if (user instanceof NextResponse) return user;
  try {
    return NextResponse.json(await listUsers());
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: Request) {
  const user = await authorize("users");
  if (user instanceof NextResponse) return user;
  try {
    const data = createUserSchema.parse(await request.json());
    const rows = await query<{ id: number }>(
      "INSERT INTO users (username, name, role, password_hash) VALUES ($1, $2, $3, $4) RETURNING id",
      [data.username, data.name, data.role, await hashPassword(data.password)],
    );
    await audit(user, "user.create", `pengguna:${data.username}`, `${data.name} sebagai ${ROLE_LABELS[data.role]}`);
    return NextResponse.json(rows[0], { status: 201 });
  } catch (e) {
    if (isUniqueViolation(e)) return jsonError("Nama pengguna sudah dipakai", 409);
    return handleError(e);
  }
}
