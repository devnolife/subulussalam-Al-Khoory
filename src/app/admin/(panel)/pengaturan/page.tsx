"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/components/admin/api";
import { Button, Field, ImageField, PageHeader, Select, TextInput, Toggle } from "@/components/admin/ui";
import { FARDH_KEYS, PRAYER_KEYS, PRAYER_LABELS, type HijriMonthStart, type Settings } from "@/lib/types";
import { youtubeEmbedUrl } from "@/lib/youtube";
import { HIJRI_MONTHS, formatHijri, hijriCalendar, hijriParts } from "@/lib/hijri";

function Section({ title, desc, children, defaultOpen }: { title: string; desc: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.08]">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 p-4">
        <span>
          <span className="block font-semibold">{title}</span>
          <span className="block text-sm text-white/50">{desc}</span>
        </span>
        <ChevronDown className="size-5 shrink-0 text-white/40 transition group-open:rotate-180" />
      </summary>
      <div className="space-y-4 border-t border-white/5 p-4">{children}</div>
    </details>
  );
}

function NumberGrid<K extends string>({
  keys,
  labels,
  values,
  onChange,
  suffix,
}: {
  keys: readonly K[];
  labels: Record<K, string>;
  values: Record<K, number>;
  onChange: (k: K, v: number) => void;
  suffix: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {keys.map((k) => (
        <Field key={k} label={`${labels[k]} (${suffix})`}>
          <TextInput
            type="number"
            inputMode="numeric"
            value={String(values[k])}
            onChange={(e) => onChange(k, Number(e.target.value))}
          />
        </Field>
      ))}
    </div>
  );
}

