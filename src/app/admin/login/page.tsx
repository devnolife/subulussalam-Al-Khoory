"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { SunEmblem } from "@/components/display/SunEmblem";
import { api } from "@/components/admin/api";
import { Button } from "@/components/admin/ui";

export default function LoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api("/api/auth/login", { method: "POST", body: { pin } });
      router.replace("/admin");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="scene flex min-h-dvh items-center justify-center p-6">
      <form onSubmit={submit} className="card w-full max-w-sm rounded-[32px] p-7 text-center">
        <span className="card-brand mx-auto grid size-20 place-items-center rounded-[26px] text-white">
          <SunEmblem className="size-12" />
        </span>
        <h1 className="mt-6 text-2xl font-extrabold tracking-[-0.02em]">Panel pengurus masjid</h1>
        <p className="mt-1.5 text-sm text-sky-200/70">Masukkan kode unik untuk mengelola layar</p>
        <div className="relative mt-8">
          <KeyRound className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-gold-400" aria-hidden="true" />
          <input
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="••••••"
            aria-label="Kode unik"
            className="w-full rounded-2xl bg-navy-950/70 py-4 pr-4 pl-12 text-center text-2xl tracking-[0.4em] ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-gold-400"
          />
        </div>
        {error && (
          <p role="alert" className="mt-3 text-sm text-rose-300">
            {error}
          </p>
        )}
        <Button type="submit" loading={loading} disabled={!pin} className="mt-5 w-full py-3.5 text-base">
          Masuk
        </Button>
      </form>
    </main>
  );
}
