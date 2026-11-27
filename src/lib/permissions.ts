export const ROLES = ["admin", "bendahara", "konten", "operator"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  bendahara: "Bendahara",
  konten: "Konten",
  operator: "Operator TV",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  admin: "Semua menu, pengaturan, pengguna, dan riwayat aktivitas",
  bendahara: "Kas dan infak",
  konten: "Konten layar, urutan tampilan, dan remote TV",
  operator: "Remote TV dan urutan tampilan",
};

export type Permission = "remote" | "playlist" | "content" | "finance" | "upload" | "settings" | "users" | "audit";

export type SessionUser = { id: number; username: string; name: string; role: Role };

const MATRIX: Record<Role, readonly Permission[]> = {
  admin: ["remote", "playlist", "content", "finance", "upload", "settings", "users", "audit"],
  bendahara: ["finance"],
  konten: ["remote", "playlist", "content", "upload"],
  operator: ["remote", "playlist"],
};

export function can(role: Role, permission: Permission): boolean {
  return MATRIX[role].includes(permission);
}

/** Izin yang dibutuhkan untuk membaca/mengubah resource CRUD generik. */
export const RESOURCE_PERMISSION: Record<string, Permission> = {
  announcements: "content",
  kajian: "content",
  jumat: "content",
  verses: "content",
  slides: "content",
  finance: "finance",
  finance_categories: "finance",
  playlist: "playlist",
};

const ROUTE_PERMISSION: [RegExp, Permission][] = [
  [/^\/admin$/, "remote"],
  [/^\/admin\/playlist/, "playlist"],
  [/^\/admin\/kas/, "finance"],
  [/^\/admin\/(pengumuman|kajian|jumat|ayat|slide)/, "content"],
  [/^\/admin\/pengguna/, "users"],
  [/^\/admin\/riwayat/, "audit"],
];

/** Izin halaman panel; null berarti semua pengguna yang login boleh membuka. */
export function routePermission(pathname: string): Permission | null {
  return ROUTE_PERMISSION.find(([re]) => re.test(pathname))?.[1] ?? null;
}

/** Halaman awal setelah login sesuai peran. */
export function homeFor(role: Role): string {
  return can(role, "remote") ? "/admin" : can(role, "finance") ? "/admin/kas" : "/admin/pengaturan";
}

export type UserSummary = { id: number; role: Role; active: boolean };

/**
 * Cegah panel terkunci: admin aktif terakhir tidak boleh diturunkan perannya atau dinonaktifkan,
 * dan pengguna tidak boleh menonaktifkan akunnya sendiri.
 */
export function guardUserChange(
  users: UserSummary[],
  actorId: number,
  targetId: number,
  next: { role?: Role; active?: boolean },
): string | null {
  const target = users.find((u) => u.id === targetId);
  if (!target) return "Pengguna tidak ditemukan";
  if (targetId === actorId && next.active === false) return "Tidak bisa menonaktifkan akun sendiri";
  const staysAdmin = (next.role ?? target.role) === "admin" && (next.active ?? target.active);
  if (target.role === "admin" && target.active && !staysAdmin) {
    const otherAdmins = users.filter((u) => u.id !== targetId && u.role === "admin" && u.active);
    if (otherAdmins.length === 0) return "Harus ada minimal satu admin aktif";
  }
  return null;
}
