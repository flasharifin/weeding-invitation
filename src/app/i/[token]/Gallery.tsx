"use client";
import { useEffect, useState } from "react";
import Photo from "@/components/Photo";

export default function Gallery({ photos }: { photos: string[] }) {
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => (i === null ? i : (i + 1) % photos.length));
      if (e.key === "ArrowLeft") setOpen((i) => (i === null ? i : (i - 1 + photos.length) % photos.length));
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [open, photos.length]);

  return (
    <>
      <div className="gallery">
        {photos.map((src, i) => (
          <button key={src} className="gitem" onClick={() => setOpen(i)} aria-label={`Foto ${i + 1}`}>
            <Photo src={src} alt={`Galeri ${i + 1}`} sizes="(max-width: 520px) 45vw, 240px" />
          </button>
        ))}
      </div>

      {open !== null && (
        <div className="lightbox" onClick={() => setOpen(null)}>
          <div className="lbimg"><Photo src={photos[open]} alt={`Galeri ${open + 1}`} sizes="100vw" /></div>
          <button className="lbnav prev" onClick={(e) => { e.stopPropagation(); setOpen((open - 1 + photos.length) % photos.length); }} aria-label="Sebelumnya">‹</button>
          <button className="lbnav next" onClick={(e) => { e.stopPropagation(); setOpen((open + 1) % photos.length); }} aria-label="Berikutnya">›</button>
          <span className="lbcount">{open + 1} / {photos.length}</span>
        </div>
      )}
    </>
  );
}
