"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Guest, Wish } from "@/lib/db";
import { event } from "@/lib/config";
import { fmtTime } from "@/lib/format";

function waLink(g: Guest, origin: string) {
  const url = `${origin}/i/${g.token}`;
  const text =
    `Assalamu'alaikum, Kepada Yth. ${g.name}\n\n` +
    `Dengan memohon rahmat Allah SWT, kami mengundang Anda ke pernikahan ` +
    `${event.bride} & ${event.groom} pada ${event.dateText}.\n\n` +
    `Buka undangan & QR check-in Anda di sini:\n${url}\n\nTerima kasih.`;
  let phone = (g.phone || "").replace(/\D/g, "");
  if (phone.startsWith("0")) phone = "62" + phone.slice(1);
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export default function AdminClient({ initial, initialWishes }: { initial: Guest[]; initialWishes: Wish[] }) {
  const router = useRouter();
  const [guests, setGuests] = useState(initial);
  const [wishes, setWishes] = useState(initialWishes);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pax, setPax] = useState(1);
  const [csv, setCsv] = useState("");
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  // diisi setelah mount agar HTML server & client sama saat hydration
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const stats = useMemo(() => {
    const sum = (f: (g: Guest) => boolean) => guests.filter(f).reduce((a, g) => a + g.pax, 0);
    return {
      total: guests.length,
      pax: sum(() => true),
      hadir: guests.filter((g) => g.rsvp === "hadir").length,
      tidak: guests.filter((g) => g.rsvp === "tidak").length,
      checked: guests.filter((g) => g.checkedInAt).length,
      checkedPax: sum((g) => !!g.checkedInAt),
    };
  }, [guests]);

  const shown = guests.filter((g) => g.name.toLowerCase().includes(q.toLowerCase()));

  async function reload() {
    const res = await fetch("/api/guests", { cache: "no-store" });
    if (res.ok) setGuests(await res.json());
  }

  // Dashboard live: tamu (check-in, RSVP) dan ucapan diperbarui otomatis tiap 5 detik,
  // dijeda saat tab tidak terlihat.
  useEffect(() => {
    const tick = async () => {
      if (document.hidden) return;
      try {
        const [g, w] = await Promise.all([
          fetch("/api/guests", { cache: "no-store" }),
          fetch("/api/wishes", { cache: "no-store" }),
        ]);
        if (g.ok) setGuests(await g.json());
        if (w.ok) setWishes(await w.json());
      } catch {
        /* offline: coba lagi nanti */
      }
    };
    const t = setInterval(tick, 5000);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", tick); };
  }, []);

  async function post(body: unknown) {
    const res = await fetch("/api/guests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setMsg(res.ok ? `${data.added} tamu ditambahkan` : data.error);
    if (res.ok) await reload();
    return res.ok;
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (await post({ name, phone, pax })) {
      setName(""); setPhone(""); setPax(1);
    }
  }

  async function importCsv() {
    // format per baris: nama,telepon,jumlah
    const rows = csv.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
      const [n, p, x] = l.split(",").map((s) => s.trim());
      return { name: n, phone: p, pax: Number(x) || 1 };
    });
    if (await post(rows)) setCsv("");
  }

  // Panggil API dan tampilkan pesan jelas jika gagal (mis. sesi login habis).
  async function act(url: string, init: RequestInit, okMsg: string) {
    try {
      const res = await fetch(url, init);
      if (res.status === 401) {
        setMsg("Sesi login habis. Silakan login ulang.");
        router.replace("/login?next=/admin");
        return false;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setMsg(`Gagal (${res.status}): ${data?.error ?? "terjadi kesalahan di server"}`);
        return false;
      }
      setMsg(okMsg);
      await reload();
      return true;
    } catch {
      setMsg("Gagal terhubung ke server. Periksa koneksi internet.");
      return false;
    }
  }

  async function remove(g: Guest) {
    if (!confirm(`Hapus ${g.name}?`)) return;
    await act(`/api/guests/${g.id}`, { method: "DELETE" }, `${g.name} dihapus`);
  }

  async function removeWish(w: Wish) {
    if (!confirm(`Hapus ucapan dari ${w.name}?`)) return;
    await fetch(`/api/wishes/${w.id}`, { method: "DELETE" });
    setWishes((all) => all.filter((x) => x.id !== w.id));
  }

  async function reset(g: Guest) {
    if (!confirm(`Reset check-in ${g.name}? QR bisa dipakai lagi.`)) return;
    await act(`/api/guests/${g.id}`, { method: "PATCH" }, `Check-in ${g.name} direset, QR bisa dipakai lagi`);
  }

  async function manualCheckin(g: Guest) {
    if (!confirm(`Check-in manual ${g.name}?`)) return;
    await act("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: g.token }),
    }, `${g.name} dicheck-in`);
  }

  async function copy(g: Guest) {
    await navigator.clipboard.writeText(`${origin}/i/${g.token}`);
    setMsg(`Link ${g.name} disalin`);
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <main className="admin">
      <header className="row between wrap">
        <h1 style={{ margin: 0 }}>Dashboard Tamu</h1>
        <div className="row">
          <a className="btn ghost" href="/api/export?type=guests" download>Ekspor Tamu (CSV)</a>
          <a className="btn ghost" href="/api/export?type=wishes" download>Ekspor Ucapan (CSV)</a>
          <a className="btn ghost" href="/scan">Scanner</a>
          <button className="btn ghost" onClick={logout}>Keluar</button>
        </div>
      </header>

      <div className="stats">
        <div><b>{stats.total}</b><span>Undangan</span></div>
        <div><b>{stats.pax}</b><span>Total orang</span></div>
        <div><b>{stats.hadir}</b><span>RSVP hadir</span></div>
        <div><b>{stats.tidak}</b><span>RSVP tidak</span></div>
        <div><b>{stats.checked}/{stats.total}</b><span>Sudah check-in</span></div>
        <div><b>{stats.checkedPax}</b><span>Orang hadir</span></div>
      </div>

      {msg && <div className="note" onClick={() => setMsg("")}>{msg}</div>}

      <div className="grid2">
        <form onSubmit={add} className="card stack">
          <h3 style={{ margin: 0 }}>Tambah tamu</h3>
          <input placeholder="Nama tamu" value={name} onChange={(e) => setName(e.target.value)} required />
          <input placeholder="No. WhatsApp (08xxx)" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input type="number" min={1} max={20} value={pax} onChange={(e) => setPax(Number(e.target.value))} />
          <button className="btn">Tambah</button>
        </form>
        <div className="card stack">
          <h3 style={{ margin: 0 }}>Impor banyak</h3>
          <textarea rows={5} placeholder={"Satu tamu per baris:\nnama,telepon,jumlah\nBudi,08123456789,2"}
            value={csv} onChange={(e) => setCsv(e.target.value)} />
          <button className="btn" onClick={importCsv} disabled={!csv.trim()}>Impor</button>
        </div>
      </div>

      <input placeholder="Cari nama..." value={q} onChange={(e) => setQ(e.target.value)} />

      <div className="list">
        {shown.map((g) => (
          <div key={g.id} className="guest">
            <div>
              <strong>{g.name}</strong> <span className="muted small">· {g.pax} orang</span>
              <div className="small muted">
                RSVP: {g.rsvp ?? "-"} ·{" "}
                {g.checkedInAt
                  ? <span className="ok">Hadir {fmtTime(g.checkedInAt)}</span>
                  : "Belum check-in"}
              </div>
            </div>
            <div className="row wrap">
              <a className="btn sm" href={waLink(g, origin)} target="_blank" rel="noreferrer">Kirim WA</a>
              <button className="btn sm ghost" onClick={() => copy(g)}>Salin link</button>
              <a className="btn sm ghost" href={`/i/${g.token}`} target="_blank" rel="noreferrer">Lihat</a>
              {g.checkedInAt
                ? <button className="btn sm ghost" onClick={() => reset(g)}>Reset</button>
                : <button className="btn sm ghost" onClick={() => manualCheckin(g)}>Check-in manual</button>}
              <button className="btn sm danger" onClick={() => remove(g)}>Hapus</button>
            </div>
          </div>
        ))}
        {!shown.length && <p className="muted">Belum ada tamu.</p>}
      </div>

      <h2 style={{ margin: "16px 0 0" }}>Buku Ucapan ({wishes.length})</h2>
      <div className="list">
        {wishes.map((w) => (
          <div key={w.id} className="guest">
            <div>
              <strong>{w.name}</strong>
              <div className="small" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{w.message}</div>
            </div>
            <button className="btn sm danger" onClick={() => removeWish(w)}>Hapus</button>
          </div>
        ))}
        {!wishes.length && <p className="muted">Belum ada ucapan.</p>}
      </div>
    </main>
  );
}
