"use client";

import Image from "next/image";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import styles from "./GlitchyStage.module.css";
import { GLITCH_EVENT } from "@/lib/fun/glitch";
import { acquireBootSlot } from "@/lib/three-gate";

export type GlitchyEdition = "chrome" | "shadow";
export type GlitchyAction = "laugh" | "wave" | "hop" | "spin" | "wink" | "glitch";

export interface GlitchyPlacement {
  edition: GlitchyEdition;
  x?: number;
  y?: number;
  scale?: number;
  yaw?: number;
}

export interface GlitchyStageHandle {
  /** Plays an action on every character, slightly staggered. */
  play: (action: GlitchyAction) => void;
}

interface Props {
  characters: GlitchyPlacement[];
  camera?: { position: [number, number, number]; target: [number, number, number] };
  /** Backdrop centre colour; the edges always fade to the page's void so the canvas has no visible box. */
  background?: string;
  /** Transparent still shown until WebGL is ready (and kept if it never is). */
  poster: string;
  posterAlt: string;
  /** Set when the stage is above the fold, so its poster (the LCP element) loads immediately. */
  eager?: boolean;
  className?: string;
}

// Minimal shape of the engine objects this component touches (the engine is plain JS).
interface Vec3 {
  x: number;
  y: number;
  z: number;
  project: (camera: unknown) => Vec3;
}
interface EngineCharacter {
  stage: { camera: unknown };
  root: { position: { clone: () => Vec3 } };
  scale: number;
  act: unknown;
  play: (action: GlitchyAction) => void;
  track: (x: number, y: number, proximity: number) => void;
  untrack: () => void;
  excite: () => void;
  lookAt: (x: number, y: number, hold: number) => void;
  leave: () => void;
  hover: () => void;
  tap: () => void;
  drag: (dx: number) => void;
}
interface EngineStage {
  add: (variant: GlitchyEdition, opts: Record<string, number>) => EngineCharacter;
  setCamera: (pos: [number, number, number], target: [number, number, number]) => void;
  setSize: (w: number, h: number) => void;
  step: (dt: number) => void;
  render: () => void;
  dispose: () => void;
}

/** Where a character sits on screen: its body centre and how many pixels one "body radius" spans. */
function screenAnchor(c: EngineCharacter, rect: DOMRect) {
  const toClient = (v: Vec3) => ({ x: rect.left + (v.x * 0.5 + 0.5) * rect.width, y: rect.top + (-v.y * 0.5 + 0.5) * rect.height });
  const body = c.root.position.clone();
  body.y -= 0.15 * c.scale;
  const head = c.root.position.clone();
  head.y += 1.0 * c.scale;
  const centre = toClient(body.project(c.stage.camera));
  const top = toClient(head.project(c.stage.camera));
  return { ...centre, radius: Math.max(40, Math.abs(centre.y - top.y)) };
}

/**
 * Live, interactive 3D Glitchy (three.js, procedural — no model files). The engine and three.js are
 * imported only when the stage scrolls near the viewport, so they never weigh on the initial page load.
 *
 * The characters pay attention to the whole page, not just their box: eyes and head follow the mouse or
 * finger anywhere, the body drifts toward it on a spring and leans into the motion, they smile wider as
 * the pointer gets close, a fast flick makes them hop or glitch, a touch elsewhere gets a wave, and
 * scrolling makes them glance along. On the stage itself: hover = wink, click/tap = reaction, drag = spin.
 * Rendering pauses while off-screen or in a background tab.
 */
