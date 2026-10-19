// Shared pieces for the v2 3D scenes (plain JS like the Glitchy engine they run on).
// Colours follow tokens.css; HDR multiples (> 1) are what the engine's bloom picks up.
// Rule carried over from the design system: never lerp green straight into purple
// (the midpoint reads cyan) — fade one to dark, then bring the other up.
import * as THREE from 'three';

export const TAU = Math.PI * 2;
export const C = {
  signal: new THREE.Color(0x7cff4f),
  glitch: new THREE.Color(0x7a3cff),
  glitchInk: new THREE.Color(0xb99bff),
  stat: new THREE.Color(0xf5f7f8),
  warn: new THREE.Color(0xe5b454),
  bad: new THREE.Color(0xf2555a),
};
/** HDR copy of a colour (s > 1 blooms). */
export const k = (c, s) => c.clone().multiplyScalar(s);
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const pick = (a) => a[(Math.random() * a.length) | 0];

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Verdict band from a 0–100 safety score (CLEAN 80–100 · CAUTION 50–79 · HIGH RISK 0–49). */
export const band = (score) => (score >= 80 ? 'ok' : score >= 50 ? 'warn' : 'bad');
export const bandColor = (b) => (b === 'bad' ? C.bad : b === 'warn' ? C.warn : C.signal);

// ---------- textures (built on first use; scenes only ever load in the browser) ----------
function canvasTex(size, draw) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
let TEX = null;
export function textures() {
  if (TEX) return TEX;
  TEX = {
    glow: canvasTex(128, (g) => {
      const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.22, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    }),
    ring: canvasTex(128, (g) => { g.strokeStyle = '#fff'; g.lineWidth = 5; g.beginPath(); g.arc(64, 64, 56, 0, TAU); g.stroke(); }),
    star: canvasTex(64, (x) => {
      const g = x.createRadialGradient(32, 32, 0, 32, 32, 14);
      g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, 64, 64); x.fillStyle = '#fff';
      x.beginPath(); x.moveTo(32, 2); x.lineTo(35, 29); x.lineTo(62, 32); x.lineTo(35, 35); x.lineTo(32, 62); x.lineTo(29, 35); x.lineTo(2, 32); x.lineTo(29, 29); x.closePath(); x.fill();
    }),
    shadow: canvasTex(128, (g) => {
      const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,255,255,.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    }),
  };
  return TEX;
}

// Ashima 3D simplex noise (MIT).
export const NOISE = `
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;} vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);} vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;i=mod289(i);vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}`;

export const BAD = () => [k(C.bad, 2.6), k(C.warn, 2.2), k(C.bad, 1.6), k(C.stat, 1.4)];
export const GOOD = () => [k(C.signal, 2.4), k(C.glitch, 3), k(C.stat, 1.7), k(C.signal, 1.6)];

/** Pool of glowing voxel cubes that burst out of a point and fall. */
export class Burst {
  constructor(scene, n = 160, size = 0.06) {
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }), n);
    this.mesh.frustumCulled = false; scene.add(this.mesh);
    this.items = Array.from({ length: n }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), age: 9, life: 1, s: size, r: 0, g: 3.2 }));
    this.size = size; this.i = 0; this.d = new THREE.Object3D(); this.live = 0;
    const black = new THREE.Color(0, 0, 0);
    for (let j = 0; j < n; j++) {
      this.mesh.setColorAt(j, black);
      this.d.position.set(0, -999, 0); this.d.scale.setScalar(1e-4); this.d.updateMatrix(); this.mesh.setMatrixAt(j, this.d.matrix);
    }
  }
  emit(o, count, cols, speed = 2.4, up = 0.6, gravity = 3.2) {
    for (let j = 0; j < count; j++) {
      const idx = this.i, it = this.items[idx]; this.i = (this.i + 1) % this.items.length;
      it.p.copy(o);
      it.v.set(Math.random() - 0.5, Math.random() - 0.5 + up, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.35 + Math.random() * 0.85));
      it.age = 0; it.life = 0.8 + Math.random() * 0.9; it.s = this.size * (0.5 + Math.random()); it.r = Math.random() * 3; it.g = gravity;
      this.mesh.setColorAt(idx, cols[(Math.random() * cols.length) | 0]);
    }
    this.mesh.instanceColor.needsUpdate = true; this.live = 2;
  }
  update(dt) {
    if (!this.live) return;
    let any = false;
    this.items.forEach((it, j) => {
      if (it.age < it.life) {
        any = true; it.age += dt; it.v.y -= it.g * dt; it.v.multiplyScalar(Math.exp(-dt * 0.7)); it.p.addScaledVector(it.v, dt);
        const q = it.age / it.life;
        this.d.position.copy(it.p); this.d.rotation.set(it.r + it.age * 4, it.r * 2 + it.age * 3, 0); this.d.scale.setScalar(Math.max(1e-4, it.s * (1 - q * q)));
      } else { this.d.position.set(0, -999, 0); this.d.scale.setScalar(1e-4); }
      this.d.updateMatrix(); this.mesh.setMatrixAt(j, this.d.matrix);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
    if (!any) this.live--;
  }
}

/** Pool of four-point sparkle sprites. */
export class Sparks {
  constructor(scene, n = 36) {
    const { star } = textures();
    this.items = Array.from({ length: n }, () => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: star, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      s.visible = false; scene.add(s);
      return { s, age: 0, life: 1, v: new THREE.Vector3(), size: 0.2 };
    });
    this.i = 0;
  }
  emit(o, n, color, radius = 1, size = 0.28) {
    for (let j = 0; j < n; j++) {
      const it = this.items[this.i++ % this.items.length], a = Math.random() * TAU;
      it.s.position.set(o.x + Math.cos(a) * radius * (0.5 + Math.random() * 0.6), o.y + (Math.random() - 0.5) * radius * 1.4, o.z + Math.sin(a) * radius * 0.4 + 0.3);
      it.v.set(0, 0.25 + Math.random() * 0.35, 0); it.age = -Math.random() * 0.35; it.life = 0.7 + Math.random() * 0.5; it.size = size * (0.6 + Math.random() * 0.8);
      it.s.material.color.copy(color); it.s.material.rotation = Math.random(); it.s.visible = true;
    }
  }
  update(dt) {
    for (const it of this.items) {
      if (!it.s.visible) continue;
      it.age += dt;
      if (it.age < 0) { it.s.scale.setScalar(1e-4); continue; }
      const q = it.age / it.life;
      if (q >= 1) { it.s.visible = false; continue; }
      it.s.position.addScaledVector(it.v, dt); it.s.scale.setScalar(it.size * Math.sin(q * Math.PI)); it.s.material.rotation += dt * 2;
    }
  }
}

/** Speech bubble above a Glitchy: a DOM element the scene positions each frame. */
export function bubble(stage, character, host, el) {
  let until = 0;
  const v = new THREE.Vector3();
  return {
    say(text, dur = 2.6) {
      if (!el) return;
      el.textContent = text; el.hidden = false; until = performance.now() + dur * 1000;
    },
    update() {
      if (!el || el.hidden) return;
      if (performance.now() > until) { el.hidden = true; return; }
      const r = host.getBoundingClientRect();
      v.copy(character.root.position); v.y += 1.15 * character.scale; v.project(stage.camera);
      const x = (v.x * 0.5 + 0.5) * r.width, y = (-v.y * 0.5 + 0.5) * r.height;
      el.style.left = `${clamp(x, 90, r.width - 90)}px`; el.style.top = `${Math.max(46, y)}px`;
    },
  };
}
