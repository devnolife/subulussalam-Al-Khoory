"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, UserRound } from "lucide-react";
import { SunEmblem } from "@/components/display/SunEmblem";
import { api } from "@/components/admin/api";
import { Button } from "@/components/admin/ui";

const inputCls =
  "w-full rounded-2xl bg-navy-950/70 py-3.5 pr-4 pl-12 text-base ring-1 ring-white/10 outline-none placeholder:text-white/30 focus:ring-2 focus:ring-gold-400";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { home } = await api<{ home: string }>("/api/auth/login", { method: "POST", body: { username, password } });
      router.replace(home);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setPassword("");
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
        <p className="mt-1.5 text-sm text-sky-200/70">Masuk dengan akun pengurus Anda</p>
        <div className="mt-8 space-y-3 text-left">
          <div className="relative">
            <UserRound className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-gold-400" aria-hidden="true" />
            <input
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nama pengguna"
              aria-label="Nama pengguna"
              className={inputCls}
            />
          </div>
          <div className="relative">
            <KeyRound className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-gold-400" aria-hidden="true" />
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              aria-label="Password"
              className={inputCls}
            />
          </div>
        </div>
        {error && (
          <p role="alert" className="mt-3 text-sm text-rose-300">
            {error}
          </p>
        )}
        <Button type="submit" loading={loading} disabled={!username.trim() || !password} className="mt-5 w-full py-3.5 text-base">
          Masuk
        </Button>
      </form>
    </main>
  );
}
