# Undangan Shinta & Ryan

Undangan pernikahan Next.js dengan tema taman Eropa, ilustrasi ivory–gold, RSVP, buku ucapan, dan QR check-in pribadi.

## Menjalankan

```sh
npm install
npm run dev
```

- `/preview`: preview desain lengkap, tanpa database. RSVP dan ucapan hanya simulasi di browser; tidak menyimpan data atau membuat QR tamu.
- `/i/[token]`: undangan tamu, dengan RSVP tersimpan, buku ucapan, dan QR pribadi.
- `/admin`: pengelolaan tamu.
- `/scan`: pemindaian QR oleh petugas.

Tambahkan `?preview=1` untuk langsung melewati sampul, misalnya `/preview?preview=1`.

Pembukaan normal dimulai dengan splash “Wedding Invitation” dan angka 0–100% saat ilustrasi dan font disiapkan. Setelah itu, sampul muncul bertahap; tombol Buka Undangan memulai transisi taman selama 2,4 detik. Persiapan memiliki batas tunggu 8 detik agar aset yang gagal/lambat tidak mengunci undangan. Parameter `?preview=1` melewati splash sekaligus sampul. Pengaturan reduced motion mempercepat splash dan melewati transisi gerak.

## Mengganti isi dan foto

Data pasangan, tanggal, lokasi, musik, dan path foto berada di `src/lib/config.ts`.
Taruh foto asli di `public/photos/`, lalu arahkan konfigurasi ke JPG, PNG, atau WebP tersebut. Selama masih memakai SVG placeholder bawaan, bagian mempelai menampilkan monogram dan galeri menampilkan kartu sementara. Foto asli otomatis tampil dalam bingkai oval dan galeri yang dapat diperbesar.

Kuota tamu pada RSVP mengikuti data undangan yang diatur admin. Tombol Simpan Tanggal mengunduh kalender `.ics`; tombol lokasi membuka Google Maps.

Tema undangan ada di `src/app/garden.css`, dibatasi oleh `.garden-site` agar halaman admin dan scanner tetap menggunakan gaya masing-masing. Komponen `src/components/Invitation.tsx` dipakai bersama oleh preview dan undangan pribadi.

Ilustrasi WebP tersimpan di `public/garden/`. Prompt dan asal aset tercatat di [docs/garden-assets.md](docs/garden-assets.md).

Animasi kedalaman ada di `src/components/GardenMotion.tsx` dan `src/app/garden.css`: lapisan taman mengikuti kursor/scroll, bunga berayun, serta bingkai foto dan kartu acara memiliki kemiringan perspektif. Efek otomatis berhenti di luar layar, saat tab tersembunyi, atau saat perangkat mengaktifkan `prefers-reduced-motion`. Ponsel menggunakan scroll tanpa akses sensor gerak.

Latar rumah berbunga menggunakan `public/garden/house-garden.webp`. Dua merpati pada sampul dan hero mengepak, mendarat di bunga, bertengger, lalu terbang kembali dalam siklus 24 detik dengan jeda masuk berbeda. Animasi memakai sprite transparan `public/garden/dove-sprites.webp`; reduced motion menampilkan pose bertengger statis. Detail aset dan prompt imagegen ada di [docs/dove-assets.md](docs/dove-assets.md).

## Pemeriksaan

```sh
npm run build
```

Produksi membutuhkan konfigurasi database dan autentikasi yang sudah digunakan project. Preview desain dapat dibuka tanpa database.

Wedding Gift tampil di atas Doa & Ucapan. Isi rekening dan alamat asli di `src/lib/wedding-gift.ts` (`accounts` dan `shipping`). Formulir pada tautan tamu mengirim konfirmasi ke `/api/gifts` dan menyimpannya di tabel Postgres `gift_confirmations` (lokal tanpa DATABASE_URL: `data/gifts.json`). `/preview` tetap simulasi dan tidak menyimpan data contoh.

Tab **Wedding Gift** di `/admin` menampilkan pengirim, tamu undangan, jenis, tujuan, nominal/keterangan, dan waktu. Mendukung pencarian, filter jenis, serta pembaruan setiap 5 detik. Data hanya dapat dibaca admin. Nominal merupakan laporan tamu, bukan bukti transfer terverifikasi. Pengiriman menggunakan ID unik agar percobaan ulang tidak menambah baris ganda. Data hadiah dipertahankan jika tamu dihapus.

Tabel dibuat otomatis saat fitur diakses, atau melalui `npm run db:migrate`. Migrasi tidak menghapus data lama. Tidak ada ketergantungan WhatsApp untuk konfirmasi hadiah.

