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
  displays: "layar TV",
};

/** Kalimat singkat untuk satu baris riwayat aktivitas. */
export function describeAudit(e: Pick<AuditEntry, "action" | "target">): string {
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
    case "camera":
      return "Siaran kamera";
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
