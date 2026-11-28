# Panduan desain

Layar TV masjid (`/display`, 1920×1080, dibaca dari jauh) dan panel pengurus responsif (`/admin`, dari HP sampai laptop). Token warna bersama ada di `src/app/globals.css` (`@theme`).

**Rujukan palet.** [Situs Unismuh Makassar](https://www.unismuh.ac.id/) memakai biru `#1D1CE5` dan kuning `#FFEE37` pada [CSS tajuknya](https://www.unismuh.ac.id/wp-content/uploads/elementor/css/post-131.css). Kobalt, toska dan putih pada [ubin bergambar Masjidil Haram, sekitar 1650 (koleksi V&A)](https://collections.vam.ac.uk/item/O79334/tile-unknown/) mengilhami permukaan tinta, nuansa zamrud dan teks gading. Ini adaptasi untuk layar masjid, bukan palet baku Islam atau pedoman merek resmi kampus.

## Prinsip

1. **Warna = makna, bukan hiasan.** Setiap warna punya satu peran tetap (tabel di bawah). Jamaah belajar polanya:
   hijau berarti uang/ZISWAF, ungu berarti kalender, merah bata berarti pengumuman atau bahaya.
2. **Permukaan polos.** Tanpa gradien dekoratif, cahaya (glow), noise, atau kaca/blur. Kedalaman cukup dari perbedaan
   warna isi (`navy-950` → `navy-900` → `tile`). Satu kartu hanya memakai satu penanda tepi.
3. **Satu sorotan per panel.** Kartu berwarna dipakai untuk satu hal terpenting di panel; sisanya `tile` netral.
4. **Gradien untuk membaca foto.** `.photo-caption` adalah satu lapisan kobalt → tinta → transparan di belakang judul atau keterangan. Teks selalu berada di atas bagian pekat, bukan bagian transparan. Pada foto lebar atau tajuk pendek, `cover-spread` menempatkan teks dan subjek berdampingan; pada potret teks ada di bawah. Tombol, grafik, dan tabel tetap polos. Banner kajian tanpa gambar tidak menggunakan gradien.
5. **Tulis informasi sekali.** Hindari label pengantar di atas judul, lencana untuk metadata biasa, dan kartu di dalam kartu. Pertahankan label isian, periode laporan, serta status yang membedakan kondisi layar.

## Peran warna

| Warna | Kelas permukaan | Dipakai untuk |
|---|---|---|
| Tinta `navy-950` (`#0B1C29`) / `navy-900` | `.scene`, `.card`, `.tile` | Latar dan kartu netral; teks utama gading (`foreground`) |
| Biru Unismuh `royal-600` / kobalt `royal-700` | `bg-royal-600`, `.card-brand` | Biru asli pada tombol dan menu aktif; kobalt yang lebih gelap pada pemilih TV serta bidang ibadah rutin dan ilmu |
| Emas hangat `gold-400` (`#F2C56C`) | `.card-gold`, chip `tone="gold"` | Waktu dan perhatian: angka hitung mundur, bidang peringatan sholat berikutnya < 10 menit, label "Hari ini" |
| Kuning Unismuh (`#FFEE37`) | `--color-focus` | Garis fokus keyboard, bukan latar kartu |
| Zamrud bernuansa toska `zamrud-700` (`#0E6054`) | `.card-zamrud` | Keuangan & ZISWAF (saldo kas, donatur), pemasukan |
| Ungu `ungu-700` | `.card-ungu` | Kalender & musim (hari besar Islam, Ramadhan, Ied) |
| Merah bata `bata-700` | `.card-bata` | Pengumuman, pengumuman darurat, pengeluaran, aksi berbahaya |

- `emerald-*`, `rose-*`, dan `amber-*` dari Tailwind dipetakan ulang ke zamrud, bata, dan emas, jadi status lama ikut
  bahasa warna yang sama.
- Di dalam `.card-zamrud`, `.card-ungu`, dan `.card-bata`, variabel `sky-*` di-tint ulang sesuai warna kartu. Teks
  sekunder (`text-sky-100/80` dll.) otomatis mengikuti, tidak menjadi abu-abu.
- Ikon judul panel TV memakai warna peran modul: `<PanelHeader tone="zamrud" … />`.

## Hierarki visual

- Portal, login, dan kepala dasbor memakai `MosqueCover` dengan foto asli dari `public/masjid/slide`. Di portal, tiga pilihan TV ada dalam satu baris di bawah foto. Di login, foto ada di samping formulir pada laptop dan menjadi tajuk pendek pada HP. Amiri dipakai untuk nama masjid di foto; data dan kontrol tetap memakai Plus Jakarta Sans.
- Gunakan `text-muted` untuk keterangan di atas navy dan `border-line` untuk memisahkan kelompok. `.panel-box` dan `.panel-heading` menyatukan kartu panel, `.field-control` untuk isian. Angka waktu dan nominal memakai `tabular-nums`.
- Pada TV, nomor saluran ada di kepala layar. Tujuh waktu sholat berbagi satu baris; label “Sekarang” dan “Berikutnya” membedakan status tanpa hanya mengandalkan warna. Konten langsung terbaca saat modul berganti, tanpa animasi masuk bertahap atau ornamen yang berdenyut di layar sholat.

## Panel pengurus

- Rancang mulai dari HP (360 px), lalu lebarkan. Di bawah `lg` menu utama ada di bawah layar (`AdminNav`); mulai `lg`
  menu pindah ke bilah samping `w-64` (`AdminSidebar`, isi dari `components/admin/menu.ts`). Lebar isi diatur di
  `(panel)/layout.tsx`: `max-w-3xl` → `lg:max-w-7xl`. Di HP, identitas masjid dan peran akun ada di atas, navigasi tetap di bawah area konten.
- Halaman dengan kontrol berdampingan (Remote, Tampilan, Kamera, Impor kas, Pengaturan) baru memakai dua kolom mulai
  `xl`, karena bilah samping memakan lebar di `lg`. Daftar CRUD memakai kartu `md:grid-cols-2 2xl:grid-cols-3`.
- Beranda memakai peran warna yang sama dengan TV: saldo dan pemasukan zamrud, pengeluaran dan pengumuman bata, tanggal
  agenda ungu, waktu sholat emas. Grafik arus kas selalu punya legenda teks dan tiap batang punya teks untuk pembaca layar.
- Target sentuh minimal 44 px (`min-h-11`). Panel juga dipakai dengan mouse, jadi tulis "Pilih", bukan "Ketuk".

## Saat menambah UI

- Pilih warna dari tabel; jangan menambah warna baru tanpa peran baru yang jelas.
- Teks biasa ≥ 4,5:1 terhadap latarnya, teks besar ≥ 3:1. Warna tidak boleh menjadi satu-satunya penanda
  (sertakan tanda +/−, ikon, atau label).
- Kolom isian selalu punya label yang terlihat, bukan hanya placeholder.
- Gerak tetap halus dan menghormati `prefers-reduced-motion` (sudah diatur di `globals.css`).
