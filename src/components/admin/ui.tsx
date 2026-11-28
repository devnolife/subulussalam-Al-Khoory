"use client";

import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { uploadImage, type ImageKind } from "./api";

export function Button({
  variant = "primary",
  loading,
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" | "gold"; loading?: boolean }) {
  const styles = {
    primary: "bg-royal-600 text-white hover:bg-royal-500",
    gold: "bg-gold-400 text-navy-950 hover:bg-gold-300",
    ghost: "border border-line bg-navy-800 text-white hover:bg-navy-700",
    danger: "border border-bata-400/45 bg-bata-800/35 text-bata-200 hover:bg-bata-700/55",
  }[variant];
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${styles} ${className}`}
    >
      {loading && <Loader2 aria-hidden="true" className="size-4 motion-safe:animate-spin" />}
      {children}
    </button>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`panel-box ${className}`}>{children}</div>;
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-5 sm:mb-7">
      <div className="min-w-0">
        <h1 className="text-3xl leading-tight font-bold tracking-[-0.04em] text-balance lg:text-4xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-muted">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function Field({ label, help, children }: { label: string; help?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-sky-200">{label}</span>
      {children}
      {help && <span className="mt-1.5 block text-xs leading-relaxed text-muted">{help}</span>}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`field-control ${props.className ?? ""}`} />;
}

export function FormError({ message }: { message: string }) {
  return message ? <p role="alert" className="rounded-lg bg-bata-800/35 px-3 py-2 text-sm text-bata-200">{message}</p> : null;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={`field-control ${props.className ?? ""}`} />;
}

export function Select({ options, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[] }) {
  return (
    <select {...props} className={`field-control ${props.className ?? ""}`}>
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-navy-900">
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-11 w-full items-center justify-between gap-3 text-left text-sm font-medium text-white/80"
    >
      {label}
      <span className={`relative h-6 w-11 shrink-0 rounded-full ring-1 ring-inset ${checked ? "bg-royal-600 ring-royal-400" : "bg-navy-800 ring-control-stroke"}`}>
        <span className={`absolute top-1 left-1 size-4 rounded-full bg-white motion-safe:transition-transform ${checked ? "translate-x-5" : ""}`} />
      </span>
    </button>
  );
}

export function ImageField({
  value,
  onChange,
  kind = "poster",
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  kind?: ImageKind;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pick = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      onChange(await uploadImage(file, kind));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };
  return (
    <div className="space-y-2">
      <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
      {value ? (
        <div className="relative overflow-hidden rounded-xl ring-1 ring-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="max-h-60 w-full bg-black/30 object-contain" />
          <div className="absolute top-2 right-2 flex gap-2">
            <Button type="button" variant="ghost" onClick={() => ref.current?.click()} loading={busy}>
              Ganti
            </Button>
            <Button type="button" variant="ghost" onClick={() => onChange(null)} aria-label="Hapus gambar">
              <X className="size-4" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="flex h-36 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/15 text-sm text-white/60 transition-colors hover:border-gold-400 hover:text-white"
        >
          {busy ? <Loader2 className="size-6 animate-spin" /> : <ImagePlus className="size-6" />}
          {busy ? "Mengunggah…" : "Pilih gambar dari galeri / kamera"}
        </button>
      )}
      <FormError message={error} />
    </div>
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none items-end justify-center bg-transparent text-inherit open:flex backdrop:bg-navy-950/85 sm:items-center sm:p-5"
    >
      <div className="panel-box max-h-[92dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-b-none p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-b-2xl sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3 border-b border-line pb-3">
          <h2 id={titleId} className="panel-heading">{title}</h2>
          <button type="button" onClick={onClose} className="grid size-11 shrink-0 place-items-center rounded-lg text-muted hover:bg-navy-800 hover:text-white" aria-label="Tutup">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-control-stroke bg-navy-900 px-5 py-8 text-center text-sm leading-relaxed text-muted">{children}</div>;
}
