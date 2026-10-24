"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Guest, Wish, GiftConfirmation } from "@/lib/db";
import { event } from "@/lib/config";
import { fmtTime, fmtDateTime } from "@/lib/format";

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

export default function AdminClient({ initial, initialWishes, initialGifts }: { initial: Guest[]; initialWishes: Wish[]; initialGifts: GiftConfirmation[] }) {
  const router = useRouter();
  const [guests, setGuests] = useState(initial);
  const [wishes, setWishes] = useState(initialWishes);
  const [gifts, setGifts] = useState(initialGifts);
  const [tab, setTab] = useState<"guests" | "gifts">("guests");
  const [giftQuery, setGiftQuery] = useState("");
  const [giftKind, setGiftKind] = useState("all");
  const [giftError, setGiftError] = useState("");
  const shownGifts = gifts.filter(g => (giftKind === "all" || g.kind === giftKind) &&
    `${g.sender} ${g.guestName} ${g.destination} ${g.description || ""}`.toLowerCase().includes(giftQuery.toLowerCase()));
  const rupiah = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
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
        const [g, w, gift] = await Promise.all([
          fetch("/api/guests", { cache: "no-store" }),
          fetch("/api/wishes", { cache: "no-store" }),
          fetch("/api/gifts", { cache: "no-store" }),
        ]);
        if (g.ok) setGuests(await g.json());
        if (w.ok) setWishes(await w.json());
        if (gift.ok) { setGifts(await gift.json()); setGiftError(""); }
        else setGiftError(gift.status === 401 ? "Sesi login habis. Silakan login ulang." : "Pembaruan hadiah gagal. Data terakhir tetap ditampilkan.");
      } catch {
        setGiftError("Koneksi terputus. Data terakhir ditampilkan; pembaruan akan dicoba kembali.");
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
        <div className="row wrap">
          <a className="btn ghost" href="/api/export?type=guests" download>Ekspor Tamu (CSV)</a>
          <a className="btn ghost" href="/api/export?type=wishes" download>Ekspor Ucapan (CSV)</a>
          <a className="btn ghost" href="/scan">Scanner</a>
          <button className="btn ghost" onClick={logout}>Keluar</button>
        </div>
      </header>

      <nav className="row wrap admin-tabs" aria-label="Bagian dashboard">
        <button className={`btn ${tab === "guests" ? "" : "ghost"}`} aria-pressed={tab === "guests"} onClick={() => setTab("guests")}>Tamu & Ucapan</button>
        <button className={`btn ${tab === "gifts" ? "" : "ghost"}`} aria-pressed={tab === "gifts"} onClick={() => setTab("gifts")}>Wedding Gift ({gifts.length})</button>
      </nav>
      {tab === "guests" ? <>
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
      </> : <section className="stack admin-gifts" aria-labelledby="admin-gifts-title">
        <h2 id="admin-gifts-title">Wedding Gift</h2>
        <p className="muted">Konfirmasi dari tamu · diperbarui otomatis setiap 5 detik. Nominal merupakan laporan tamu dan belum diverifikasi dengan mutasi rekening.</p>
        <div className="stats">
          <div><b>{gifts.length}</b><span>Konfirmasi masuk</span></div>
          <div><b>{gifts.filter(g => g.kind === "money").length}</b><span>Transfer uang</span></div>
          <div><b>{gifts.filter(g => g.kind === "parcel").length}</b><span>Pengiriman hadiah</span></div>
        </div>
        <p className="card">Total nominal yang dilaporkan: <strong>{rupiah(gifts.reduce((sum, g) => sum + (g.amount || 0), 0))}</strong></p>
        <div className="row wrap">
          <label className="stack">Cari konfirmasi<input value={giftQuery} onChange={e => setGiftQuery(e.target.value)} placeholder="Nama, tujuan, atau resi…" /></label>
          <div className="stack"><label htmlFor="admin-gift-kind">Jenis hadiah</label><select id="admin-gift-kind" value={giftKind} onChange={e => setGiftKind(e.target.value)}><option value="all">Semua jenis</option><option value="money">Transfer uang</option><option value="parcel">Kirim hadiah</option></select></div>
        </div>
        {giftError && <p role="status" className="note">{giftError}</p>}
        <div className="list">
          {shownGifts.map(g => <article className="card stack" key={g.id}>
            <div className="row between wrap"><strong>{g.sender}</strong><span className="small muted">{fmtDateTime(g.createdAt)}</span></div>
            <span className="small muted">Tamu undangan: {g.guestName}</span>
            <span>{g.kind === "money" ? "Transfer uang" : "Kirim hadiah"} · {g.destination}</span>
            {g.kind === "money" ? <strong>{rupiah(g.amount || 0)}</strong> : <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>Hadiah / resi: {g.description}</p>}
          </article>)}
          {!shownGifts.length && <p className="muted">{gifts.length ? "Tidak ada konfirmasi yang sesuai pencarian." : "Belum ada konfirmasi hadiah masuk."}</p>}
        </div>
      </section>}
    </main>
  );
}
