"use client";
import { useEffect, useRef, useState } from "react";

type Variant = "up" | "left" | "right" | "zoom";

// Memunculkan elemen dengan animasi saat masuk layar (sekali saja).
export default function Reveal({
  children, variant = "up", delay = 0, className = "", as: Tag = "div",
}: {
  children: React.ReactNode; variant?: Variant; delay?: number; className?: string; as?: "div" | "section";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setShown(true); return; }
    const io = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) { setShown(true); io.disconnect(); } },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as React.RefObject<never>}
      className={`reveal ${variant} ${shown ? "in" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}
