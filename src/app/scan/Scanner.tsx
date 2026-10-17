"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { fmtTime } from "@/lib/format";

type Result =
  | { status: "ok"; guest: { name: string; pax: number } }
  | { status: "already"; guest: { name: string; checkedInAt: string; checkedInBy: string | null } }
  | { status: "invalid" }
  | { status: "error" };

export default function Scanner() {
  const [result, setResult] = useState<Result | null>(null);
  const [manual, setManual] = useState("");
  const [camError, setCamError] = useState("");
  const busy = useRef(false);
  const scanner = useRef<Html5Qrcode | null>(null);

  const submit = useCallback(async (token: string) => {
    if (busy.current) return;
    busy.current = true;
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      setResult(res.ok ? await res.json() : { status: "error" });
    } catch {
      setResult({ status: "error" });
    }
    if (navigator.vibrate) navigator.vibrate(100);
  }, []);

  useEffect(() => {
    const s = new Html5Qrcode("reader");
    scanner.current = s;
    let started = false;
    s.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 240, height: 240 } },
      (text) => submit(text), () => {})
      .then(() => { started = true; })
      .catch(() => setCamError("Kamera tidak bisa diakses. Izinkan akses kamera atau pakai input manual."));
    return () => {
      if (started) s.stop().then(() => s.clear()).catch(() => {});
    };
  }, [submit]);

  function next() {
    busy.current = false;
    setResult(null);
    setManual("");
  }

  const color = result?.status === "ok" ? "good" : "bad";

  return (
    <main className="scanpage">
      <header className="row between">
        <h2 style={{ margin: 0 }}>Scan Tamu</h2>
        <a className="btn sm ghost" href="/admin">Dashboard</a>
      </header>
      <div id="reader" className="reader" />
      {camError && <div className="err">{camError}</div>}

      <form className="row" onSubmit={(e) => { e.preventDefault(); if (manual.trim()) submit(manual.trim()); }}>
        <input placeholder="Atau ketik kode manual" value={manual} onChange={(e) => setManual(e.target.value)} />
        <button className="btn" disabled={!manual.trim()}>Cek</button>
      </form>

      {result && (
        <div className={`overlay ${color}`}>
          {result.status === "ok" && (
            <>
              <div className="icon">✓</div>
              <h1>Selamat datang</h1>
              <h2>{result.guest.name}</h2>
              <p>{result.guest.pax} orang</p>
            </>
          )}
          {result.status === "already" && (
            <>
              <div className="icon">✕</div>
              <h1>Sudah digunakan</h1>
              <h2>{result.guest.name}</h2>
              <p>Check-in pukul {fmtTime(result.guest.checkedInAt)}</p>
            </>
          )}
          {result.status === "invalid" && (<><div className="icon">✕</div><h1>QR tidak valid</h1></>)}
          {result.status === "error" && (<><div className="icon">!</div><h1>Gagal terhubung</h1><p>Periksa internet/login lalu coba lagi.</p></>)}
          <button className="btn light" onClick={next}>Scan berikutnya</button>
        </div>
      )}
    </main>
  );
}
