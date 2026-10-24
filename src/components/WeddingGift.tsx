"use client";

import { useEffect, useRef, useState } from "react";
import type { GiftSettings } from "@/lib/wedding-gift";
import Divider from "./Divider";

export default function WeddingGift({ settings, name, token, preview = false }: {
  settings: GiftSettings; name: string; token: string; preview?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const previousOverflow = useRef<string | null>(null);
  const [copyStatus, setCopyStatus] = useState("");
  const [kind, setKind] = useState("money");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const submissionId = useRef<string | null>(null);
  const sending = useRef(false);

  function unlock() {
    if (previousOverflow.current !== null) {
      document.body.style.overflow = previousOverflow.current;
      previousOverflow.current = null;
    }
  }
  useEffect(() => () => {
    if (previousOverflow.current !== null) document.body.style.overflow = previousOverflow.current;
  }, []);

  function open() {
    if (!dialog.current || dialog.current.open) return;
    previousOverflow.current = document.body.style.overflow;
    dialog.current.showModal();
    document.body.style.overflow = "hidden";
  }
  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus(`${label} berhasil disalin.`);
    } catch {
      setCopyStatus(`Belum bisa menyalin otomatis. Silakan pilih dan salin ${label.toLowerCase()} pada kartu.`);
    }
  }
  async function confirm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending.current || submitted) return;
    const data = new FormData(e.currentTarget);
    const sender = String(data.get("sender") || "").trim();
    if (!sender) { setStatus("Mohon isi nama pengirim."); return; }
    if (preview) { setStatus("Simulasi berhasil. Konfirmasi hadiah ini tidak dikirim atau disimpan."); return; }
    sending.current = true;
    setBusy(true);
    setStatus("");
    try {
      submissionId.current ??= crypto.randomUUID();
      const response = await fetch("/api/gifts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, id: submissionId.current, sender, kind,
          destination: data.get("destination"), amount: kind === "money" ? Number(data.get("amount")) : null,
          description: kind === "parcel" ? String(data.get("description") || "").trim() : null }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "Konfirmasi belum tersimpan. Silakan coba lagi.");
      setSubmitted(true);
      setStatus("Terima kasih. Konfirmasi hadiah Anda telah tersimpan dan dapat dilihat oleh mempelai.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Konfirmasi belum tersimpan. Periksa koneksi dan coba lagi.");
    } finally { sending.current = false; setBusy(false); }
  }

  return <section className="garden-gift" id="wedding-gift" aria-labelledby="gift-heading">
    <div className="garden-gift-scroll">
      <div className="crest" aria-hidden="true" />
      <p className="garden-eyebrow">Tanda kasih untuk mempelai</p>
      <h2 id="gift-heading">Wedding Gift</h2>
      <p>Kehadiran dan doa restu Anda merupakan hadiah terindah bagi kami. Apabila Anda ingin memberikan tanda kasih, silakan melalui tombol di bawah ini.</p>
      <button type="button" className="btn garden-gift-trigger" onClick={open} aria-haspopup="dialog"><span aria-hidden="true">❧</span> Wedding Gift <span aria-hidden="true">❧</span></button>
    </div>
    <dialog ref={dialog} className="garden-gift-dialog" aria-labelledby="gift-dialog-title" onClose={unlock}
      onClick={e => { if (e.target === e.currentTarget) { const r = e.currentTarget.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) e.currentTarget.close(); } }}>
      <div className="garden-gift-dialog-head">
        <p className="garden-eyebrow">With love & gratitude</p>
        <h2 id="gift-dialog-title">Wedding Gift</h2>
        <button type="button" className="garden-gift-close" onClick={() => dialog.current?.close()} aria-label="Tutup Wedding Gift" autoFocus>×</button>
      </div>
      <div className="garden-gift-dialog-body">
        <p className="garden-gift-intro">Kirim tanda kasih melalui rekening, dompet digital, atau alamat berikut.</p>
        {preview && <p className="garden-gift-demo">Preview · Data contoh, jangan digunakan untuk transfer atau pengiriman.</p>}
        {!settings.accounts.length && !settings.shipping && <p className="garden-gift-demo">Data rekening dan alamat penerima belum diisi. Formulir dapat dilengkapi setelah tujuan hadiah tersedia.</p>}
        <div className="garden-gift-cards">
          {!settings.accounts.length && ["BNI", "BCA", "ShopeePay"].map(provider => <article className="garden-gift-card" key={provider}>
            <p className={`garden-gift-provider gift-provider-${provider.toLowerCase()}`}>{provider}</p>
            <div className="garden-gift-seal" aria-hidden="true">❧</div>
            <p className="garden-gift-number">•••• •••• ••••</p>
            <p className="garden-gift-owner">Rekening dan nama pemilik belum diisi</p>
            <button className="btn garden-gift-copy" type="button" disabled>Belum tersedia</button>
          </article>)}
          {settings.accounts.map(account => <article className="garden-gift-card" key={account.id}>
            <p className={`garden-gift-provider gift-provider-${account.id}`}>{account.provider}</p>
            <div className="garden-gift-seal" aria-hidden="true">❧</div>
            <p className="garden-gift-number">{account.number}</p>
            <p className="garden-gift-owner">a.n. {account.owner}</p>
            <button className="btn garden-gift-copy" type="button" onClick={() => copy(account.number, `Nomor ${account.provider}`)} aria-label={`Salin nomor ${account.provider}`}>▣ Salin</button>
          </article>)}
          {!settings.shipping && <article className="garden-gift-card garden-gift-shipping">
            <h3>Send a Gift</h3>
            <p className="garden-gift-owner">Nama penerima belum diisi</p>
            <p className="garden-gift-address">Alamat pengiriman hadiah belum tersedia.</p>
            <button type="button" className="btn garden-gift-copy" disabled>Belum tersedia</button>
          </article>}
          {settings.shipping && <article className="garden-gift-card garden-gift-shipping">
            <h3>Send a Gift</h3>
            <p className="garden-gift-owner">{settings.shipping.recipient}</p>
            <p className="garden-gift-address">{settings.shipping.address}</p>
            <button type="button" className="btn garden-gift-copy" onClick={() => copy(`${settings.shipping!.recipient}\n${settings.shipping!.address}`, "Alamat pengiriman")}>▣ Salin alamat</button>
          </article>}
        </div>
        <p className="garden-gift-status" role="status">{copyStatus}</p>
        <form className="garden-form garden-gift-form" onSubmit={confirm} onChange={() => { if (!submitted) setStatus(""); }}>
          <h3>Konfirmasi Hadiah</h3>
          <p>Silakan lengkapi informasi berikut untuk membantu kami mengenali tanda kasih Anda.</p>
          <fieldset disabled={busy || submitted} className="garden-gift-fields"><label htmlFor="gift-sender">Nama pengirim</label>
          <input id="gift-sender" name="sender" defaultValue={preview ? "" : name} placeholder="Nama Anda" maxLength={120} required autoComplete="name" />
          <fieldset><legend>Jenis hadiah</legend>
            <label><input type="radio" name="gift-kind" checked={kind === "money"} onChange={() => setKind("money")} /> Transfer uang</label>
            <label><input type="radio" name="gift-kind" checked={kind === "parcel"} onChange={() => setKind("parcel")} /> Kirim hadiah</label>
          </fieldset>
          <fieldset key={kind}><legend>Tujuan pengiriman</legend>
            {kind === "money" ? settings.accounts.map(account => <label key={account.id}><input type="radio" name="destination" value={account.id} required /> {account.provider} a.n. {account.owner}</label>)
              : settings.shipping && <label><input type="radio" name="destination" value="shipping" required /> Hadiah untuk {settings.shipping.recipient}</label>}
            {(kind === "money" ? !settings.accounts.length : !settings.shipping) && <p>Tujuan ini belum tersedia.</p>}
          </fieldset>
          {kind === "money" ? <><label htmlFor="gift-amount">Nominal (Rp)</label><input id="gift-amount" name="amount" type="number" inputMode="numeric" placeholder="Contoh: 500000" min="1" max="999999999999" step="1" required /></>
            : <><label htmlFor="gift-description">Nama hadiah / nomor resi</label><input id="gift-description" name="description" placeholder="Contoh: Perlengkapan rumah · resi pengiriman" maxLength={250} required /></>}
          </fieldset>
          {(kind === "money" ? !settings.accounts.length : !settings.shipping) && <p className="garden-gift-demo">Konfirmasi belum dapat dikirim karena {kind === "money" ? "rekening penerima" : "alamat penerima"} belum diisi.</p>}
          <button type="submit" className="btn" disabled={busy || submitted || (kind === "money" ? !settings.accounts.length : !settings.shipping)}>{busy ? "Menyimpan…" : submitted ? "Konfirmasi Tersimpan" : "Kirim Konfirmasi Hadiah"}</button>
          <p role="status" className="garden-gift-status">{status}</p>
        </form>
        <Divider />
        <p className="garden-gift-thanks">Terima kasih atas setiap tanda kasih Anda.</p>
      </div>
    </dialog>
  </section>;
}