export const GlitchyStage = forwardRef<GlitchyStageHandle, Props>(function GlitchyStage(
  { characters, camera, background, poster, posterAlt, eager, className },
  ref,
) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const charsRef = useRef<EngineCharacter[]>([]);
  const [ready, setReady] = useState(false);

  useImperativeHandle(ref, () => ({
    play: (action) => charsRef.current.forEach((c, i) => setTimeout(() => c.play(action), i * 120)),
  }));

  useEffect(() => {
    const wrap = wrapRef.current, canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    let disposed = false, booting = false, visible = false, raf = 0;
    let stage: EngineStage | null = null;

    const resize = () => stage?.setSize(wrap.clientWidth, wrap.clientHeight);
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    async function boot() {
      booting = true;
      try {
        const { GlitchyStage: Engine } = await import("@/lib/glitchy/engine");
        if (disposed || !canvas) return;
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        stage = new Engine(canvas, { reducedMotion: reduced, grain: 0, background, pixelRatio: Math.min(window.devicePixelRatio || 1, 1.75) }) as EngineStage;
        if (camera) stage.setCamera(camera.position, camera.target);
        charsRef.current = characters.map((c, i) =>
          stage!.add(c.edition, { x: c.x ?? 0, y: c.y ?? 0, scale: c.scale ?? 1, yaw: c.yaw ?? 0, seed: 101 + i * 17 }),
        );
        resize();
        setReady(true);
        let last = performance.now();
        const loop = (now: number) => {
          raf = requestAnimationFrame(loop);
          if (!visible || document.hidden || !stage) { last = now; return; }
          stage.step(Math.min(0.05, (now - last) / 1000));
          last = now;
          stage.render();
        };
        raf = requestAnimationFrame(loop);
      } catch (err) {
        // No WebGL (or the chunk failed): the poster stays, which is a complete fallback.
        console.warn("Glitchy 3D unavailable:", err);
      }
    }

    let release: (() => void) | null = null;
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible || booting) return;
      booting = true;
      // same gate as every v2 scene: after load, one at a time, phones after the first interaction
      void acquireBootSlot().then((rel) => {
        if (disposed) { rel(); return; }
        release = rel;
        return boot().finally(() => { rel(); release = null; });
      });
    }, { rootMargin: "240px" });
    io.observe(wrap);

    // ---- page-wide attention ----
    let prev = { x: 0, y: 0, t: 0 };
    let lastPointerAt = 0, lastScrollY = window.scrollY, lastWaveAt = 0;
    const attend = (clientX: number, clientY: number) => {
      if (!visible || !charsRef.current.length) return null;
      const rect = canvas.getBoundingClientRect();
      let nearest: EngineCharacter | null = null, best = Infinity;
      for (const c of charsRef.current) {
        const a = screenAnchor(c, rect);
        const dx = (clientX - a.x) / a.radius, dy = -(clientY - a.y) / a.radius;
        const dist = Math.hypot(dx, dy);
        c.track(dx, dy, 1 - Math.min(1, Math.max(0, (dist - 1.1) / 2.4)));
        if (dist < best) { best = dist; nearest = c; }
      }
      return nearest;
    };
    const onMove = (e: PointerEvent) => {
      const now = performance.now();
      lastPointerAt = now;
      const nearest = attend(e.clientX, e.clientY);
      // a fast flick of the mouse excites the nearest character
      const dt = now - prev.t;
      if (nearest && e.pointerType === "mouse" && dt > 0 && dt < 80 && Math.hypot(e.clientX - prev.x, e.clientY - prev.y) / dt > 2.8) nearest.excite();
      prev = { x: e.clientX, y: e.clientY, t: now };
    };
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      lastPointerAt = performance.now();
      const nearest = attend(t.clientX, t.clientY);
      // a fresh touch outside the stage gets a wave (taps on the stage get their own reaction)
      if (e.type === "touchstart" && nearest && !nearest.act && !wrap.contains(e.target as Node) && lastPointerAt - lastWaveAt > 6000) {
        lastWaveAt = lastPointerAt;
        nearest.play("wave");
      }
    };
    const onScroll = () => {
      const dy = window.scrollY - lastScrollY;
      lastScrollY = window.scrollY;
      if (!visible || Math.abs(dy) < 4 || performance.now() - lastPointerAt < 1200) return;
      // glance toward where the page is heading
      charsRef.current.forEach((c) => c.lookAt(0, dy > 0 ? -0.55 : 0.55, 0.6));
    };
    const onLeaveWindow = (e: PointerEvent) => { if (!e.relatedTarget) charsRef.current.forEach((c) => c.untrack()); };
    // the secret code: every Glitchy on the page reacts
    const onGlitch = () => charsRef.current.forEach((c, i) => setTimeout(() => c.play(i % 2 ? "glitch" : "spin"), i * 90));

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("touchstart", onTouch, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("pointerout", onLeaveWindow);
    window.addEventListener(GLITCH_EVENT, onGlitch);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("touchstart", onTouch);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("pointerout", onLeaveWindow);
      window.removeEventListener(GLITCH_EVENT, onGlitch);
      release?.();
      stage?.dispose();
      charsRef.current = [];
    };
    // The scene is built once per mount; placements are static props.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On the stage: a click/tap reacts on the nearest character, dragging spins it.
  const drag = useRef<{ x: number; moved: number; target: EngineCharacter | null } | null>(null);
  const nearestTo = (clientX: number, clientY: number) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    let best: EngineCharacter | null = null, d = Infinity;
    for (const c of charsRef.current) {
      const a = screenAnchor(c, rect);
      const dist = Math.hypot(clientX - a.x, clientY - a.y);
      if (dist < d) { d = dist; best = c; }
    }
    return best;
  };

  return (
    <div
      ref={wrapRef}
      className={`${styles.stage} ${ready ? styles.ready : ""} ${className ?? ""}`}
      onPointerEnter={(e) => { if (e.pointerType === "mouse") charsRef.current.forEach((c) => c.hover()); }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        const dx = e.clientX - drag.current.x;
        drag.current.x = e.clientX;
        drag.current.moved += Math.abs(dx);
        drag.current.target?.drag(dx * 0.011);
      }}
      onPointerDown={(e) => {
        drag.current = { x: e.clientX, moved: 0, target: nearestTo(e.clientX, e.clientY) };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerUp={(e) => {
        if (drag.current && drag.current.moved < 6) drag.current.target?.tap();
        drag.current = null;
        if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
      }}
      onPointerCancel={() => { drag.current = null; }}
    >
      <Image
        className={styles.poster}
        src={poster}
        alt={posterAlt}
        fill
        sizes="(min-width: 1024px) 720px, 100vw"
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : undefined}
      />
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
    </div>
  );
});
