import { z } from "zod";
import { query } from "./db";
import { ROLES, type Role, type UserSummary } from "./permissions";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9._-]{3,32}$/, "Nama pengguna 3–32 karakter: huruf kecil, angka, titik, minus, atau garis bawah");

export const passwordSchema = z
  .string()
  .min(8, "Password minimal 8 karakter")
  .max(128, "Password maksimal 128 karakter");

const nameSchema = z.string().trim().min(1, "Nama wajib diisi").max(80);
const roleSchema = z.enum(ROLES, { error: "Peran tidak dikenal" });

export const createUserSchema = z.object({
  username: usernameSchema,
  name: nameSchema,
  role: roleSchema,
  password: passwordSchema,
});

export const updateUserSchema = z.object({
  name: nameSchema.optional(),
  role: roleSchema.optional(),
  active: z.boolean().optional(),
  password: passwordSchema.optional(),
});

export type UserRow = {
  id: number;
  username: string;
  name: string;
  role: Role;
  active: boolean;
  createdAt: string;
  lastLoginAt: string | null;
};

export type AuditEntry = { id: number; at: string; username: string; name: string; action: string; target: string; detail: string };

export async function listUsers(): Promise<UserRow[]> {
  return query<UserRow>(
    `SELECT id, username, name, role, active, created_at AS "createdAt", last_login_at AS "lastLoginAt"
     FROM users ORDER BY active DESC, role, username`,
  );
}

export async function userSummaries(): Promise<UserSummary[]> {
  return query<UserSummary>("SELECT id, role, active FROM users");
}

export function isUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "23505";
}
