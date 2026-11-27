# Layar Informasi Masjid

Layar TV `/display` dan panel pengurus `/admin` untuk Masjid Subulussalam Al-Khoory. Tampilan diatur melalui HP dan diperbarui melalui SSE.

Demo publik berdata contoh: <https://subulussalam-al-khoory.vercel.app>. Demo berjalan dengan `DEMO_MODE=1` tanpa database, sehingga panel pengurus tidak tersedia di sana.

## Pengembangan lokal

Gunakan Node.js 24 dan PostgreSQL. Salin `.env.example` menjadi `.env`, buat database PostgreSQL, lalu isi `DATABASE_URL` dan `ADMIN_INITIAL_PIN` dengan nilai sendiri. `ADMIN_INITIAL_PIN` menjadi password awal akun `admin` dan hanya digunakan ketika database pertama kali diinisialisasi; mengganti variabel sesudah itu tidak mengubah password yang sudah tersimpan.

```sh
npm ci
npm run dev
```

Buka `http://localhost:3000/display` untuk TV dan `http://localhost:3000/admin` untuk panel. Jalankan `npm test`, `npm run lint`, dan `npm run build` untuk pemeriksaan lokal.

## Simulasi tanpa database

Untuk pengembangan atau preview Vercel, atur `DEMO_MODE=1` di `.env.local` atau di environment variables project Vercel, lalu jalankan/deploy aplikasi dan buka `/demo`. Tidak perlu mengatur `DATABASE_URL` atau password admin untuk simulasi ini.

Pilih panel dan kondisi layar pada halaman tersebut untuk melihat contoh kegiatan hari ini dan penceramah, petugas Jumat, poster, kas, donatur dan ZISWAF, ayat, donasi, hari besar Islam, pengurus masjid, Ramadhan dan sholat Ied, pengumuman, azan, doa setelah azan, iqamah, sholat, serta pengumuman darurat. Di luar bulan Ramadhan, panel Ramadhan disimulasikan pada hari ke-12 Ramadhan berikutnya pukul 15.00 WITA. API contoh tersedia di `/api/display/state?demo=1`, dan menerima pilihan `module` serta `phase` seperti yang digunakan halaman simulasi.

Semua data hanya contoh; QRIS tidak bisa dipindai, cuaca bukan data aktual, dan jadwal sholat hanya perkiraan. Panel Live Ka'bah memutar siaran YouTube asli. Simulasi hanya pratinjau: panel admin, upload, dan realtime antarperangkat tetap memerlukan layanan operasional dan tidak disimulasikan. `/admin` dan `/display` biasa tetap memerlukan database; simulasi tidak menulis ke sana. Jangan mengaktifkan `DEMO_MODE` pada deployment operasional.

## Deploy VPS

Siapkan domain yang mengarah ke VPS, Docker Compose, Nginx, Certbot dan akses ke port 80/443. Jalankan **satu replika aplikasi**: realtime dan status TV saat ini disimpan dalam memori proses dan tidak mendukung beberapa replika.

1. Salin `.env.example` ke `.env`. Isi `POSTGRES_PASSWORD` dengan password acak alfanumerik panjang dan `ADMIN_INITIAL_PIN` dengan password awal akun `admin` yang kuat. Jangan membagikan atau mengunggah `.env`. `DATABASE_URL` lokal tidak dipakai oleh Compose.
2. Jalankan `docker compose up -d --build`. PostgreSQL hanya dapat diakses dalam jaringan Docker; aplikasi terikat ke `127.0.0.1:3000`.
3. Salin `deploy/nginx.conf` ke konfigurasi situs Nginx pada host, ganti `masjid.example.com` dengan domain sebenarnya, aktifkan situs, lalu jalankan `sudo nginx -t` dan muat ulang Nginx.
4. Pasang sertifikat menggunakan `sudo certbot --nginx -d DOMAIN`, lalu pastikan pembaruan otomatis Certbot aktif. Jangan gunakan panel admin melalui HTTP publik.
5. Buka `https://DOMAIN/admin` di HP dan `https://DOMAIN/display` di browser TV landscape. Gunakan mode layar penuh atau kiosk; perangkat TV dan VPS membutuhkan internet untuk pembaruan dan YouTube. Agar suara Live Ka'bah langsung menyala tanpa perlu mengetuk layar, jalankan Chrome dengan opsi autoplay, misalnya `chrome --kiosk --autoplay-policy=no-user-gesture-required https://DOMAIN/display`.

