"use client";
import { useEffect, useState } from "react";

export default function Countdown({ target }: { target: string }) {
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setLeft(Math.max(0, new Date(target).getTime() - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [target]);

  if (left === null) return <div className="countdown" style={{ minHeight: 70 }} />;
  const s = Math.floor(left / 1000);
  const items = [
    ["Hari", Math.floor(s / 86400)],
    ["Jam", Math.floor((s % 86400) / 3600)],
    ["Menit", Math.floor((s % 3600) / 60)],
    ["Detik", s % 60],
  ];
  return (
    <div className="countdown">
      {items.map(([label, n]) => (
        <div key={label}><b>{String(n).padStart(2, "0")}</b><span>{label}</span></div>
      ))}
    </div>
  );
}
