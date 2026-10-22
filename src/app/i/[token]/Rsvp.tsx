"use client";
import { useState } from "react";

export default function Rsvp({ token, initial, name, pax, preview = false }: {
  token: string; initial: "hadir" | "tidak" | null; name: string; pax: number; preview?: boolean;
}) {
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!value || busy) return;
    setBusy(true);
    setMessage("");
    setFailed(false);
    try {
      if (!preview) {
        const response = await fetch("/api/rsvp", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, rsvp: value }),
        });
        if (!response.ok) throw new Error("RSVP gagal");
      }
      setMessage(preview ? "Simulasi berhasil. Konfirmasi ini tidak disimpan." : "Terima kasih, konfirmasi kehadiran Anda telah disimpan.");
    } catch {
      setFailed(true);
      setMessage("Konfirmasi belum terkirim. Periksa koneksi dan coba lagi.");
    } finally { setBusy(false); }
  }

  return (
    <form className="garden-form" onSubmit={send}>
      <label htmlFor="guest-name">Nama tamu</label>
      <input id="guest-name" value={name} readOnly />
      <fieldset disabled={busy}>
        <legend>Kehadiran</legend>
        <div className="garden-radio-row">
          <label><input type="radio" name="attendance" value="hadir" checked={value === "hadir"}
            onChange={() => { setValue("hadir"); setMessage(""); }} required /> Hadir</label>
          <label><input type="radio" name="attendance" value="tidak" checked={value === "tidak"}
            onChange={() => { setValue("tidak"); setMessage(""); }} required /> Tidak hadir</label>
        </div>
      </fieldset>
      <label htmlFor="guest-pax">Jumlah tamu dalam undangan</label>
      <input id="guest-pax" value={`${pax} orang`} readOnly />
      <button className="btn" disabled={busy || !value}>{busy ? "Mengirim…" : "Kirim Konfirmasi"}</button>
      {initial && !message && <p className="garden-form-message">Konfirmasi tersimpan: {initial === "hadir" ? "Hadir" : "Tidak hadir"}.</p>}
      <p role="status" className={`garden-form-message ${failed ? "err" : ""}`}>{message}</p>
    </form>
  );
}
