"use client";

import Image from "next/image";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from "react";
import styles from "./SceneStage.module.css";

/**
 * Hosts one v2 3D scene (src/lib/scenes/*.js) on the Glitchy engine's stage, so every scene gets
 * the mascot's studio light, bloom, vignette and grain. three.js + the engine + the scene load only
 * when the stage nears the viewport (and, for above-the-fold heroes, once the page is idle), so
 * they never weigh on first paint. A poster stays visible until WebGL is ready, and for good if it
 * never is. Off-screen or in a background tab nothing renders; reduced motion gets one still frame.
 */

export interface ScenePointer { x: number; y: number; active: boolean }
interface EngineCharacter {
  root: { position: { clone: () => Vec3 } };
  scale: number;
  act: unknown;
  play: (a: string) => void;
  track: (x: number, y: number, proximity: number) => void;
  untrack: () => void;
  excite: () => void;
  tap: () => void;
}
interface Vec3 { x: number; y: number; z: number; project: (camera: unknown) => Vec3 }
interface EngineStage {
  camera: unknown;
  scene: { environment: unknown };
  env: unknown;
  backdrop?: { scale: { setScalar: (s: number) => void } };
  setSize: (w: number, h: number) => void;
  step: (dt: number) => void;
  render: () => void;
  dispose: () => void;
}
export interface SceneInstance<Api = unknown> {
  update: (t: number, dt: number) => void;
  resize?: (w: number, h: number) => void;
  dispose?: () => void;
  chars?: EngineCharacter[];
  api: Api;
}
export type SceneModule<Api = unknown> = {
  mount: (ctx: {
    stage: EngineStage;
    host: HTMLElement;
    reduced: boolean;
    mobile: boolean;
    pointer: ScenePointer;
    ui: Record<string, unknown>;
    options: Record<string, unknown>;
  }) => SceneInstance<Api>;
};

export interface EngineOptions {
  background?: string;
  bloom?: [number, number, number];
  floor?: boolean;
  bokeh?: boolean;
  fov?: number;
  /** Scale of the engine's backdrop plane (wide scenes need more). */
  backdrop?: number;
}

interface Props<Api> {
  load: () => Promise<SceneModule<Api>>;
  engine?: EngineOptions;
  /** DOM hooks the scene writes to (speech bubble, frame…), read at mount. */
  ui?: () => Record<string, unknown>;
  options?: Record<string, unknown>;
  poster?: string;
  posterAlt?: string;
  /** Above the fold: boot once the page is idle instead of waiting for scroll. */
  hero?: boolean;
  className?: string;
  label: string;
  onReady?: (api: Api) => void;
  children?: ReactNode;
}

function anchor(c: EngineCharacter, camera: unknown, rect: DOMRect) {
  const toClient = (v: Vec3) => ({ x: rect.left + (v.x * 0.5 + 0.5) * rect.width, y: rect.top + (-v.y * 0.5 + 0.5) * rect.height });
  const body = c.root.position.clone(); body.y -= 0.15 * c.scale;
  const head = c.root.position.clone(); head.y += 1.0 * c.scale;
  const centre = toClient(body.project(camera));
  const top = toClient(head.project(camera));
  return { ...centre, radius: Math.max(40, Math.abs(centre.y - top.y)) };
}

