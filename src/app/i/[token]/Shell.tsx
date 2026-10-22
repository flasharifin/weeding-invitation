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
          <div className="ring r1" /><div className="ring r2" />
          <Floral className="fl tl" /><Floral className="fl tr" /><Floral className="fl bl" /><Floral className="fl br" />
          <p className="eyebrow cv" style={delay(200)}>The Wedding Of</p>
          <h1 className="script names cv" style={delay(500)}>{bride} <span>&amp;</span> {groom}</h1>
          <div className="orn cv" style={delay(800)}><i /><b>✦</b><i /></div>
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
          <Floral className="fl tl" /><Floral className="fl br" />
        </div>
      )}

      <div className={phase === "closed" ? "stage" : "stage on"}>{children}</div>
    </>
  );
}
