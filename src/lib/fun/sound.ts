// Procedural sound effects — synthesised with WebAudio, no files. Off by default; the header's
// Sound toggle turns it on and the choice is remembered in localStorage.

export type Sfx = "ping" | "rug" | "clean" | "warn" | "coin" | "right" | "wrong" | "ach" | "glitch" | "pop";

const KEY = "gl1tch-sound";
export const SOUND_EVENT = "gl1tch:sound";
const PING_GAP_MS = 1200;

let ctx: AudioContext | null = null;
let on: boolean | null = null;
let lastPing = 0;

export function soundOn(): boolean {
  if (on === null) {
    try { on = typeof window !== "undefined" && window.localStorage.getItem(KEY) === "1"; } catch { on = false; }
  }
  return on;
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = ctx ?? new AC();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch { return null; }
}

/** Call from a click handler (browsers only start audio after a user gesture). */
export function setSound(next: boolean) {
  on = next;
  try { window.localStorage.setItem(KEY, next ? "1" : "0"); } catch { /* session only */ }
  if (next) audio();
  window.dispatchEvent(new CustomEvent(SOUND_EVENT, { detail: next }));
  if (next) sfx("pop");
}

function tone(a: AudioContext, f: number, d: number, type: OscillatorType = "sine", vol = 0.05, when = 0, slide = 0) {
  const t0 = a.currentTime + when;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t0 + d);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  o.connect(g); g.connect(a.destination);
  o.start(t0); o.stop(t0 + d + 0.03);
}

function noise(a: AudioContext, d: number, vol: number) {
  const n = Math.floor(a.sampleRate * d), b = a.createBuffer(1, n, a.sampleRate), ch = b.getChannelData(0);
  for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = a.createBufferSource(), g = a.createGain();
  g.gain.value = vol; s.buffer = b; s.connect(g); g.connect(a.destination); s.start();
}

const SFX: Record<Sfx, (a: AudioContext) => void> = {
  ping: (a) => tone(a, 1320, 0.07, "sine", 0.02),
  rug: (a) => { tone(a, 240, 0.32, "sawtooth", 0.035, 0, 0.5); tone(a, 190, 0.3, "square", 0.02, 0.07, 0.6); },
  clean: (a) => [523, 659, 784, 1047].forEach((f, i) => tone(a, f, 0.2, "triangle", 0.05, i * 0.07)),
  warn: (a) => { tone(a, 440, 0.14, "triangle", 0.05); tone(a, 370, 0.2, "triangle", 0.05, 0.12); },
  coin: (a) => { tone(a, 1568, 0.28, "sine", 0.04); tone(a, 2349, 0.32, "sine", 0.025, 0.05); },
  right: (a) => { tone(a, 784, 0.12, "triangle", 0.05); tone(a, 1175, 0.22, "triangle", 0.05, 0.09); },
  wrong: (a) => tone(a, 170, 0.4, "sawtooth", 0.035, 0, 0.55),
  ach: (a) => [784, 988, 1175, 1568].forEach((f, i) => tone(a, f, 0.24, "square", 0.025, i * 0.09)),
  glitch: (a) => { noise(a, 0.35, 0.08); tone(a, 90, 0.3, "square", 0.03, 0, 2); },
  pop: (a) => tone(a, 620, 0.1, "sine", 0.045, 0, 1.7),
};

export function sfx(name: Sfx) {
  if (!soundOn()) return;
  if (name === "ping") {
    const now = Date.now();
    if (now - lastPing < PING_GAP_MS) return;
    lastPing = now;
  }
  const a = audio();
  if (!a) return;
  try { SFX[name](a); } catch { /* audio is a nicety */ }
}
