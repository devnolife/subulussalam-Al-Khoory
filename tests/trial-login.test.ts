import { describe, expect, it, vi } from "vitest";
import { trialLoginValues } from "../src/components/admin/trial-login";

function form(username: string, password: string) {
  const data = new FormData();
  data.set("username", username);
  data.set("password", password);
  return data;
}

describe("masuk cepat akun uji", () => {
  it("menggunakan isi otomatis akun yang dipilih tanpa membuka pemilih sandi", async () => {
    const pick = vi.fn();
    expect(await trialLoginValues("operator", form(" Operator ", "isian-uji"), pick)).toEqual({ username: "operator", password: "isian-uji" });
    expect(pick).not.toHaveBeenCalled();
  });

  it("saat berpindah peran hanya memakai sandi tersimpan milik akun tujuan", async () => {
    const data = form("admin", "isian-lama");
    const pick = async () => ({ type: "password", id: "Konten", password: "tersimpan-uji" });
    expect(await trialLoginValues("konten", data, pick)).toEqual({ username: "konten", password: "tersimpan-uji" });
    expect(await trialLoginValues("bendahara", data, pick)).toBeNull();
  });

  it("meminta isian manual bila pemilih tidak tersedia, dibatalkan, atau tidak memberikan sandi", async () => {
    const data = form("admin", "");
    expect(await trialLoginValues("admin", data, null)).toBeNull();
    expect(await trialLoginValues("admin", data, async () => null)).toBeNull();
    expect(await trialLoginValues("admin", data, async () => ({ type: "public-key", id: "admin" }))).toBeNull();
  });
});
