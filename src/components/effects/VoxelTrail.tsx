"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Little brand pixels that fall off the cursor inside a section, like the voxels dropping from
 * Glitchy's tail. Desktop pointers only; off for reduced motion. Canvas 2D, idle when still.
 */
export function VoxelTrail({ targetRef }: { targetRef: RefObject<HTMLElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = targetRef.current, cv = canvasRef.current;
    if (!host || !cv) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const colors = ["#7cff4f", "#9b66ff", "#f5f7f8", "#7cff4f"];
    type P = { x: number; y: number; vx: number; vy: number; s: number; l: number; c: string };
    const ps: P[] = [];
    let running = false, raf = 0;

    const size = () => { const r = host.getBoundingClientRect(); cv.width = r.width * dpr; cv.height = r.height * dpr; };
    const ro = new ResizeObserver(size);
    ro.observe(host);
    size();

    const tick = () => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.l -= 0.022;
        if (p.l <= 0) { ps.splice(i, 1); continue; }
        ctx.globalAlpha = p.l;
        ctx.fillStyle = p.c;
        const s = p.s * dpr * (0.5 + p.l * 0.5);
        ctx.fillRect(p.x * dpr - s / 2, p.y * dpr - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
      if (ps.length) raf = requestAnimationFrame(tick);
      else running = false;
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = host.getBoundingClientRect();
      for (let i = 0; i < 2; i++) {
        ps.push({
          x: e.clientX - r.left + (Math.random() - 0.5) * 8,
          y: e.clientY - r.top + (Math.random() - 0.5) * 8,
          vx: (Math.random() - 0.5) * 0.6,
          vy: 0.4 + Math.random() * 1.2,
          s: 2 + Math.random() * 4,
          l: 1,
          c: colors[(Math.random() * colors.length) | 0],
        });
      }
      if (ps.length > 140) ps.splice(0, ps.length - 140);
      if (!running) { running = true; raf = requestAnimationFrame(tick); }
    };
    host.addEventListener("pointermove", onMove);
    return () => {
      host.removeEventListener("pointermove", onMove);
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [targetRef]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 3 }}
    />
  );
}
