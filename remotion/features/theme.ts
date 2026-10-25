import { continueRender, delayRender, interpolate, staticFile } from "remotion";

export const GREEN = "#7CFF4F";
export const PURPLE = "#7A3CFF";
export const PAPER = "#F5F7F8";
export const RED = "#FF5C5C";
export const AMBER = "#FFC44F";
export const INK = "#07080B";
export const MUTED = "rgba(245,247,248,0.72)";
export const FAINT = "rgba(245,247,248,0.42)";

export const DISPLAY = "Tektur, 'Segoe UI', sans-serif";
export const BODY = "Geist, 'Segoe UI', sans-serif";
export const MONO = "Martian, Consolas, monospace";

export const C = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
/** 0→1 between frames s and e. */
export const rise = (f: number, s: number, e: number) => interpolate(f, [s, e], [0, 1], C);
/** 0→1→0: in over d frames from s, out over d frames ending at e. */
export const seg = (f: number, s: number, e: number, d = 10) => interpolate(f, [s, s + d, e - d, e], [0, 1, 1, 0], C);

export const toneOf = (verdict: string) =>
  /RUG|HIGH/.test(verdict) ? RED : /CAUTION/.test(verdict) ? AMBER : /LOW/.test(verdict) ? GREEN : /CLEAN/.test(verdict) ? GREEN : FAINT;

/** Deterministic pseudo-random from a string seed, so a video re-renders identically. */
export function seeded(seed: string) {
  let s = seed.split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Brand faces, loaded once per render tab before the first frame.
const fontsHandle = delayRender("brand fonts");
Promise.all(
  [
    ["Tektur", "tektur-latin.woff2", "400 900"],
    ["Geist", "geist-latin.woff2", "100 900"],
    ["Martian", "martian-latin.woff2", "100 800"],
  ].map(([family, file, weight]) =>
    new FontFace(family, `url(${staticFile(`fonts/${file}`)})`, { weight }).load().then((face) => document.fonts.add(face)),
  ),
)
  .catch(() => {})
  .finally(() => continueRender(fontsHandle));