Perubahan pada `POSTGRES_PASSWORD` setelah volume database dibuat tidak otomatis mengganti password di PostgreSQL. Jangan hapus volume database atau upload saat memperbarui aplikasi.

## Akun pengurus dan peran

Panel `/admin` memakai nama pengguna dan password untuk tiap pengurus. Saat aplikasi pertama kali berjalan dibuat akun `admin` (nama "Administrator"):

- Pada database baru, password-nya adalah nilai `ADMIN_INITIAL_PIN`.
- Pada instalasi lama yang sebelumnya memakai satu kode unik, password akun `admin` adalah **kode unik lama** tersebut. Semua perangkat perlu login ulang sekali setelah pembaruan ini.

Setelah login pertama, ganti password di Pengaturan › **Ganti password saya** (minimal 8 karakter). Mengganti password mengeluarkan akun itu dari perangkat lain.

Admin menambah pengurus lain di Pengaturan › **Pengguna**, lalu memilih perannya:

| Peran | Akses |
| --- | --- |
| Admin | Semua menu, pengaturan masjid, pengguna, dan riwayat aktivitas |
| Bendahara | Kas dan infak, kategori kas, donatur, dan impor kas dari CSV/Excel |
| Konten | Konten layar (pengumuman, kajian, pembicara, Jumat, tarawih, sholat Ied, pengurus, ayat, slide), urutan tampilan, upload gambar, dan remote TV |
| Operator TV | Remote TV dan urutan tampilan |

Di halaman Pengguna, admin juga bisa mengubah peran, mereset password, dan menonaktifkan akun; akun yang dinonaktifkan atau direset langsung keluar dari semua perangkat. Akun tidak dihapus agar riwayat tetap utuh. Admin tidak bisa menonaktifkan akunnya sendiri, dan admin aktif terakhir tidak bisa diturunkan perannya atau dinonaktifkan. Setelah 5 kali salah password untuk satu nama pengguna (atau 20 kali dari satu alamat), login dikunci 5 menit.

Pengaturan › **Riwayat aktivitas** (khusus admin) mencatat siapa yang login, keluar, menambah, mengubah, atau menghapus konten dan kas, mengubah pengaturan, mengelola pengguna, mengunduh CSV, mengimpor kas, serta mengirim perintah remote. Riwayat disimpan satu tahun.

Beranda Remote menampilkan kartu ringkasan sesuai peran: saldo kas, pemasukan dan pengeluaran bulan ini, dan jumlah donatur bulan ini (admin), serta jumlah pengumuman, kajian, dan slide aktif dan petugas Jumat berikutnya (admin dan konten). Bendahara melihat ringkasan kas di bagian atas halaman Kas.

## Kas, donatur, dan ZISWAF

