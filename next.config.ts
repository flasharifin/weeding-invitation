import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hilangkan bulatan "N" indikator dev di pojok layar.
  devIndicators: false,
  // Izinkan akses dev server dari HP/perangkat lain di jaringan lokal (mis. http://192.168.x.x:3000).
  // Tanpa ini Next 16 memblokir JavaScript client, sehingga tombol, RSVP, dan kirim ucapan tidak berfungsi.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"],
};

export default nextConfig;
