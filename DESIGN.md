# Panduan desain

Layar TV masjid (`/display`, 1920×1080, dibaca dari jauh) dan panel pengurus di HP (`/admin`). Identitas visual mengikuti
Unismuh Makassar: navy, biru royal `#1D1CE5`, dan kuning emas `#FFEE37`. Token ada di `src/app/globals.css` (`@theme`).

## Prinsip

1. **Warna = makna, bukan hiasan.** Setiap warna punya satu peran tetap (tabel di bawah). Jamaah belajar polanya:
   hijau berarti uang/ZISWAF, ungu berarti kalender, merah bata berarti pengumuman atau bahaya.
2. **Permukaan polos.** Tanpa gradien dekoratif, cahaya (glow), noise, atau kaca/blur. Kedalaman cukup dari perbedaan
   warna isi (`navy-950` → `navy-900` → `tile`). Satu kartu hanya memakai satu penanda tepi.
3. **Satu sorotan per panel.** Kartu berwarna dipakai untuk satu hal terpenting di panel; sisanya `tile` netral.
4. **Gradien hanya bila berfungsi**, mis. peredup di atas foto agar teks terbaca (banner kajian, poster slide).
5. **Pola khatam** (bintang delapan) hanya di layar penuh adzan, doa, dan iqamah.

## Peran warna

| Warna | Kelas permukaan | Dipakai untuk |
|---|---|---|
| Navy `navy-950/900` | `.scene`, `.card`, `.tile` | Latar dan kartu netral |
| Biru royal `royal-600` | `.card-brand`, `bg-royal-600` | Ibadah rutin & ilmu (kajian, Jumat, pengurus, rekening QRIS), sholat yang sedang berlangsung, tombol utama, menu aktif |
| Emas `gold-400` | `.card-gold`, chip `tone="gold"` | Waktu dan perhatian: sholat berikutnya < 10 menit, label "Hari ini", fokus keyboard |
| Zamrud `zamrud-700` | `.card-zamrud` | Keuangan & ZISWAF (saldo kas, donatur), pemasukan |
| Ungu `ungu-700` | `.card-ungu` | Kalender & musim (hari besar Islam, Ramadhan, Ied) |
| Merah bata `bata-700` | `.card-bata` | Pengumuman, pengumuman darurat, pengeluaran, aksi berbahaya |

- `emerald-*`, `rose-*`, dan `amber-*` dari Tailwind dipetakan ulang ke zamrud, bata, dan emas, jadi status lama ikut
  bahasa warna yang sama.
- Di dalam `.card-zamrud`, `.card-ungu`, dan `.card-bata`, variabel `sky-*` di-tint ulang sesuai warna kartu. Teks
  sekunder (`text-sky-100/80` dll.) otomatis mengikuti, tidak menjadi abu-abu.
- Ikon judul panel TV memakai warna peran modul: `<PanelHeader tone="zamrud" … />`.

## Saat menambah UI

- Pilih warna dari tabel; jangan menambah warna baru tanpa peran baru yang jelas.
- Teks biasa ≥ 4,5:1 terhadap latarnya, teks besar ≥ 3:1. Warna tidak boleh menjadi satu-satunya penanda
  (sertakan tanda +/−, ikon, atau label).
- Kolom isian selalu punya label yang terlihat, bukan hanya placeholder.
- Gerak tetap halus dan menghormati `prefers-reduced-motion` (sudah diatur di `globals.css`).
