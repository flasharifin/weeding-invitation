"use client";

import { useEffect, useRef, useState } from "react";
import { MEMORY_LIMIT, MEMORY_MAX_BYTES, type MemoryPhoto } from "@/lib/memories";

type DisplayPhoto = MemoryPhoto & { url?: string };
type PendingPhoto = { file: File; id: string };

async function compress(file: File): Promise<Blob> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Gunakan foto JPG, PNG, atau WebP.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Ukuran foto asli maksimal 10 MB.");
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); }
  catch { throw new Error("Foto tidak dapat dibaca. Coba foto JPG, PNG, atau WebP lain."); }
  try {
    const ratio = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Browser belum mendukung upload foto. Coba browser lain.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [.82, .68, .5]) {
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", quality));
      if (blob && blob.size <= MEMORY_MAX_BYTES) return blob;
    }
    throw new Error("Foto masih terlalu besar. Pilih foto berukuran lebih kecil.");
  } finally { bitmap.close(); }
}

export default function SharingMemories({ token, preview = false }: { token: string; preview?: boolean }) {
  const [photos, setPhotos] = useState<DisplayPhoto[]>([]);
  const [ready, setReady] = useState(preview);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState<PendingPhoto[]>([]);
  const [reload, setReload] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const sending = useRef(false);
  const previewUrls = useRef<string[]>([]);
  const alive = useRef(true);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; abort.current?.abort(); previewUrls.current.forEach(url => URL.revokeObjectURL(url)); };
  }, []);
  useEffect(() => {
    if (preview) return;
    const controller = new AbortController();
    setReady(false);
    setMessage("");
    fetch(`/api/memories?token=${encodeURIComponent(token)}`, { cache: "no-store", signal: controller.signal })
      .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error); return data; })
      .then(data => { if (!controller.signal.aborted) { setPhotos(data.photos); setReady(true); setFailed(false); } })
      .catch(error => { if (!controller.signal.aborted) { setFailed(true); setMessage(error.message || "Foto belum dapat dimuat."); } });
    return () => controller.abort();
  }, [token, preview, reload]);

  async function upload(items: PendingPhoto[]) {
    if (sending.current || !ready || !items.length) return;
    sending.current = true;
    setBusy(true); setFailed(false); setMessage("");
    abort.current = new AbortController();
    let completed = 0;
    try {
      for (const item of items) {
        if (!alive.current) return;
        setMessage(`Mengunggah foto ${completed + 1} dari ${items.length}…`);
        const blob = await compress(item.file);
        if (!alive.current) return;
        if (preview) {
          const url = URL.createObjectURL(blob);
          previewUrls.current.push(url);
          setPhotos(previous => [...previous, { id: item.id, guestId: "preview", slot: previous.length + 1, createdAt: new Date().toISOString(), url }]);
        } else {
          const response = await fetch("/api/memories", { method: "POST", signal: abort.current.signal,
            headers: { "Content-Type": "image/jpeg", "X-Invitation-Token": token, "X-Upload-Id": item.id }, body: blob });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Foto belum tersimpan. Silakan coba lagi.");
          if (!alive.current) return;
          setPhotos(data.photos);
        }
        completed++;
        setPending(items.slice(completed));
      }
      setMessage(preview ? `${completed} foto ditampilkan sebagai simulasi. Foto tidak disimpan dan hilang saat halaman dimuat ulang.` : `${completed} foto berhasil disimpan. Terima kasih telah berbagi kenangan!`);
    } catch (error) {
      if (alive.current) {
        setFailed(true);
        setMessage(`${completed ? `${completed} foto sudah tersimpan. ` : ""}${error instanceof Error ? error.message : "Upload gagal."} Foto yang belum berhasil dapat dicoba lagi.`);
      }
    } finally { sending.current = false; if (alive.current) setBusy(false); }
  }

  function choose(files: FileList | null) {
    if (!files?.length || sending.current) return;
    const remaining = MEMORY_LIMIT - photos.length;
    if (files.length > remaining) { setFailed(true); setMessage(`Sisa kuota ${remaining} foto. Pilih maksimal ${remaining} foto.`); return; }
    const items = Array.from(files, file => ({ file, id: crypto.randomUUID() }));
    setPending(items);
    void upload(items);
  }

  return <div className="garden-memories-content">
    <p className="garden-intro">Abadikan momen bahagia dari sudut pandang Anda.<br />Bagikan foto dan kenangan bersama kami.</p>
    <div className="garden-memories-upload">
      <span className="garden-memories-camera" aria-hidden="true">▧</span>
      <p className="garden-memories-count">{ready ? `${photos.length} / ${MEMORY_LIMIT} foto` : "Memuat foto Anda…"}</p>
      <p className="garden-memories-hint">Maksimal 10 foto per tamu · JPG, PNG, WebP<br />Maks. 10 MB per foto, dikompresi otomatis.</p>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden aria-label="Pilih foto kenangan"
        onChange={e => { choose(e.target.files); e.target.value = ""; }} />
      <button type="button" className="btn" disabled={!ready || busy || photos.length >= MEMORY_LIMIT} onClick={() => input.current?.click()}>
        {busy ? "Mengunggah…" : photos.length >= MEMORY_LIMIT ? "Kuota 10 Foto Terpenuhi" : "Upload Foto"}
      </button>
      {preview && <p className="garden-memories-hint">Preview: foto hanya ditampilkan di perangkat ini.</p>}
      {failed && !ready && <button type="button" className="btn ghost" onClick={() => setReload(value => value + 1)}>Muat ulang</button>}
      {!busy && pending.length > 0 && ready && <div className="garden-memories-retry">
        <button type="button" className="btn ghost" onClick={() => void upload(pending)}>Coba lagi ({pending.length} foto)</button>
        <button type="button" className="btn ghost" onClick={() => { setPending([]); setMessage(""); }}>Batalkan antrean</button>
      </div>}
      <p role="status" className={`garden-form-message ${failed ? "err" : ""}`}>{message}</p>
    </div>
    {photos.length > 0 && <div className="garden-memories-grid" aria-label="Foto yang Anda bagikan">
      {photos.map((photo, i) => <figure key={photo.id}>
        {/* Authenticated image endpoint: do not send this through the public image optimizer. */}
        <img src={photo.url || `/api/memories/${photo.id}?token=${encodeURIComponent(token)}`} alt={`Kenangan Anda ${i + 1}`} loading="lazy" width={320} height={320} referrerPolicy="no-referrer" />
        <figcaption>Kenangan {String(i + 1).padStart(2, "0")}</figcaption>
      </figure>)}
    </div>}
  </div>;
}
