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

Pilih panel dan kondisi layar pada halaman tersebut untuk melihat contoh kegiatan hari ini dan penceramah, petugas Jumat, poster, kas, ayat, donasi, hari besar Islam, pengumuman, azan, doa setelah azan, iqamah, sholat, serta pengumuman darurat. API contoh tersedia di `/api/display/state?demo=1`, dan menerima pilihan `module` serta `phase` seperti yang digunakan halaman simulasi.

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
| Bendahara | Kas dan infak |
| Konten | Konten layar (pengumuman, kajian, Jumat, ayat, slide), urutan tampilan, upload gambar, dan remote TV |
| Operator TV | Remote TV dan urutan tampilan |

Di halaman Pengguna, admin juga bisa mengubah peran, mereset password, dan menonaktifkan akun; akun yang dinonaktifkan atau direset langsung keluar dari semua perangkat. Akun tidak dihapus agar riwayat tetap utuh. Admin tidak bisa menonaktifkan akunnya sendiri, dan admin aktif terakhir tidak bisa diturunkan perannya atau dinonaktifkan. Setelah 5 kali salah password untuk satu nama pengguna (atau 20 kali dari satu alamat), login dikunci 5 menit.

Pengaturan › **Riwayat aktivitas** (khusus admin) mencatat siapa yang login, keluar, menambah, mengubah, atau menghapus konten dan kas, mengubah pengaturan, mengelola pengguna, serta mengirim perintah remote. Riwayat disimpan satu tahun.

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
