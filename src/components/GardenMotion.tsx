"use client";

import { createContext, useContext, useEffect, useRef } from "react";

export const GardenMotionContext = createContext(true);

/** Event-driven updates: no animation loop, React renders, or motion-sensor permissions. */
function useGardenMotion(surfaceIsParent = false) {
  const ref = useRef<HTMLDivElement>(null);
  const enabled = useContext(GardenMotionContext);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.dataset.motionActive = "false";
    if (!enabled) return;
    const surface = surfaceIsParent ? element.parentElement : element;
    if (!surface) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    let visible = false;
    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;
    const clamp = (n: number) => Math.max(-1, Math.min(1, n));

    function reset() {
      element!.style.setProperty("--motion-x", "0");
      element!.style.setProperty("--motion-y", "0");
      element!.style.setProperty("--motion-scroll", "0");
    }

    function update() {
      frame = 0;
      if (reduced.matches || !visible || document.hidden) return;
      const bounds = surface!.getBoundingClientRect();
      const progress = clamp((window.innerHeight / 2 - bounds.top - bounds.height / 2) / (window.innerHeight / 2 + bounds.height / 2));
      element!.style.setProperty("--motion-x", pointerX.toFixed(3));
      element!.style.setProperty("--motion-y", pointerY.toFixed(3));
      element!.style.setProperty("--motion-scroll", progress.toFixed(3));
    }

    function schedule() {
      if (!frame && visible && !reduced.matches && !document.hidden) frame = requestAnimationFrame(update);
    }

    function sync() {
      const active = visible && !reduced.matches && !document.hidden;
      element!.dataset.motionActive = String(active);
      if (active) schedule();
      else {
        cancelAnimationFrame(frame);
        frame = 0;
        pointerX = pointerY = 0;
        reset();
      }
    }

    function move(event: PointerEvent) {
      if (!finePointer.matches || event.pointerType !== "mouse" || reduced.matches || !visible) return;
      const bounds = surface!.getBoundingClientRect();
      pointerX = clamp((event.clientX - bounds.left) / bounds.width * 2 - 1);
      pointerY = clamp((event.clientY - bounds.top) / bounds.height * 2 - 1);
      schedule();
    }

    function leave() { pointerX = pointerY = 0; schedule(); }
    const observer = typeof IntersectionObserver !== "undefined" ? new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    }) : null;
    if (observer) observer.observe(surface);
    else { visible = true; sync(); }

    surface.addEventListener("pointermove", move, { passive: true });
    surface.addEventListener("pointerleave", leave);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", sync);
    finePointer.addEventListener("change", leave);
    return () => {
      observer?.disconnect();
      cancelAnimationFrame(frame);
      surface.removeEventListener("pointermove", move);
      surface.removeEventListener("pointerleave", leave);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("visibilitychange", sync);
      reduced.removeEventListener("change", sync);
      finePointer.removeEventListener("change", leave);
    };
  }, [surfaceIsParent, enabled]);

  return ref;
}

export function GardenScene({ variant = "hero" }: { variant?: "cover" | "hero" | "desktop" | "landscape" }) {
  const ref = useGardenMotion(true);
  return (
    <div ref={ref} className={`garden-scene garden-scene-${variant}`} aria-hidden="true" data-motion-active="false">
      <div className="garden-scene-camera">
        <div className="garden-scene-distance" />
        <div className="garden-scene-light" />
        <div className="garden-scene-flowers garden-scene-left"><span /></div>
        <div className="garden-scene-flowers garden-scene-right"><span /></div>
        {variant !== "landscape" && <div className="garden-pollen">
          {Array.from({ length: 8 }, (_, i) => <i key={i} style={{ "--pollen-index": i } as React.CSSProperties} />)}
        </div>}
      </div>
    </div>
  );
}

/** Only decorative portraits and the event card tilt; forms and QR overlays stay flat. */
export function GardenDepth({ children, className }: { children: React.ReactNode; className: string }) {
  const ref = useGardenMotion();
  return <div ref={ref} className={`${className} garden-depth`} data-motion-active="false">{children}</div>;
}
