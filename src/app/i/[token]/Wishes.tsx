"use client";
import { useCallback, useEffect, useState } from "react";
import type { Wish } from "@/lib/db";
import { fmtDate } from "@/lib/format";

const POLL_MS = 5000;

export default function Wishes({ token, guestId, initial }: { token: string; guestId: string; initial: Wish[] }) {
  const [wishes, setWishes] = useState(initial);
  const mine = wishes.find((w) => w.guestId === guestId)?.message ?? "";
  const [text, setText] = useState(mine);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/wishes?token=${encodeURIComponent(token)}`, { cache: "no-store" });
      if (res.ok) setWishes(await res.json());
    } catch {
      /* offline: coba lagi di putaran berikutnya */
    }
  }, [token]);

  // Polling berkala (dijeda saat tab tidak terlihat) + segarkan saat tab kembali aktif.
  useEffect(() => {
    const tick = () => { if (!document.hidden) refresh(); };
    const t = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", tick); };
  }, [refresh]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/wishes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, message: text }),
    });
    setBusy(false);
    if (res.ok) {
      setMsg(mine ? "Ucapan diperbarui. Terima kasih!" : "Terima kasih atas ucapannya!");
      await refresh();
    } else {
      setMsg("Gagal mengirim, coba lagi.");
    }
  }

  return (
    <>
      <form onSubmit={submit} className="stack" style={{ textAlign: "left" }}>
        <textarea rows={3} maxLength={300} placeholder="Tulis ucapan & doa untuk mempelai..."
          value={text} onChange={(e) => setText(e.target.value)} required />
        <div className="row between">
          <span className="muted small">{text.length}/300</span>
          <button className="btn" disabled={busy || !text.trim()}>{busy ? "Mengirim..." : mine ? "Perbarui" : "Kirim"}</button>
        </div>
        {msg && <p className="muted small" style={{ margin: 0 }}>{msg}</p>}
      </form>

      <div className="wishes">
        {wishes.map((w) => (
          <div key={w.id} className="wish">
            <strong>{w.name}</strong>
            <p>{w.message}</p>
            <span className="muted small">{fmtDate(w.createdAt)}</span>
          </div>
        ))}
        {!wishes.length && <p className="muted small">Jadilah yang pertama memberi ucapan.</p>}
      </div>
    </>
  );
}
