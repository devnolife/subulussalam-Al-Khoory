"use client";

import { useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
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
    ghost: "bg-white/[0.07] text-white ring-1 ring-white/10 hover:bg-white/12",
    danger: "bg-bata-700/35 text-bata-200 ring-1 ring-bata-400/40 hover:bg-bata-700/55",
  }[variant];
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-bold transition-[scale,filter,background-color] duration-150 active:scale-[0.96] disabled:opacity-50 ${styles} ${className}`}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card rounded-[24px] p-4 ${className}`}>{children}</div>;
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.02em]">{title}</h1>
        {description && <p className="mt-1 text-sm text-sky-200/70">{description}</p>}
      </div>
      {action}
    </div>
  );
}

const inputCls =
  "w-full rounded-2xl bg-navy-950/70 px-4 py-3 text-base text-white ring-1 ring-white/10 outline-none placeholder:text-white/30 focus:ring-2 focus:ring-gold-400";

export function Field({ label, help, children }: { label: string; help?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-white/80">{label}</span>
      {children}
      {help && <span className="mt-1 block text-xs text-white/45">{help}</span>}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

export function Select({ options, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[] }) {
  return (
    <select {...props} className={inputCls}>
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
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? "bg-royal-600" : "bg-white/15"}`}>
        <span className={`absolute top-1 size-5 rounded-full shadow transition-[left] ${checked ? "left-6 bg-gold-400" : "left-1 bg-white"}`} />
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
  const pick = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await uploadImage(file, kind));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };
  return (
    <div>
      <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
      {value ? (
        <div className="relative overflow-hidden rounded-xl ring-1 ring-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="max-h-60 w-full bg-black/30 object-contain" />
          <div className="absolute top-2 right-2 flex gap-2">
            <Button type="button" variant="ghost" className="bg-black/60 backdrop-blur" onClick={() => ref.current?.click()} loading={busy}>
              Ganti
            </Button>
            <Button type="button" variant="ghost" className="bg-black/60 backdrop-blur" onClick={() => onChange(null)} aria-label="Hapus gambar">
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
    </div>
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal aria-label={title}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="animate-panel-in relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-navy-900 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] ring-1 ring-white/10 sm:rounded-[28px]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">{title}</h2>
          <button onClick={onClose} className="grid size-10 place-items-center rounded-full bg-white/5" aria-label="Tutup">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="rounded-[24px] border border-dashed border-white/15 p-8 text-center text-sm text-sky-200/60">{children}</div>;
}