function SceneStageInner<Api>(
  { load, engine = {}, ui, options = {}, poster, posterAlt = "", hero, className, label, onReady, children }: Props<Api>,
  ref: React.Ref<Api | null>,
) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const apiRef = useRef<Api | null>(null);
  const [ready, setReady] = useState(false);
  useImperativeHandle(ref, () => apiRef.current as Api, [ready]);

  useEffect(() => {
    const wrapEl = wrapRef.current, canvasEl = canvasRef.current;
    if (!wrapEl || !canvasEl) return;
    const wrap: HTMLDivElement = wrapEl, canvas: HTMLCanvasElement = canvasEl;
    let disposed = false, booting = false, visible = false, raf = 0;
    let stage: EngineStage | null = null;
    let scene: SceneInstance<Api> | null = null;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(max-width: 640px)").matches;
    const pointer: ScenePointer = { x: 0, y: 0, active: false };

    const drawStill = () => {
      if (!stage || !scene) return;
      for (let i = 0; i < 30; i++) { scene.update(i / 30, 1 / 30); stage.step(1 / 30); }
      stage.render();
    };
    const resize = () => {
      if (!stage) return;
      const w = Math.max(2, wrap.clientWidth), h = Math.max(2, wrap.clientHeight);
      stage.setSize(w, h);
      scene?.resize?.(w, h);
      if (reduced) drawStill();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    async function boot() {
      booting = true;
      try {
        const [{ GlitchyStage: Engine }, mod] = await Promise.all([import("@/lib/glitchy/engine"), load()]);
        if (disposed) return;
        stage = new Engine(canvas, {
          reducedMotion: reduced,
          grain: 0.014,
          background: engine.background ?? "#160f2c",
          floor: engine.floor ?? false,
          bokeh: engine.bokeh ?? true,
          bloom: engine.bloom ?? [0.6, 0.5, 1.05],
          fov: engine.fov ?? 30,
          pixelRatio: Math.min(window.devicePixelRatio || 1, mobile ? 1.35 : 1.6),
        }) as EngineStage;
        stage.backdrop?.scale.setScalar(engine.backdrop ?? 1.6);
        stage.scene.environment = stage.env;
        scene = mod.mount({ stage, host: wrap, reduced, mobile, pointer, ui: ui?.() ?? {}, options });
        apiRef.current = scene.api;
        resize();
        setReady(true);
        onReady?.(scene.api);
        if (reduced) { drawStill(); return; }
        let last = performance.now();
        const loop = (now: number) => {
          raf = requestAnimationFrame(loop);
          if (!visible || document.hidden || !stage || !scene) { last = now; return; }
          const dt = Math.min(0.05, (now - last) / 1000);
          last = now;
          scene.update(now / 1000, dt);
          stage.step(dt);
          stage.render();
        };
        raf = requestAnimationFrame(loop);
      } catch (err) {
        // No WebGL (or a chunk failed): the poster stays, which is a complete fallback.
        console.warn("3D scene unavailable:", err);
      }
    }

    let idleId = 0;
    const startBoot = () => {
      if (booting || disposed) return;
      if (!hero) { void boot(); return; }
      // Above the fold: let the page settle first so the scene never competes with first paint.
      const go = () => void boot();
      if (typeof window.requestIdleCallback === "function") idleId = window.requestIdleCallback(go, { timeout: 2500 });
      else idleId = window.setTimeout(go, 1200);
      booting = true;
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) startBoot();
    }, { rootMargin: "240px" });
    io.observe(wrap);

    // ---- pointer: scene tilt (local) + page-wide attention for any characters ----
    let prev = { x: 0, y: 0, t: 0 };
    const chars = () => scene?.chars ?? [];
    const onMove = (e: PointerEvent) => {
      const r = wrap.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      pointer.active = inside;
      if (inside) { pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1; pointer.y = -(((e.clientY - r.top) / r.height) * 2 - 1); }
      if (!visible || !stage || !chars().length) return;
      const now = performance.now();
      for (const c of chars()) {
        const a = anchor(c, stage.camera, canvas.getBoundingClientRect());
        const dx = (e.clientX - a.x) / a.radius, dy = -(e.clientY - a.y) / a.radius, dist = Math.hypot(dx, dy);
        c.track(dx, dy, 1 - Math.min(1, Math.max(0, (dist - 1.1) / 2.4)));
        const dt = now - prev.t;
        if (e.pointerType === "mouse" && dt > 0 && dt < 80 && dist < 5 && Math.hypot(e.clientX - prev.x, e.clientY - prev.y) / dt > 2.8) c.excite();
      }
      prev = { x: e.clientX, y: e.clientY, t: now };
    };
    const onClick = (e: MouseEvent) => {
      if (!stage) return;
      for (const c of chars()) {
        const a = anchor(c, stage.camera, canvas.getBoundingClientRect());
        if (Math.hypot(e.clientX - a.x, e.clientY - a.y) < a.radius * 1.15) c.tap();
      }
    };
    const onLeaveWindow = (e: PointerEvent) => { if (!e.relatedTarget) { pointer.active = false; chars().forEach((c) => c.untrack()); } };
    window.addEventListener("pointermove", onMove, { passive: true });
    wrap.addEventListener("click", onClick);
    document.addEventListener("pointerout", onLeaveWindow);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idleId); else window.clearTimeout(idleId);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("click", onClick);
      document.removeEventListener("pointerout", onLeaveWindow);
      scene?.dispose?.();
      stage?.dispose();
      apiRef.current = null;
    };
    // The scene is built once per mount; props are read at boot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={wrapRef} className={[styles.stage, className ?? ""].join(" ")} role="img" aria-label={label} data-ready={ready ? "1" : "0"}>
      {poster && (
        <Image src={poster} alt={posterAlt} fill sizes="(max-width: 768px) 100vw, 50vw" className={styles.poster} priority={!!hero} />
      )}
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      {children}
    </div>
  );
}

export const SceneStage = forwardRef(SceneStageInner) as <Api>(
  p: Props<Api> & { ref?: React.Ref<Api | null> },
) => React.ReactElement;
