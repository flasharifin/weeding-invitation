"use client";

import { useEffect, useState } from "react";
import Divider from "./Divider";

export default function InvitationSplash({ bride, groom, onReveal, onComplete }: {
  bride: string; groom: string; onReveal: () => void; onComplete: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let disposed = false;
    let frame = 0;
    let settled = 0;
    let value = 0;
    let lastValue = 0;
    let hold: ReturnType<typeof setTimeout>;
    let exit: ReturnType<typeof setTimeout>;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const started = performance.now();
    let previous = started;
    const images = ["/garden/arch-garden.webp", "/garden/botanical-border.webp"].map(src => {
      const image = new Image();
      image.src = src;
      return image;
    });
    // Progress represents preparation of the two illustrations and fonts, not byte transfer.
    const resources = [...images.map(image => image.decode()), document.fonts.ready];
    resources.forEach(resource => {
      Promise.resolve(resource).catch(() => {}).then(() => { if (!disposed) settled++; });
    });

    function tick(now: number) {
      if (disposed) return;
      const elapsed = now - started;
      const duration = reduced.matches ? 250 : 2400;
      const ready = settled === resources.length;
      // An unavailable font or illustration must never trap a guest on the loading screen.
      const target = (ready && elapsed >= duration) || elapsed >= 8000
        ? 100 : Math.min(94, elapsed / duration * 94, 12 + settled / resources.length * 82);
      value += (target - value) * (1 - Math.exp(-(now - previous) / 110));
      previous = now;
      const next = target === 100 && value >= 99.5 ? 100 : Math.floor(value);
      if (next !== lastValue) { setProgress(next); lastValue = next; }
      if (next === 100) {
        hold = setTimeout(() => {
          setLeaving(true);
          onReveal();
          exit = setTimeout(onComplete, reduced.matches ? 0 : 900);
        }, reduced.matches ? 80 : 280);
      } else frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      clearTimeout(hold);
      clearTimeout(exit);
    };
  }, [onReveal, onComplete]);

  return (
    <div className={`garden-splash ${leaving ? "is-leaving" : ""}`} aria-label="Menyiapkan undangan">
      <div className="garden-splash-border" aria-hidden="true" />
      <div className="garden-splash-content">
        <div className="garden-splash-seal" aria-hidden="true"><span>{bride[0]}</span><i>&amp;</i><span>{groom[0]}</span></div>
        <p className="garden-eyebrow">Wedding Invitation</p>
        <h1 className="garden-splash-names">{bride} <span>&amp;</span> {groom}</h1>
        <Divider />
        <p className="garden-splash-caption">Sebuah awal, untuk selamanya.</p>
        <div className="garden-loading" role="progressbar" aria-label="Persiapan undangan" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
          <p className="garden-loading-number" aria-hidden="true">{progress}<span>%</span></p>
          <div className="garden-loading-track" aria-hidden="true"><span style={{ transform: `scaleX(${progress / 100})` }} /></div>
        </div>
      </div>
      <p className="garden-splash-foot">A MOMENT BEFORE FOREVER</p>
    </div>
  );
}