export default function PengaturanPage() {
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [now] = useState(() => Date.now());

  useEffect(() => {
    api<Settings>("/api/admin/settings")
      .then(setS)
      .catch((e) => toast.error(e.message));
  }, []);

  if (!s) return <div className="h-64 animate-pulse rounded-2xl bg-white/5" />;

  const patch = <K extends keyof Settings>(key: K, value: Partial<Settings[K]>) =>
    setS((prev) =>
      prev ? { ...prev, [key]: typeof value === "object" && value !== null ? { ...(prev[key] as object), ...value } : value } : prev,
    );

  const save = async (key: keyof Settings | (keyof Settings)[]) => {
    const keys = Array.isArray(key) ? key : [key];
    setSaving(keys[0]);
    try {
      setS(await api<Settings>("/api/admin/settings", { method: "PUT", body: Object.fromEntries(keys.map((k) => [k, s[k]])) }));
      toast.success("Pengaturan tersimpan");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(null);
    }
  };

  const calendar = hijriCalendar(s);
  const setMonth = (index: number, value: Partial<HijriMonthStart>) =>
    setS({ ...s, hijriMonths: s.hijriMonths.map((m, i) => (i === index ? { ...m, ...value } : m)) });
  const addMonth = () => {
    const h = hijriParts(now, calendar);
    const month = h.month === 12 ? 1 : h.month + 1;
    const year = h.month === 12 ? h.year + 1 : h.year;
    setS({ ...s, hijriMonths: [...s.hijriMonths, { year, month, start: "" }] });
  };

  const savePin = async () => {
    setSaving("pin");
    try {
      await api("/api/admin/pin", { method: "PUT", body: { pin } });
      setPin("");
      toast.success("Kode unik berhasil diganti");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(null);
    }
  };

  const embedOk = !!youtubeEmbedUrl(s.kabah.youtubeUrl);
  const backupOk = !!youtubeEmbedUrl(s.kabah.backupUrl);

  return (
    <div className="space-y-3">
      <PageHeader title="Pengaturan" description="Identitas masjid, waktu sholat, dan lainnya." />

      <Section title="Identitas Masjid" desc="Nama, logo, dan alamat di header layar" defaultOpen>
        <Field label="Nama masjid">
          <TextInput value={s.mosque.name} onChange={(e) => patch("mosque", { name: e.target.value })} />
        </Field>
        <Field label="Subjudul">
          <TextInput value={s.mosque.subtitle} onChange={(e) => patch("mosque", { subtitle: e.target.value })} />
        </Field>
        <Field label="Alamat">
          <TextInput value={s.mosque.address} onChange={(e) => patch("mosque", { address: e.target.value })} />
        </Field>
        <Field label="Logo (opsional)" help="Jika kosong, dipakai lambang matahari bawaan.">
          <ImageField kind="logo" value={s.mosque.logo} onChange={(url) => patch("mosque", { logo: url })} />
        </Field>
        <Button className="w-full" loading={saving === "mosque"} onClick={() => save("mosque")}>
          Simpan identitas
        </Button>
      </Section>

      <Section title="Live Ka'bah" desc="Siaran langsung YouTube dari Makkah">
        <Field
          label="URL siaran utama"
          help="Link video live (youtube.com/watch?v=…, youtu.be/…) atau link channel (…/channel/UC…/live)."
        >
          <TextInput value={s.kabah.youtubeUrl} onChange={(e) => patch("kabah", { youtubeUrl: e.target.value })} />
        </Field>
        {!embedOk && s.kabah.youtubeUrl && <p className="text-sm text-rose-300">URL utama tidak dikenali.</p>}
        <Field
          label="URL siaran cadangan"
          help="Dipakai otomatis bila siaran utama error atau tidak mulai dalam 30 detik."
        >
          <TextInput value={s.kabah.backupUrl} onChange={(e) => patch("kabah", { backupUrl: e.target.value })} />
        </Field>
        {!backupOk && s.kabah.backupUrl && <p className="text-sm text-rose-300">URL cadangan tidak dikenali.</p>}
        <div>
          <Toggle label="Putar suara siaran" checked={s.kabah.sound} onChange={(v) => patch("kabah", { sound: v })} />
          <p className="text-xs text-white/45">
            Suara berhenti otomatis saat azan, iqamah, sholat, dan pengumuman darurat. Bila browser TV menahan suara,
            ketuk layar atau tekan tombol apa saja sekali.
          </p>
        </div>
        <Button className="w-full" loading={saving === "kabah"} onClick={() => save("kabah")}>
          Simpan
        </Button>
      </Section>

      <Section title="QRIS & Rekening Donasi" desc="Ditampilkan pada panel QRIS">
        <Field label="Gambar QRIS">
          <ImageField kind="qris" value={s.qris.image} onChange={(url) => patch("qris", { image: url })} />
        </Field>
        <Field label="Ajakan">
          <TextInput value={s.qris.note} onChange={(e) => patch("qris", { note: e.target.value })} />
        </Field>
        <Field label="Nama bank">
          <TextInput value={s.qris.bankName} onChange={(e) => patch("qris", { bankName: e.target.value })} placeholder="Bank Syariah Indonesia" />
        </Field>
        <Field label="Nomor rekening">
          <TextInput inputMode="numeric" value={s.qris.accountNo} onChange={(e) => patch("qris", { accountNo: e.target.value })} />
        </Field>
        <Field label="Atas nama">
          <TextInput value={s.qris.accountName} onChange={(e) => patch("qris", { accountName: e.target.value })} />
        </Field>
        <Button className="w-full" loading={saving === "qris"} onClick={() => save("qris")}>
          Simpan
        </Button>
      </Section>

      <Section title="Waktu Sholat & Iqamah" desc="Durasi adzan, iqamah, sholat, dan koreksi jadwal">
        <p className="text-sm font-semibold text-gold-400">Jeda adzan → iqamah</p>
        <NumberGrid
          keys={FARDH_KEYS}
          labels={PRAYER_LABELS}
          values={s.prayer.iqamahMin}
          suffix="menit"
          onChange={(k, v) => patch("prayer", { iqamahMin: { ...s.prayer.iqamahMin, [k]: v } })}
        />
        <p className="text-sm font-semibold text-gold-400">Lama layar &ldquo;sholat berlangsung&rdquo;</p>
        <NumberGrid
          keys={FARDH_KEYS}
          labels={PRAYER_LABELS}
          values={s.prayer.shalatMin}
          suffix="menit"
          onChange={(k, v) => patch("prayer", { shalatMin: { ...s.prayer.shalatMin, [k]: v } })}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Layar adzan (detik)">
            <TextInput type="number" value={String(s.prayer.adzanSec)} onChange={(e) => patch("prayer", { adzanSec: Number(e.target.value) })} />
          </Field>
          <Field label="Layar doa setelah adzan (detik)" help="0 = tanpa layar doa. Tidak tampil saat Jum'at.">
            <TextInput type="number" min={0} max={600} value={String(s.prayer.doaSec)} onChange={(e) => patch("prayer", { doaSec: Number(e.target.value) })} />
          </Field>
          <Field label="Khutbah+sholat Jum'at (menit)">
            <TextInput type="number" value={String(s.prayer.jumatMin)} onChange={(e) => patch("prayer", { jumatMin: Number(e.target.value) })} />
          </Field>
        </div>
        <p className="text-sm font-semibold text-gold-400">Koreksi jadwal (menit, boleh negatif)</p>
        <NumberGrid
          keys={PRAYER_KEYS}
          labels={PRAYER_LABELS}
          values={s.prayer.corrections}
          suffix="±"
          onChange={(k, v) => patch("prayer", { corrections: { ...s.prayer.corrections, [k]: v } })}
        />
        <Button className="w-full" loading={saving === "prayer"} onClick={() => save("prayer")}>
          Simpan waktu sholat
        </Button>
      </Section>

      <Section title="Kalender Hijriah" desc="Sesuaikan dengan keputusan Muhammadiyah">
        <p className="rounded-xl bg-white/5 p-3 text-sm">
          Hari ini: <span className="font-semibold text-gold-400">{formatHijri(now, calendar)}</span>
        </p>
        <Field label="Koreksi hari" help="Hanya dipakai bila tidak ada awal bulan di bawah yang berlaku.">
          <TextInput type="number" min={-3} max={3} value={String(s.hijriOffset)} onChange={(e) => setS({ ...s, hijriOffset: Number(e.target.value) })} />
        </Field>
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-gold-400">Awal bulan sesuai penetapan</p>
            <p className="text-xs text-white/50">
              Isi tanggal Masehi 1 Ramadhan, 1 Syawal, 1 Dzulhijjah, dan bulan lain sesuai maklumat. Tanggal Hijriah mengikuti
              penetapan ini mulai sehari sebelumnya sampai awal bulan berikutnya yang diisi, paling lama sekitar satu tahun.
            </p>
          </div>
          {s.hijriMonths.map((m, i) => (
            <div key={i} className="grid grid-cols-[1fr_5.5rem] gap-2 rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/[0.06]">
              <Field label="Bulan">
                <Select
                  value={String(m.month)}
                  onChange={(e) => setMonth(i, { month: Number(e.target.value) })}
                  options={HIJRI_MONTHS.map((label, idx) => ({ value: String(idx + 1), label }))}
                />
              </Field>
              <Field label="Tahun H">
                <TextInput type="number" inputMode="numeric" value={String(m.year)} onChange={(e) => setMonth(i, { year: Number(e.target.value) })} />
              </Field>
              <Field label="Tanggal 1 (Masehi)">
                <TextInput type="date" value={m.start} onChange={(e) => setMonth(i, { start: e.target.value })} />
              </Field>
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setS({ ...s, hijriMonths: s.hijriMonths.filter((_, idx) => idx !== i) })}
                >
                  Hapus
                </Button>
              </div>
            </div>
          ))}
          <Button variant="ghost" className="w-full" onClick={addMonth}>
            Tambah awal bulan
          </Button>
        </div>
        <Button
          className="w-full"
          disabled={s.hijriMonths.some((m) => !m.start)}
          loading={saving === "hijriOffset"}
          onClick={() => save(["hijriOffset", "hijriMonths"])}
        >
          Simpan
        </Button>
      </Section>

      <Section title="Lokasi" desc="Untuk jadwal sholat & cuaca">
        <Field label="Nama kota">
          <TextInput value={s.location.cityName} onChange={(e) => patch("location", { cityName: e.target.value })} />
        </Field>
        <Field label="ID kota Kemenag (myQuran)" help="Kota Makassar = 2622">
          <TextInput inputMode="numeric" value={s.location.kemenagCityId} onChange={(e) => patch("location", { kemenagCityId: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Latitude">
            <TextInput value={String(s.location.lat)} onChange={(e) => patch("location", { lat: e.target.value as unknown as number })} />
          </Field>
          <Field label="Longitude">
            <TextInput value={String(s.location.lng)} onChange={(e) => patch("location", { lng: e.target.value as unknown as number })} />
          </Field>
        </div>
        <Button className="w-full" loading={saving === "location"} onClick={() => save("location")}>
          Simpan lokasi
        </Button>
      </Section>

      <Section title="Ganti Kode Unik" desc="Kode untuk masuk panel admin">
        <Field label="Kode baru" help="Minimal 6 karakter. Semua perangkat lain akan otomatis keluar.">
          <TextInput type="password" value={pin} onChange={(e) => setPin(e.target.value)} autoComplete="new-password" />
        </Field>
        <Button variant="gold" className="w-full" disabled={pin.length < 6} loading={saving === "pin"} onClick={savePin}>
          Ganti kode
        </Button>
      </Section>
    </div>
  );
}
