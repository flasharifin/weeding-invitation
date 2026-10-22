"use client";
import { useEffect, useRef, useState } from "react";
import Petals from "./Petals";
import Floral from "@/components/Floral";

type Phase = "closed" | "opening" | "open";
const delay = (n: number) => ({ "--d": n }) as React.CSSProperties;

// Cover "Buka Undangan" + musik latar. Browser memblokir autoplay,
// jadi musik baru dimulai setelah tamu menekan tombol buka.
export default function Shell({
  name, bride, groom, music, children,
}: { name: string; bride: string; groom: string; music: string; children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>("closed");

  // ?preview=1 melewati cover untuk memeriksa isi undangan.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("preview")) setPhase("open");
  }, []);
  const [playing, setPlaying] = useState(false);
  const [hasMusic, setHasMusic] = useState(true);
  const audio = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    document.body.style.overflow = phase === "open" ? "" : "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [phase]);

  function open() {
    if (phase !== "closed") return;
    setPhase("opening");
    audio.current?.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    window.scrollTo(0, 0);
    setTimeout(() => setPhase("open"), 1000); // sesuai durasi animasi coverOut
  }

  function toggle() {
    const a = audio.current;
    if (!a) return;
    if (a.paused) a.play().then(() => setPlaying(true)).catch(() => {});
    else { a.pause(); setPlaying(false); }
  }

  return (
    <>
      <audio ref={audio} src={music} loop preload="auto" onError={() => setHasMusic(false)} />
      <Petals top={phase === "closed"} />

      {phase !== "open" && (
        <div className={phase === "opening" ? "cover leaving" : "cover"}>
          <span className="cnr tl" aria-hidden="true" /><span className="cnr tr" aria-hidden="true" />
          <span className="cnr bl" aria-hidden="true" /><span className="cnr br" aria-hidden="true" />
          <Floral spot="cover-tl" /><Floral spot="cover-tr" /><Floral spot="cover-bl" /><Floral spot="cover-br" />
          <div className="monogram cv" style={delay(150)}><span>{bride.charAt(0)}&nbsp;{groom.charAt(0)}</span></div>
          <p className="eyebrow cv" style={delay(400)}>The Wedding Of</p>
          <h1 className="names cv" style={delay(600)}>{bride} <span>&amp;</span> {groom}</h1>
          <div className="divider cv" style={{ ...delay(850), maxWidth: 150 }}><i /></div>
          <p className="muted cv" style={delay(1000)}>Kepada Yth.</p>
          <h2 className="cv" style={{ ...delay(1200), margin: "4px 0 26px" }}>{name}</h2>
          <button className="btn pulse cv" style={delay(1500)} onClick={open}>Buka Undangan</button>
        </div>
      )}

      {phase === "open" && hasMusic && (
        <button className={playing ? "music playing" : "music"} onClick={toggle} aria-label={playing ? "Matikan musik" : "Putar musik"}>
          {playing ? "♫" : "♪"}
        </button>
      )}

      {phase !== "closed" && (
        <div className="page-floral" aria-hidden="true">
          <Floral spot="page-tl" /><Floral spot="page-br" />
        </div>
      )}

      <div className={phase === "closed" ? "stage" : "stage on"}>{children}</div>
    </>
  );
}
