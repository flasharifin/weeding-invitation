"use client";

import { useEffect, useRef, useState } from "react";
import Corners from "@/components/Corners";
import Divider from "@/components/Divider";
import { GardenMotionContext, GardenScene } from "@/components/GardenMotion";

export default function Shell({ name, bride, groom, date, music, preview = false, children }: {
  name: string; bride: string; groom: string; date: string; music: string;
  preview?: boolean; children: React.ReactNode;
}) {
  const [phase, setPhase] = useState<"closed" | "opening" | "open">("closed");
  const [playing, setPlaying] = useState(false);
  const [hasMusic, setHasMusic] = useState(true);
  const audio = useRef<HTMLAudioElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("preview") === "1") setPhase("open");
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, []);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = phase === "open" ? "" : "hidden";
    if (phase === "open") stage.current?.focus({ preventScroll: true });
    return () => { document.body.style.overflow = previous; };
  }, [phase]);

  function open() {
    if (phase !== "closed") return;
    setPhase("opening");
    audio.current?.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    window.scrollTo(0, 0);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    timer.current = setTimeout(() => setPhase("open"), reduced ? 0 : 800);
  }

  function toggle() {
    const player = audio.current;
    if (!player) return;
    if (player.paused) player.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    else { player.pause(); setPlaying(false); }
  }

  return (
    <div className="garden-site">
      <audio ref={audio} src={music} loop preload="none" onError={() => setHasMusic(false)} />
      <aside className="garden-desktop" aria-label={`Pernikahan ${bride} dan ${groom}`}>
        <GardenScene variant="desktop" />
        <div className="garden-desktop-copy">
          <p className="garden-eyebrow">The wedding of</p>
          <p className="garden-names">{bride}<span>&amp; {groom}</span></p>
          <Divider />
          <p className="garden-date">{date}</p>
          <p className="garden-desktop-note">Sebuah awal, untuk selamanya.</p>
        </div>
        <p className="garden-desktop-bottom">WITH LOVE, FOR OUR DEAREST FAMILY &amp; FRIENDS</p>
      </aside>
      <div className="garden-column">
        {phase !== "open" && (
          <section className={`garden-cover ${phase === "opening" ? "is-leaving" : ""}`} aria-label="Sampul undangan">
            <GardenScene variant="cover" />
            <div className="garden-cover-frame"><Corners /></div>
            {preview && <span className="garden-preview-label">Preview desain</span>}
            <div className="garden-cover-title">
              <p className="garden-eyebrow">The wedding of</p>
              <h1 className="garden-names">{bride}<span>&amp; {groom}</span></h1>
              <Divider />
              <p className="garden-date">{date}</p>
            </div>
            <div className="garden-recipient">
              <p>Kepada Yth. Bapak/Ibu/Saudara/i</p>
              <h2>{name}</h2>
              <button className="btn" onClick={open} disabled={phase === "opening"}>
                <span aria-hidden="true">✉</span> {phase === "opening" ? "Membuka undangan…" : "Buka Undangan"}
              </button>
            </div>
          </section>
        )}
        <div ref={stage} tabIndex={-1} inert={phase !== "open"} aria-hidden={phase !== "open"}
          className={`garden-stage ${phase === "open" ? "is-open" : phase === "opening" ? "is-opening" : ""}`}>
          {preview && <div className="garden-preview-banner">Preview desain · Formulir hanya untuk simulasi</div>}
          <GardenMotionContext.Provider value={phase === "open"}>{children}</GardenMotionContext.Provider>
        </div>
      </div>
      {phase === "open" && hasMusic && (
        <button className={`garden-music ${playing ? "is-playing" : ""}`} onClick={toggle}
          aria-label={playing ? "Matikan musik" : "Putar musik"} aria-pressed={playing}>
          <span aria-hidden="true">{playing ? "♫" : "♪"}</span>
        </button>
      )}
    </div>
  );
}
