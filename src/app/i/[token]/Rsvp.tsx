"use client";
import { useState } from "react";

export default function Rsvp({ token, initial }: { token: string; initial: "hadir" | "tidak" | null }) {
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function send(rsvp: "hadir" | "tidak") {
    setBusy(true);
    const res = await fetch("/api/rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, rsvp }),
    });
    if (res.ok) setValue(rsvp);
    setBusy(false);
  }

  return (
    <div className="stack">
      <div className="row">
        <button className={value === "hadir" ? "btn" : "btn ghost"} disabled={busy} onClick={() => send("hadir")}>Hadir</button>
        <button className={value === "tidak" ? "btn" : "btn ghost"} disabled={busy} onClick={() => send("tidak")}>Tidak Hadir</button>
      </div>
      {value && <p className="muted small">Terima kasih, konfirmasi Anda: <strong>{value === "hadir" ? "Hadir" : "Tidak hadir"}</strong></p>}
    </div>
  );
}
