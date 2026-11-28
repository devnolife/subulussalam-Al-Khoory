"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MosqueCover } from "@/components/MosqueCover";
import { PortalHeader } from "@/components/PortalHeader";
import { api } from "@/components/admin/api";
import { browserPasswordPicker, trialLoginValues } from "@/components/admin/trial-login";
import { Button, FormError } from "@/components/admin/ui";
import { ROLE_LABELS, ROLES, type Role } from "@/lib/permissions";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState<Role | "manual" | null>(null);
  const [hint, setHint] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const signIn = async (name: string, secret: string) => {
    const { home } = await api<{ home: string }>("/api/auth/login", { method: "POST", body: { username: name, password: secret } });
    router.replace(home);
    router.refresh();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    setPending("manual");
    setError("");
    setHint("");
    try {
      await signIn(username, password);
    } catch (err) {
      setError((err as Error).message);
      setPassword("");
    } finally {
      setPending(null);
    }
  };

  const quickLogin = async (role: Role) => {
    if (process.env.NODE_ENV !== "development" || pending || !formRef.current) return;
    const form = new FormData(formRef.current);
    setPending(role);
    setUsername(role);
    setPassword("");
    setError("");
    setHint("");
    try {
      const values = await trialLoginValues(role, form, browserPasswordPicker());
      if (values) {
        await signIn(values.username, values.password);
      } else {
        setHint(`Masukkan kata sandi untuk ${role}, atau gunakan isi otomatis dari peramban.`);
        passwordRef.current?.focus();
      }
    } catch (err) {
      if (err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "AbortError")) {
        setHint(`Akun tersimpan tidak dipilih. Anda tetap bisa masuk sebagai ${role} dengan kata sandi.`);
      } else if (err instanceof DOMException && (err.name === "NotSupportedError" || err.name === "SecurityError")) {
        setHint(`Peramban tidak bisa mengambil sandi tersimpan. Masukkan kata sandi untuk ${role}.`);
      } else {
        setError(err instanceof Error ? err.message : "Gagal masuk cepat. Gunakan formulir login.");
      }
      passwordRef.current?.focus();
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="scene mx-auto flex min-h-dvh max-w-7xl flex-col px-5 sm:px-8 lg:px-12">
      <PortalHeader />
      <main className="mx-auto my-auto w-full max-w-lg py-5 md:max-w-5xl md:py-10">
        <div className="grid overflow-hidden rounded-2xl bg-navy-900 md:grid-cols-[1.05fr_1fr] md:rounded-tl-[4rem]">
          <MosqueCover variant="login">
            <p className="max-w-[19ch] font-display text-2xl leading-tight font-bold md:text-4xl">
              Masjid Subulussalam <span className="whitespace-nowrap">Al-Khoory</span>
            </p>
          </MosqueCover>
          <form ref={formRef} method="post" onSubmit={submit} className="mx-auto w-full max-w-md self-center px-5 py-5 sm:px-8 sm:py-8">
            <h1 className="text-2xl leading-tight font-bold tracking-tight sm:text-3xl">Masuk ke panel pengurus</h1>
            {process.env.NODE_ENV === "development" && (
              <fieldset disabled={pending !== null} className="mt-5">
                <legend className="mb-2 text-sm font-semibold">Masuk cepat (uji coba)</legend>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map((role) => (
                    <Button key={role} type="button" variant="ghost" loading={pending === role} onClick={() => quickLogin(role)}>
                      {ROLE_LABELS[role]}
                    </Button>
                  ))}
                </div>
              </fieldset>
            )}
            <div className="mt-6 space-y-4">
              <div>
                <label htmlFor="username" className="mb-1.5 block text-sm font-semibold text-sky-200">Nama pengguna</label>
                <input
                  id="username"
                  name="username"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoFocus
                  readOnly={pending !== null}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="field-control"
                />
              </div>
              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-sky-200">Kata sandi</label>
                <input
                  type="password"
                  ref={passwordRef}
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  aria-describedby={hint ? "petunjuk-masuk-uji" : undefined}
                  readOnly={pending !== null}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field-control"
                />
              </div>
              {hint && <p id="petunjuk-masuk-uji" role="status" className="text-sm text-muted">{hint}</p>}
              <FormError message={error} />
            </div>
            <Button type="submit" loading={pending === "manual"} disabled={pending !== null || !username.trim() || !password} className="mt-6 w-full">
              Masuk
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
