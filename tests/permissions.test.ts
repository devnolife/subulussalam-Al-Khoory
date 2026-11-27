import { describe, expect, it } from "vitest";
import { can, guardUserChange, homeFor, RESOURCE_PERMISSION, routePermission, type UserSummary } from "../src/lib/permissions";
import { RESOURCES } from "../src/lib/resources";

describe("izin peran", () => {
  it("membatasi tiap peran pada menunya", () => {
    expect(can("admin", "users")).toBe(true);
    expect(can("bendahara", "finance")).toBe(true);
    expect(can("bendahara", "content")).toBe(false);
    expect(can("bendahara", "remote")).toBe(false);
    expect(can("konten", "content")).toBe(true);
    expect(can("konten", "finance")).toBe(false);
    expect(can("konten", "settings")).toBe(false);
    expect(can("operator", "remote")).toBe(true);
    expect(can("operator", "content")).toBe(false);
    expect(can("operator", "upload")).toBe(false);
  });

  it("setiap resource CRUD punya izin", () => {
    for (const name of Object.keys(RESOURCES)) expect(RESOURCE_PERMISSION[name], name).toBeDefined();
  });

  it("memetakan halaman panel ke izinnya", () => {
    expect(routePermission("/admin")).toBe("remote");
    expect(routePermission("/admin/kas")).toBe("finance");
    expect(routePermission("/admin/slide")).toBe("content");
    expect(routePermission("/admin/pengguna")).toBe("users");
    expect(routePermission("/admin/riwayat")).toBe("audit");
    expect(routePermission("/admin/konten")).toBeNull();
    expect(routePermission("/admin/pengaturan")).toBeNull();
  });

  it("mengarahkan ke halaman awal yang bisa dibuka", () => {
    expect(homeFor("admin")).toBe("/admin");
    expect(homeFor("operator")).toBe("/admin");
    expect(homeFor("bendahara")).toBe("/admin/kas");
  });
});

describe("guardUserChange", () => {
  const users: UserSummary[] = [
    { id: 1, role: "admin", active: true },
    { id: 2, role: "bendahara", active: true },
    { id: 3, role: "admin", active: false },
  ];

  it("menolak menurunkan atau menonaktifkan admin aktif terakhir", () => {
    expect(guardUserChange(users, 1, 1, { role: "konten" })).toMatch(/minimal satu admin/);
    expect(guardUserChange(users, 2, 1, { active: false })).toMatch(/minimal satu admin/);
  });

  it("menolak menonaktifkan akun sendiri", () => {
    expect(guardUserChange(users, 2, 2, { active: false })).toMatch(/akun sendiri/);
  });

  it("mengizinkan perubahan bila masih ada admin aktif lain", () => {
    const two = [...users, { id: 4, role: "admin" as const, active: true }];
    expect(guardUserChange(two, 4, 1, { role: "operator" })).toBeNull();
    expect(guardUserChange(users, 1, 2, { role: "konten", active: false })).toBeNull();
    expect(guardUserChange(users, 1, 3, { role: "konten" })).toBeNull();
  });

  it("menolak pengguna yang tidak ada", () => {
    expect(guardUserChange(users, 1, 99, {})).toBe("Pengguna tidak ditemukan");
  });
});
