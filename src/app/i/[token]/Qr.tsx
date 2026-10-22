"use client";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { fmtDateTime } from "@/lib/format";

// QR digambar di <canvas> (bukan <img>) dan tanpa tombol unduh, supaya
// tidak ada "simpan gambar" bawaan browser. Tamu cukup memperbesar untuk di-scan.
function QrCanvas({ token, size, className }: { token: string; size: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) QRCode.toCanvas(ref.current, token, { width: size, margin: 2, errorCorrectionLevel: "M" });
  }, [token, size]);
  return <canvas ref={ref} className={className} onContextMenu={(e) => e.preventDefault()} />;
}

export default function Qr({ token, name, used }: { token: string; name: string; used: string | null }) {
  const [big, setBig] = useState(false);
  const [shield, setShield] = useState(false);

  // Upaya terbaik (bukan jaminan): sembunyikan QR saat tab/jendela kehilangan fokus,
  // saat mencetak, atau saat tombol PrintScreen ditekan di desktop.
  useEffect(() => {
    const on = () => setShield(true);
    const off = () => setShield(document.hidden);
    const key = (e: KeyboardEvent) => { if (e.key === "PrintScreen") { on(); navigator.clipboard?.writeText("").catch(() => {}); setTimeout(off, 1500); } };
    window.addEventListener("blur", on);
    window.addEventListener("focus", off);
    window.addEventListener("beforeprint", on);
    window.addEventListener("afterprint", off);
    window.addEventListener("keyup", key);
    document.addEventListener("visibilitychange", off);
    return () => {
      window.removeEventListener("blur", on);
      window.removeEventListener("focus", off);
      window.removeEventListener("beforeprint", on);
      window.removeEventListener("afterprint", off);
      window.removeEventListener("keyup", key);
      document.removeEventListener("visibilitychange", off);
    };
  }, []);

  useEffect(() => {
    if (!big) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [big]);

  return (
    <div className={shield ? "qrbox protect shield" : "qrbox protect"}>
      <button className="qrbtn" onClick={() => setBig(true)} aria-label="Perbesar QR">
        <QrCanvas token={token} size={240} className={used ? "qr used" : "qr"} />
      </button>
      <strong>{name}</strong>
      {used ? (
        <div className="err">
          QR sudah digunakan pada {fmtDateTime(used)}
        </div>
      ) : (
        <button className="btn" onClick={() => setBig(true)}>Perbesar untuk di-scan</button>
      )}

      {big && (
        <div className={shield ? "qrfull protect shield" : "qrfull protect"} onClick={() => setBig(false)}>
          <QrCanvas token={token} size={Math.min(560, typeof window !== "undefined" ? window.innerWidth - 32 : 320)} className="qrbig" />
          <h2 style={{ margin: "12px 0 0" }}>{name}</h2>
          <p className="muted small">Naikkan kecerahan layar · ketuk di mana saja untuk menutup</p>
        </div>
      )}
    </div>
  );
}
