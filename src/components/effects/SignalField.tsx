"use client";

import { useEffect, useRef } from "react";
import styles from "./SignalField.module.css";

/** Canvas grid + drifting green signal glows. Sits behind the hero. */
export function SignalField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const gridSize = 44;
    const GREEN = "124, 255, 79";

    interface Glow {
      x: number;
      y: number;
      tx: number;
      ty: number;
      r: number;
      speed: number;
      alpha: number;
    }
    let glows: Glow[] = [];
    let raf = 0;
    let w = 0;
    let h = 0;

    const snap = (max: number) =>
      Math.floor((Math.random() * max) / gridSize) * gridSize;

    const makeGlow = (): Glow => ({
      x: snap(w),
      y: snap(h),
      tx: snap(w),
      ty: snap(h),
      r: Math.random() * 90 + 60,
      speed: Math.random() * 0.012 + 0.006,
      alpha: 0,
    });

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      glows = Array.from({ length: 7 }, makeGlow);
    };

    const drawGrid = () => {
      ctx.strokeStyle = "rgba(255,255,255,0.035)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    };

    const render = () => {
      ctx.clearRect(0, 0, w, h);
      drawGrid();
      glows.forEach((g) => {
        g.x += (g.tx - g.x) * g.speed;
        g.y += (g.ty - g.y) * g.speed;
        if (Math.abs(g.tx - g.x) < 2 && Math.abs(g.ty - g.y) < 2) {
          g.tx = snap(w);
          g.ty = snap(h);
        }
        if (g.alpha < 0.5) g.alpha += 0.006;
        const grad = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, g.r);
        grad.addColorStop(0, `rgba(${GREEN}, ${g.alpha})`);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
        ctx.fill();
      });
      if (!reduced) raf = requestAnimationFrame(render);
    };

    resize();
    if (reduced) {
      drawGrid();
    } else {
      render();
    }
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />;
}