- Tiap transaksi kas bisa diberi **kategori**. Kategori dikelola di Kas › **Kategori kas & ZISWAF** dan dipisah untuk pemasukan dan pengeluaran. Saat pertama kali berjalan, aplikasi membuat sekali daftar kategori umum yang bisa diubah atau dinonaktifkan. Nonaktifkan kategori yang tidak dipakai lagi; menghapusnya membuat transaksi lama menjadi tanpa kategori.
- Kategori bisa ditandai **zakat, infaq, sedekah, atau wakaf**. Pemasukan pada kategori itu dihitung sebagai penerimaan, pengeluaran sebagai penyaluran.
- Pemasukan bisa mencatat **nama donatur**. Nama hanya tampil di layar TV bila "Tampilkan nama di layar" diaktifkan; jika tidak, layar menulis "Hamba Allah". Nama yang disembunyikan tidak dikirim ke layar.
- Panel **Laporan kas** menampilkan saldo, pemasukan dan pengeluaran bulan ini, rincian kategori terbesar bulan ini (bila ada transaksi berkategori), dan transaksi terakhir.
- Panel **Donatur & ZISWAF** menampilkan donatur 60 hari terakhir (paling banyak 8) dan rekap penerimaan serta penyaluran ZISWAF bulan dan tahun ini. Panel ini dilewati bila belum ada donatur maupun transaksi ZISWAF tahun ini. Atur urutan dan durasinya di menu Tampilan.

## Kajian, pembicara, pengurus, dan Ramadhan

Semua menu berikut ada di **Konten** dan bisa dikelola admin maupun peran Konten.

- **Pembicara**: daftar ustadz, khatib, dan pemateri dengan profil singkat dan foto (opsional). Jangan isi nomor telepon; profil tampil di layar. Saat mengisi kajian, petugas Jumat, atau tarawih, pilih pembicara dari daftar agar foto dan nama terbarunya tampil di TV, atau pilih "Ketik nama manual". Pembicara yang dinonaktifkan tidak muncul lagi di pilihan, tetapi jadwal lama tetap menampilkannya.
- **Jadwal kajian** punya tiga jenis jadwal:
  - **Rutin setiap pekan**: pilih hari, jam mulai, dan jam selesai (opsional). Setelah jam selesai, layar menampilkan pertemuan pekan berikutnya.
  - **Sekali**: pilih tanggal. Kajian otomatis hilang dari layar setelah tanggalnya lewat, atau setelah jam selesai pada hari itu.
  - **Jadwal bebas**: hari/tanggal ditulis manual seperti sebelumnya. Kajian lama otomatis memakai jenis ini.

  Panel kajian menyorot kajian terdekat dengan penanda "Hari ini" atau "Besok", foto pemateri, dan gambar latar (opsional).
- **Pengurus**: nama, jabatan, dan foto pengurus untuk panel **Pengurus Masjid**. Tanpa foto, layar menampilkan inisial nama. Lebih dari delapan pengurus ditampilkan bergantian per halaman, masing-masing selama durasi yang diatur di menu Tampilan.
- **Petugas tarawih**: imam, penceramah, dan tema ceramah tiap malam. Isi tanggal hari ketika tarawih dikerjakan pada malamnya; nomor malam dihitung dari pengaturan Kalender Hijriah.
- **Sholat Ied**: tanggal, jam, tempat, khatib, dan imam sholat Idul Fitri atau Idul Adha. Tanggal awal yang terisi hanya perkiraan kalender, jadi sesuaikan dengan penetapan pemerintah.

Panel **Ramadhan & Hari Raya** hanya tampil di musimnya: sejak sehari sebelum 1 Ramadhan sampai akhir Ramadhan, pada malam yang sudah ada petugas tarawihnya, dan mulai 30 hari sebelum sholat Ied yang diisi. Isinya waktu imsak dan berbuka beserta hitung mundur berbuka, petugas tarawih malam ini dan berikutnya, serta info sholat Ied. Awal Ramadhan mengikuti pengaturan Kalender Hijriah, jadi isi awal bulan Ramadhan dan Syawal sesuai penetapan.

## Bagikan ke WhatsApp dan ekspor CSV

Tombol **Bagikan ke WhatsApp** menyusun teks siap kirim. Di HP, tombol ini membuka menu bagikan bawaan; di komputer, tombol ini membuka WhatsApp Web. Tombol ada di:

