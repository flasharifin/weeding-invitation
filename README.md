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

## Mengganti isi dan foto

Data pasangan, tanggal, lokasi, musik, dan path foto berada di `src/lib/config.ts`.
Taruh foto asli di `public/photos/`, lalu arahkan konfigurasi ke JPG, PNG, atau WebP tersebut. Selama masih memakai SVG placeholder bawaan, bagian mempelai menampilkan monogram dan galeri menampilkan kartu sementara. Foto asli otomatis tampil dalam bingkai oval dan galeri yang dapat diperbesar.

Kuota tamu pada RSVP mengikuti data undangan yang diatur admin. Tombol Simpan Tanggal mengunduh kalender `.ics`; tombol lokasi membuka Google Maps.

Tema undangan ada di `src/app/garden.css`, dibatasi oleh `.garden-site` agar halaman admin dan scanner tetap menggunakan gaya masing-masing. Komponen `src/components/Invitation.tsx` dipakai bersama oleh preview dan undangan pribadi.

Ilustrasi WebP tersimpan di `public/garden/`. Prompt dan asal aset tercatat di [docs/garden-assets.md](docs/garden-assets.md).

## Pemeriksaan

```sh
npm run build
```

Produksi membutuhkan konfigurasi database dan autentikasi yang sudah digunakan project. Preview desain dapat dibuka tanpa database.