Pengujian Wedding Gift: `npm run test:gifts` (Node.js 24+), memakai penyimpanan sementara dan fixture autentikasi/tujuan, tanpa mengubah database produksi.

Sharing Memories tampil setelah Tanda Kehadiran. Setiap tautan tamu memiliki kuota **10 foto total**, bukan 10 foto setiap sesi. JPG/PNG/WebP hingga 10 MB diperkecil di browser, kemudian divalidasi dan dikompresi ulang di server menjadi JPEG maksimal 1600 px / 1 MB tanpa metadata EXIF. Foto berhasil tampil di galeri pribadi tamu dan kuota dimuat ulang dari server saat halaman dibuka kembali. Upload yang gagal dapat dicoba ulang memakai ID yang sama tanpa memakan kuota tambahan.

Foto baru disimpan di Sumopod/S3 dalam struktur `wedding-photo/nama-tamu--ID-tamu/ID-upload-ID-percobaan.jpg`. Nama berasal dari daftar tamu, bukan input browser; ID tamu mencegah nama yang sama bercampur. Folder S3 adalah prefix dan otomatis muncul setelah upload pertama. Database hanya menyimpan `object_key`, ID tamu, slot kuota, dan waktu. Foto lama dalam kolom `image` tetap dapat dibaca sampai dimigrasikan.

Upload saat ini melewati API Vercel untuk validasi dan kompresi akhir (maks. 1 MB), kemudian diteruskan ke Sumopod. Ini belum direct browser upload dan tidak memerlukan CORS bucket untuk upload. Membaca foto dilakukan melalui redirect ke presigned GET berdurasi 5 menit setelah otorisasi. Bucket harus privat; tidak perlu mengaktifkan public access. Upload diserialkan melalui lock tamu dalam transaksi; slot 1–10 dengan constraint unik melindungi kuota. Gagal upload tidak mencatat foto baru. Cleanup hanya menyasar objek percobaan yang belum direferensikan; jika status commit tidak dapat dipastikan, objek dipertahankan untuk rekonsiliasi. Menghapus tamu menghapus metadata foto dari aplikasi, tetapi arsip file di Sumopod dipertahankan untuk diatur terpisah oleh pemilik bucket.

Konfigurasi di **Vercel → Project → Settings → Environment Variables**:

```env
S3_ENDPOINT=https://endpoint-dari-sumopod
S3_REGION=region-dari-sumopod
S3_BUCKET=actual-bucket-name
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_FORCE_PATH_STYLE=false
```

Endpoint harus URL HTTPS API S3 tanpa path bucket. Nilai dari Sumopod → Manage → Quick Start / Credentials. `S3_FORCE_PATH_STYLE` opsional, default `false`; ubah menjadi `true` bila provider memerlukan `endpoint/bucket/key` daripada `bucket.endpoint/key`. Nilai harus `true` atau `false`. Jangan gunakan awalan NEXT_PUBLIC untuk kredensial. `.env.local` hanya untuk menjalankan kode/tes koneksi di komputer sendiri; deployment membaca environment Vercel dan perlu redeploy setelah konfigurasi diubah. `DATABASE_URL` serta variabel autentikasi tetap diperlukan. Upload baru tidak diam-diam kembali menyimpan binary ke database bila konfigurasi S3 kosong.

Dengan Node.js 24+ dan konfigurasi lokal yang sesuai:

```bash
npm run storage:check   # HeadBucket, read-only; izin tulis belum diuji
npm run db:migrate     # upgrade schema; tidak menghapus foto lama
npm run storage:migrate # pindahkan foto lama ke S3; cek ukuran objek sebelum melepas binary database
```

Migrasi foto dapat diulang; setiap foto yang selesai menyimpan path dan mengosongkan `image`, tanpa mengubah kuota. Foto yang gagal dipindahkan tetap disimpan di lokasi lama. Jangan mengganti bucket/endpoint setelah upload tanpa memindahkan objek dengan key yang sama.

Development tanpa DATABASE_URL memakai `data/memories.json` untuk metadata saja (tetap membutuhkan S3 untuk upload baru). `db:migrate -- --import` mendukung metadata lokal maupun foto legacy. `/preview` menyimulasikan upload tanpa API/database. Pengujian: `npm run test:storage`, `npm run test:memories`, `npm run test:gifts`; memakai storage/transport terisolasi tanpa menulis data uji ke bucket atau database produksi.
