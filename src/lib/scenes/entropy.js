// Entropy field: a landscape of light rebuilt from each live drand quicknet round. When a new round
// lands (every 3 s) the field collapses, a ring of light spreads from the centre and the surface
// re-forms from that round's randomness. Low ground reads violet, peaks green — through dark,
// never a direct green↔violet blend.
import * as THREE from 'three';
import { C, k, clamp, rng, textures } from './fx';

/** @param {{ stage: any, mobile: boolean, pointer: {x:number,y:number,active:boolean} }} ctx */
export function mount(ctx) {
  const { stage, mobile, pointer } = ctx;
  const { scene, camera } = stage;
  const { glow: GLOW } = textures();
  const G = mobile ? 52 : 72, SZ = 7.4, N = G * G;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) {
    const kk = (i * G + j) * 3; pos[kk] = (i / (G - 1) - 0.5) * SZ; pos[kk + 2] = (j / (G - 1) - 0.5) * SZ;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const field = new THREE.Points(geo, new THREE.PointsMaterial({ size: mobile ? 0.12 : 0.1, map: GLOW, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(field);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.985, 1, 128), new THREE.MeshBasicMaterial({ color: k(C.signal, 2.4), transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  ring.rotation.x = -Math.PI / 2; field.add(ring);

  // A round's shape: six gaussian hills + a travelling wave, all drawn from its randomness.
  const params = (seed) => {
    const r = rng(seed);
    return {
      b: Array.from({ length: 6 }, () => ({ x: (r() - 0.5) * 5.6, z: (r() - 0.5) * 5.6, a: (r() - 0.35) * 1.25, s: 0.55 + r() * 1.1 })),
      kx: (r() - 0.5) * 2.4, kz: (r() - 0.5) * 2.4, wa: 0.08 + r() * 0.14,
    };
  };
  const height = (P, x, z, t) => {
    let h = 0;
    for (const b of P.b) { const dx = x - b.x, dz = z - b.z; h += b.a * Math.exp(-(dx * dx + dz * dz) / (b.s * b.s)); }
    return h + P.wa * Math.sin(P.kx * x + P.kz * z + t * 0.9);
  };
  let prev = params(1), cur = prev, t0 = -10, now = 0;

  function resize(w, h) {
    const narrow = w / h < 1;
    camera.position.set(0, narrow ? 5.2 : 3.6, narrow ? 8.6 : 6.6); camera.lookAt(0, -0.3, 0);
  }

  const c = new THREE.Color(), lo = k(C.glitch, 0.7), hi = k(C.signal, 1.6);
  function update(t) {
    now = t;
    const age = t - t0, e = clamp(age / 1.15, 0, 1), ease = e * e * (3 - 2 * e), collapse = 1 - 0.82 * Math.sin(Math.PI * ease);
    for (let kk = 0, n = 0; n < N; n++, kk += 3) {
      const x = pos[kk], z = pos[kk + 2];
      let h = (height(prev, x, z, t) * (1 - ease) + height(cur, x, z, t) * ease) * collapse;
      const d = Math.sqrt(x * x + z * z);
      if (age < 2.2) h += 0.2 * Math.sin(d * 5.5 - age * 9) * Math.exp(-age * 1.7) * (d < age * 5 ? 1 : 0);
      pos[kk + 1] = h;
      const hn = clamp((h + 0.5) / 1.4, 0, 1);
      if (hn < 0.45) c.copy(lo).multiplyScalar(0.35 + (0.45 - hn) * 2.2); else c.copy(hi).multiplyScalar(0.15 + (hn - 0.45) * 2.4);
      col[kk] = c.r; col[kk + 1] = c.g; col[kk + 2] = c.b;
    }
    geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
    if (age < 1.4) { ring.scale.setScalar(0.2 + age * 4); ring.material.opacity = (1 - age / 1.4) * 0.7; } else ring.material.opacity = 0;
    field.rotation.y = t * 0.04 + (pointer.active ? pointer.x * 0.3 : 0);
  }

  const api = {
    /** A new verified round: hex randomness seeds the next surface. */
    round(randomnessHex) {
      const seed = parseInt(String(randomnessHex).slice(0, 8), 16) >>> 0;
      prev = cur; cur = params(seed || 1); t0 = now;
    },
  };
  return { update, resize, api };
}
