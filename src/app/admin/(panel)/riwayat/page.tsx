"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/components/admin/api";
import { Button, Card, EmptyState, PageHeader } from "@/components/admin/ui";
import type { AuditEntry } from "@/lib/users";

const RESOURCE_LABELS: Record<string, string> = {
  announcements: "pengumuman",
  kajian: "jadwal kajian",
  jumat: "petugas Jumat",
  finance: "transaksi kas",
  finance_categories: "kategori kas",
  verses: "ayat/hadis",
  slides: "poster",
  speakers: "pembicara",
  board_members: "pengurus",
  tarawih: "petugas tarawih",
  ied: "sholat Ied",
  playlist: "urutan tampilan",
};

function describe(e: AuditEntry): string {
  const resource = RESOURCE_LABELS[e.target.split(":")[0]] ?? "data";
  switch (e.action) {
    case "login":
      return "Masuk ke panel";
    case "logout":
      return "Keluar dari panel";
    case "create":
      return `Menambah ${resource}`;
    case "update":
      return `Mengubah ${resource}`;
    case "delete":
      return `Menghapus ${resource}`;
    case "export":
      return `Mengunduh CSV ${resource}`;
    case "import":
      return `Mengimpor ${resource} dari file`;
    case "command":
      return "Remote layar TV";
    case "settings":
      return "Mengubah pengaturan";
    case "password":
      return "Mengganti password";
    case "user.create":
      return `Menambah pengguna @${e.target.replace("pengguna:", "")}`;
    case "user.update":
      return `Mengubah pengguna @${e.target.replace("pengguna:", "")}`;
    default:
      return e.action;
  }
}

const dayKey = (iso: string) => new Date(iso).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

type Page = { items: AuditEntry[]; nextBefore: number | null };

export default function RiwayatPage() {
  const [items, setItems] = useState<AuditEntry[] | null>(null);
  const [next, setNext] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchPage = useCallback(
    (before: number | null) =>
      api<Page>(`/api/admin/audit${before ? `?before=${before}` : ""}`).then((page) => {
        setItems((prev) => (before && prev ? [...prev, ...page.items] : page.items));
        setNext(page.nextBefore);
      }),
    [],
  );

  useEffect(() => {
    fetchPage(null).catch((e) => toast.error(e.message));
  }, [fetchPage]);

  const loadMore = async () => {
    setLoading(true);
    try {
      await fetchPage(next);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const groups: [string, AuditEntry[]][] = [];
  for (const e of items ?? []) {
    const key = dayKey(e.at);
    const last = groups[groups.length - 1];
    if (last?.[0] === key) last[1].push(e);
    else groups.push([key, [e]]);
  }

  return (
    <div>
      <PageHeader title="Riwayat aktivitas" description="Siapa mengubah apa dan kapan. Disimpan selama 1 tahun." />
      {!items ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-white/5" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState>Belum ada aktivitas tercatat.</EmptyState>
      ) : (
        <div className="space-y-5">
          {groups.map(([day, entries]) => (
            <section key={day}>
              <h2 className="mb-2 px-1 text-sm font-bold text-sky-200/70">{day}</h2>
              <Card className="divide-y divide-white/5 p-0">
                {entries.map((e) => (
                  <div key={e.id} className="flex gap-3 p-4">
                    <time dateTime={e.at} className="w-11 shrink-0 pt-0.5 text-sm text-white/45 tabular-nums">
                      {timeOf(e.at)}
                    </time>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{describe(e)}</p>
                      {e.detail && <p className="mt-0.5 text-sm break-words text-sky-200/70">{e.detail}</p>}
                      <p className="mt-1 text-xs text-white/45">
                        {e.name ? `${e.name} · ` : ""}@{e.username || "?"}
                      </p>
                    </div>
                  </div>
                ))}
              </Card>
            </section>
          ))}
          {next && (
            <Button variant="ghost" className="w-full" loading={loading} onClick={loadMore}>
              Muat lebih banyak
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