- **Kas**: kartu **Laporan kas** di bagian atas. Pilih periode (bulan ini, bulan lain yang ada transaksinya, atau setahun) untuk melihat pemasukan, pengeluaran, dan saldo akhir. Teks yang dibagikan juga berisi saldo awal dan total per kategori. Nama donatur tidak pernah masuk ke teks yang dibagikan.
- **Jadwal kajian**: kajian pekan ini (hari ini sampai enam hari ke depan) dan kajian dengan jadwal bebas.
- **Petugas Jumat**: petugas Jumat terdekat.
- **Sholat Ied**: tombol **Bagikan** pada tiap sholat Ied.

Tombol **Unduh CSV** ada di halaman Kas (sesuai periode yang dipilih, termasuk nama donatur dan saldo berjalan), Jadwal kajian, Petugas Jumat, Petugas tarawih, dan Pengurus. Tiap peran hanya bisa mengunduh data yang boleh ia kelola, dan setiap unduhan tercatat di Riwayat aktivitas sebagai "Mengunduh CSV". File CSV memakai pemisah koma. Jika Excel menampilkan semua kolom dalam satu kolom, buka lewat **Data › From Text/CSV** dan pilih pemisah koma.

## Impor kas dari CSV/Excel

Kas › **Impor dari CSV/Excel** (admin dan bendahara) memasukkan banyak transaksi sekaligus, misalnya dari buku kas lama, laporan bank, atau ekspor aplikasi keuangan lain.

1. Pilih file **.csv** atau **.xlsx**, paling besar 5 MB dan 5.000 transaksi sekali impor. File .xls berisi tabel HTML (biasa dari ekspor aplikasi web) juga terbaca. File .xls lama dari Excel 97–2003 perlu disimpan ulang sebagai .xlsx atau CSV. Bila file Excel punya beberapa lembar, pilih lembarnya; lembar tersembunyi tidak dibaca.
2. **Cocokkan kolom.** Aplikasi menebak baris judul kolom dan kolom tanggal, nominal, kategori, keterangan, donatur, dan nomor bukti dari judulnya. Periksa dan ubah bila perlu, lalu pilih cara membaca jenis transaksi:
   - kolom pemasukan dan pengeluaran terpisah,
   - kolom jenis (masuk/keluar),
   - satu kolom nominal, minus untuk pengeluaran, atau
   - semua baris pemasukan, atau semua baris pengeluaran.

   Kolom **Debet/Kredit** tidak ditebak karena artinya berbeda: di buku kas debet berarti masuk, di rekening koran bank debet berarti keluar. Pilih kolomnya sendiri. Tanggal angka seperti `05/03/2026` dibaca hari/bulan/tahun kecuali urutannya diubah; tanggal bernama bulan (`5 Maret 2026`) dan sel tanggal Excel juga terbaca. Nominal seperti `1.250.000`, `Rp 1.250.000,-`, dan `Rp -` (nol) terbaca; `(20.000)` dibaca sebagai minus.
3. **Periksa data.** Tiap transaksi mendapat status:
   - **Baru**: akan diimpor.
   - **Sudah pernah diimpor**: dilewati, jadi file yang sama aman diimpor ulang. Transaksi dikenali dari tanggal dan nomor bukti bila kolomnya dipetakan (nomor bukti boleh mulai lagi dari 1 tiap bulan), atau dari tanggal, jenis, nominal, keterangan, kategori, dan donatur. Bila memakai nomor bukti, nominal yang diubah di file tidak memperbarui transaksi yang sudah tersimpan.
   - **Mirip data yang ada**: tanggal, jenis, dan nominalnya sama dengan transaksi yang sudah tercatat, misalnya pernah dicatat manual. Dilewati kecuali **Tetap impor transaksi yang mirip** diaktifkan.
   - **Tidak terbaca**: baris dan alasannya ditampilkan. Perbaiki file, lalu pilih ulang.

   Baris judul laporan, saldo awal, total, dan nominal 0 dilewati otomatis.
