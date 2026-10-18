// Procedural sound design for the Glitchy v3 videos: a dark synth pad + light 120 BPM pulse,
// and one small effect per on-screen cue (materialize sweep, giggle, boing, whoosh, wink ting,
// glitch stutter, UI blips, end impact). Writes a 48 kHz stereo 16-bit WAV. No samples, no licensing.
import fs from 'node:fs';

const SR = 48000;
const TAU = Math.PI * 2;

function rng(seed) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

export function soundtrack(cues, dur, outPath, id = '') {
  const N = Math.ceil(dur * SR);
  const L = new Float32Array(N), R = new Float32Array(N);
  const fxL = new Float32Array(N), fxR = new Float32Array(N); // effects bus (gets the room)
  const rand = rng(id.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0);
  const isClip = !cues.some((c) => c.type === 'end');
  const start = cues.find((c) => c.type === 'reveal')?.t ?? 0;
  const endAt = cues.find((c) => c.type === 'end')?.t ?? dur;

  const add = (bufL, bufR, i, v, pan = 0) => { if (i >= 0 && i < N) { bufL[i] += v * (1 - pan) * 0.5 * 2 * 0.707; bufR[i] += v * (1 + pan) * 0.5 * 2 * 0.707; } };
  // a pitched voice with a frequency curve and an amplitude envelope
  function voice(t0, len, freqAt, ampAt, { pan = 0, wave = 'sine', bus = 'fx', crush = 0, gain = 0.3 } = {}) {
    const i0 = Math.round(t0 * SR), n = Math.round(len * SR);
    let ph = 0, held = 0;
    const [bl, br] = bus === 'fx' ? [fxL, fxR] : [L, R];
    for (let k = 0; k < n; k++) {
      const u = k / n, f = freqAt(u);
      ph += (TAU * f) / SR;
      let s = wave === 'sine' ? Math.sin(ph) : wave === 'square' ? Math.sign(Math.sin(ph)) * 0.6 : wave === 'tri' ? (2 / Math.PI) * Math.asin(Math.sin(ph)) : ((ph / TAU) % 1) * 2 - 1;
      if (crush) { if (k % crush === 0) held = Math.round(s * 6) / 6; s = held; }
      add(bl, br, i0 + k, s * ampAt(u) * gain, pan);
    }
  }
  function noise(t0, len, ampAt, { pan = 0, hp = 0, bus = 'fx', bandAt = null, crush = 0, gain = 0.22 } = {}) {
    const i0 = Math.round(t0 * SR), n = Math.round(len * SR);
    let prev = 0, low = 0, band = 0, held = 0;
    const [bl, br] = bus === 'fx' ? [fxL, fxR] : [L, R];
    for (let k = 0; k < n; k++) {
      const u = k / n;
      let s = rand() * 2 - 1;
      if (crush) { if (k % crush === 0) held = s; s = held; }
      if (hp) { const d = s - prev; prev = s; s = d * hp; }
      if (bandAt) { // state-variable band-pass sweep
        const f = 2 * Math.sin((Math.PI * bandAt(u)) / SR), q = 0.25;
        low += f * band; const high = s - low - q * band; band += f * high; s = band * 1.6;
      }
      add(bl, br, i0 + k, s * ampAt(u) * gain, pan);
    }
  }
  const dec = (k) => (u) => Math.exp(-u * k);
  const att = (a, k) => (u) => Math.min(1, u / a) * Math.exp(-Math.max(0, u - a) * k);

  // ---- music bed ----
  const chords = [[57, 60, 64, 71], [53, 57, 60, 67], [48, 55, 60, 64], [55, 59, 62, 67]]; // Am9 F C G
  const beat = 0.5;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const fadeIn = Math.min(1, t / 1.2), fadeOut = Math.min(1, (dur - t) / 1.4);
    const ch = chords[Math.floor(t / (beat * 8)) % 4];
    let pad = 0;
    for (let v = 0; v < ch.length; v++) {
      const f = midi(ch[v]);
      pad += Math.sin(TAU * f * t) * 0.5 + Math.sin(TAU * f * 1.003 * t + v) * 0.35 + Math.sin(TAU * f * 2.001 * t) * 0.08;
    }
    const swell = 0.75 + 0.25 * Math.sin(TAU * t / (beat * 8));
    const level = (isClip ? 0.04 : 0.05) * fadeIn * fadeOut * swell;
    const bass = Math.sin(TAU * midi(ch[0] - 24) * t) * 0.09 * fadeIn * fadeOut;
    L[i] += pad * level + bass; R[i] += pad * level * 0.96 + bass;
  }
  // pulse: kick on the beat, hat on the off-beat, only between the reveal and the end card
  if (!isClip) {
    for (let t = Math.ceil(start / beat) * beat; t < endAt - 0.01; t += beat) {
      voice(t, 0.32, (u) => 45 + 85 * Math.exp(-u * 14), dec(9), { bus: 'dry', gain: 0.5 });
      noise(t + beat / 2, 0.05, dec(30), { hp: 0.5, bus: 'dry', pan: 0.2, gain: 0.3 });
    }
  }

  // ---- effects per cue ----
  for (const c of cues) {
    const p = c.who === 'ch' ? -0.35 : c.who === 'sh' ? 0.35 : 0;
    switch (c.type) {
      case 'type': for (let k = 0; k < c.n; k++) noise(c.t + k / 28, 0.012, dec(20), { hp: 0.7, pan: (rand() - 0.5) * 0.3 }); break;
      case 'bar': for (let k = 0; k < 8; k++) voice(c.t + k * 0.05, 0.04, () => 900 + k * 120, dec(6), { wave: 'square' }); break;
      case 'reveal': noise(c.t, 0.5, att(0.05, 6), { bandAt: (u) => 300 + 5000 * u, crush: 3 }); break;
      case 'materialize':
        voice(c.t, 1.1, (u) => 180 + 1500 * u * u, att(0.1, 2.5), { pan: p, crush: 4 });
        voice(c.t + 0.9, 0.7, () => 1760, dec(5), { pan: p }); voice(c.t + 0.95, 0.6, () => 2637, dec(6), { pan: p });
        break;
      case 'dematerialize': voice(c.t, 0.45, (u) => 1300 - 1150 * u, att(0.05, 3), { pan: p, crush: 5 }); break;
      case 'glitch': case 'flash':
        for (let k = 0; k < 6; k++) { const tt = c.t + k * 0.04 + rand() * 0.02; noise(tt, 0.03, dec(4), { crush: 6 + ((rand() * 10) | 0), pan: (rand() - 0.5) * 0.8 }); voice(tt, 0.03, () => 200 + rand() * 1600, dec(3), { wave: 'square', pan: (rand() - 0.5) * 0.8 }); }
        break;
      case 'laugh':
        [0, 0.11, 0.22, 0.36, 0.47, 0.6].forEach((d, k) => voice(c.t + 0.1 + d, 0.08, (u) => 620 + k * 55 + 260 * u, att(0.15, 5), { pan: p, wave: 'tri' }));
        [0, 0.7].forEach((d) => voice(c.t + d, 0.12, (u) => 600 + 700 * u, dec(7), { pan: p }));
        break;
      case 'wave':
        noise(c.t + 0.15, 0.5, (u) => Math.sin(Math.PI * u) * 0.5, { bandAt: (u) => 600 + 1400 * u, pan: p });
        noise(c.t + 0.65, 0.5, (u) => Math.sin(Math.PI * u) * 0.5, { bandAt: (u) => 2000 - 1200 * u, pan: p });
        voice(c.t + 0.2, 0.9, () => 1318.5, dec(4), { pan: p });
        break;
      case 'hop':
        voice(c.t + 0.18, 0.4, (u) => 170 + 380 * u + Math.sin(u * 40) * 18, att(0.05, 3), { pan: p, wave: 'tri' });
        voice(c.t + 0.8, 0.25, (u) => 95 - 40 * u, dec(9), { pan: p, bus: 'dry' });
        break;
      case 'spin':
        noise(c.t + 0.05, 1.0, (u) => Math.sin(Math.PI * u) * 0.7, { bandAt: (u) => 400 + 3200 * Math.sin(Math.PI * u), pan: p });
        [1568, 2093, 2637].forEach((f, k) => voice(c.t + 0.95 + k * 0.06, 0.6, () => f, dec(6), { pan: p }));
        break;
      case 'wink': voice(c.t + 0.3, 0.8, () => 1760, dec(5), { pan: p }); voice(c.t + 0.3, 0.8, () => 2637, dec(7), { pan: p }); break;
      case 'title': voice(c.t, 0.05, () => 1200, dec(5), { wave: 'square' }); voice(c.t + 0.05, 0.06, () => 1800, dec(5), { wave: 'square' }); break;
      case 'tag': voice(c.t, 0.04, () => 1500, dec(5), { wave: 'square' }); break;
      case 'end':
        voice(c.t, 1.4, (u) => 82 - 42 * u, dec(2.5), { bus: 'dry', gain: 0.45 });
        noise(c.t, 0.35, dec(8), { crush: 4 });
        [69, 76, 81].forEach((n, k) => voice(c.t + 0.05 + k * 0.03, 1.8, () => midi(n), dec(2.2)));
        break;
    }
  }

  // room on the effects bus: two cross-fed feedback delays
  const d1 = Math.round(0.113 * SR), d2 = Math.round(0.171 * SR);
  for (let i = 0; i < N; i++) {
    const wl = i >= d1 ? fxR[i - d1] * 0.32 : 0, wr = i >= d2 ? fxL[i - d2] * 0.32 : 0;
    fxL[i] += wl; fxR[i] += wr;
    L[i] += fxL[i] * 0.16; R[i] += fxR[i] * 0.16;
  }
  // soft clip + normalize to -1 dBFS
  let peak = 1e-9;
  for (let i = 0; i < N; i++) { L[i] = Math.tanh(L[i] * 1.2); R[i] = Math.tanh(R[i] * 1.2); peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); }
  const g = 0.89 / peak;
  const buf = Buffer.alloc(44 + N * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
  for (let i = 0; i < N; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g)) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * g)) * 32767), 46 + i * 4);
  }
  fs.writeFileSync(outPath, buf);
}