4. Tentukan **kategori** untuk tiap nama kategori di file: masukkan ke kategori yang ada (dipilih otomatis bila namanya sama), buat kategori baru, atau tanpa kategori. Kategori baru otomatis ditandai ZISWAF bila namanya mengandung zakat, infaq, sedekah, atau wakaf.
5. **Impor.** Semua transaksi disimpan sekaligus; bila ada kesalahan, tidak ada yang tersimpan. Setiap impor tercatat di Riwayat aktivitas.

Nama donatur hanya dibaca untuk pemasukan. Tanpa kolom "Tampilkan nama" berisi Ya/Tidak, donatur tampil di layar sebagai "Hamba Allah". File dari **Unduh CSV** di halaman Kas bisa diimpor kembali tanpa membuat transaksi ganda. Tidak ada tombol untuk membatalkan impor: periksa contoh transaksi sebelum mengimpor, dan hapus transaksi yang keliru satu per satu di halaman Kas. Transaksi yang sudah dihapus akan masuk lagi bila file yang sama diimpor ulang.

## Cadangan

Buat cadangan database dengan `docker compose exec -T db pg_dump -U masjid -d masjid -Fc > masjid.dump`. Cadangkan juga volume `uploads` secara terpisah; dump database tidak berisi gambar. Simpan cadangan di lokasi aman dan lakukan uji pemulihan sebelum mengandalkannya.

## Catatan operasional

- Jadwal dari myQuran disimpan di database; jika layanan gagal, perhitungan lokal adalah **perkiraan**, bukan jaminan sama dengan jadwal resmi. Verifikasi dengan jadwal masjid dan sesuaikan koreksi di pengaturan.
- Tanggal Hijriah menggunakan perhitungan Umm al-Qura dan dapat berbeda dari penetapan setempat. Di Pengaturan › Kalender Hijriah, isi **awal bulan** sesuai penetapan (misalnya 1 Ramadhan atau 1 Syawal); tanggal Hijriah mengikuti penetapan itu mulai sehari sebelumnya sampai awal bulan berikutnya yang diisi, paling lama sekitar satu tahun. Koreksi hari hanya dipakai bila tidak ada awal bulan yang berlaku. Jika penetapan berbeda dari kalender, tanggal terakhir bulan sebelumnya bisa tampil dua kali atau terlewat satu hari.
- Panel **Hari Besar Islam** menampilkan hari besar terdekat (1 Muharram, Maulid, Isra Mi'raj, Nisfu Sya'ban, awal Ramadhan, Nuzulul Qur'an, Idul Fitri, Arafah, Idul Adha) beserta hitung mundurnya, mengikuti pengaturan Kalender Hijriah.
- Setelah azan, layar menampilkan doa setelah azan selama waktu yang diatur di Pengaturan (bawaan 60 detik, 0 = nonaktif), lalu hitung mundur iqamah. Iqamah tidak dimulai sebelum doa selesai. Doa tidak ditampilkan pada waktu Jumat.
- Live Ka'bah bawaan memakai dua siaran YouTube dari channel pihak ketiga: utama dan cadangan. Jika siaran utama error atau tidak mulai dalam 30 detik, layar pindah ke cadangan; jika keduanya gagal, layar menampilkan pesan dan mencoba lagi tiap 5 menit selama panel itu tampil. Siaran pihak ketiga bisa berhenti atau berganti link kapan saja, jadi ganti URL di Pengaturan bila perlu. Pratinjau di panel HP tidak memutar siaran agar hemat kuota.
- Suara Live Ka'bah dapat dimatikan di Pengaturan dan selalu berhenti saat azan, doa setelah azan, iqamah, sholat, dan pengumuman darurat. Browser menahan video bersuara sampai ada interaksi; tanpa opsi autoplay di atas, layar menampilkan petunjuk dan suara menyala setelah layar diketuk atau tombol ditekan sekali. Izin ini biasanya bertahan saat halaman dimuat ulang, tetapi perlu diulang setelah browser ditutup.
- Simpan file logo serta QRIS asli untuk diunggah melalui panel. Konten contoh perlu diperiksa pengurus sebelum ditampilkan.
