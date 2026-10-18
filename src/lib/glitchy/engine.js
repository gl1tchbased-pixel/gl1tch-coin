// Glitchy v3 — real-time 3D mascot engine (three.js r170).
// One stage = renderer + studio lighting + post; it can hold several characters
// (Chrome and Shadow editions) that blink, smile, laugh, wave, hop, spin, wink,
// glitch and materialize. Everything is procedural: no model files, no textures to load.
// Shared by the site component, the video studio (pump-pack/mascot-v3/studio.html)
// and the stills renderer, so every output shows the exact same character.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// ---------- brand ----------
export const GREEN = '#7cff4f';
export const PURPLE = '#7a3cff';
export const STATIC = '#f5f7f8';

const FACE = {
  iris: GREEN, iris2: PURPLE, irisGlow: 2.4,
  teeth: STATIC, glyph: GREEN, glyphGlow: 3.2,
  edgeA: GREEN, edgeB: PURPLE, edgeGlow: 2.2,
};
export const GLITCHY_VARIANTS = {
  chrome: {
    ...FACE, name: 'Chrome', env: 1.25, bg: '#171920',
    mouthIn: '#150b24', tongue: '#7652cc', blush: '#9a6bff', blushAmt: 0.22, blushGlow: 0.5, lashGlow: 1.3,
    body: { color: '#dfe4e8', metalness: 1, roughness: 0.13, clearcoat: 1, clearcoatRoughness: 0.04 },
  },
  shadow: {
    ...FACE, name: 'Shadow', env: 0.7, bg: '#14111c',
    mouthIn: '#050308', tongue: PURPLE, blush: '#a77bff', blushAmt: 0.3, blushGlow: 0.12, lashGlow: 1.8,
    body: { color: '#2b2140', roughness: 0.3, clearcoat: 0.75, clearcoatRoughness: 0.18, sheen: 0.7, sheenColor: PURPLE, sheenRoughness: 0.35 },
  },
};

export const ACTIONS = ['laugh', 'wave', 'hop', 'spin', 'wink', 'glitch'];
const DUR = { laugh: 1.7, wave: 2.0, hop: 1.05, spin: 1.35, wink: 0.8, glitch: 0.6 };
const IDLE = ['wave', 'laugh', 'wink', 'hop', 'wave', 'wink', 'spin'];
const TAP_CYCLE = ['laugh', 'hop', 'spin', 'wave', 'glitch'];

// ---------- helpers ----------
export function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const mix = (a, b, t) => a + (b - a) * t;
export const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeOut = (x) => 1 - Math.pow(1 - x, 3);
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- character geometry (built once, shared by every stage) ----------
export const DISSOLVE_Y = -1.2;
const HIDDEN_Y = 1.6; // dissolve line above the head = fully dematerialized
const ARMS = [
  { a: v3(-0.84, -0.36, 0.42).normalize(), d: v3(-0.6, -0.5, 0.62).normalize(), L: 0.2, s: 0.21, sign: -1 },
  { a: v3(0.86, -0.22, 0.44).normalize(), d: v3(0.68, -0.2, 0.7).normalize(), L: 0.21, s: 0.21, sign: 1 },
];
// unit-sphere direction -> ghost surface (dome head, tapering tail that curls right), no arms
function shape(v, out) {
  let x = v.x, z = v.z, Y;
  if (v.y >= 0) {
    Y = v.y * 1.02;
  } else {
    const t = -v.y;
    Y = -t * (1.02 + 0.83 * smooth(0, 0.55, t));
    const bulge = 1 + 0.07 * Math.pow(Math.sin(Math.PI * Math.min(t / 0.75, 1)), 2);
    const taper = 1 - 0.58 * smooth(0.25, 1.0, t);
    x *= bulge * taper; z *= bulge * taper;
    const c = smooth(0.3, 1.0, t);
    x += 0.46 * c * c;
    z -= 0.18 * c * c;
    Y += 0.26 * Math.pow(smooth(0.75, 1.0, t), 2);
  }
  return out.set(x, Y + 0.18, z);
}

let SHARED = null;
function shared() {
  if (SHARED) return SHARED;
  let g = new THREE.SphereGeometry(1, 220, 165);
  g.deleteAttribute('normal'); g.deleteAttribute('uv');
  g = mergeVertices(g, 1e-6);
  const pos = g.attributes.position;
  const weights = new Float32Array(pos.count * 2);
  const v = new THREE.Vector3(), out = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    shape(v, out);
    ARMS.forEach((arm, j) => {
      const d = Math.acos(clamp(v.dot(arm.a), -1, 1));
      if (d < arm.s) { const u = d / arm.s; out.addScaledVector(arm.d, arm.L * Math.pow(1 - u * u, 0.8)); }
      weights[i * 2 + j] = smooth(arm.s * 1.3, arm.s * 0.5, d);
    });
    pos.setXYZ(i, out.x, out.y, out.z);
  }
  g.setAttribute('aArm', new THREE.BufferAttribute(weights, 2));
  g.computeVertexNormals();
  g.computeBoundingSphere();

  // arm pivots sit just inside the shoulder; arms swing in the body's frontal plane
  const arms = ARMS.map((arm) => {
    const sp = shape(arm.a, new THREE.Vector3());
    const pivot = sp.clone().addScaledVector(sp.clone().sub(v3(0, 0.18, 0)).normalize(), -0.1);
    const z = v3(0, 0, 1);
    return { ...arm, pivot, axis: z.clone().addScaledVector(arm.d, -z.dot(arm.d)).normalize() };
  });

  const eyeScale = v3(0.2, 0.25, 0.095);
  const probe = new THREE.Mesh(g, new THREE.MeshBasicMaterial());
  const ray = new THREE.Raycaster();
  const eyes = [[-0.32, 0.09, 0.06], [0.32, 0.09, -0.06]].map(([x, y, roll], i) => {
    ray.set(v3(x, y, 5), v3(0, 0, -1));
    const hit = ray.intersectObject(probe)[0];
    const n = hit.face.normal.clone().add(v3(0, 0, 0.6)).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(v3(0, 0, 1), n);
    q.multiply(new THREE.Quaternion().setFromAxisAngle(v3(0, 0, 1), roll));
    return { pos: hit.point.clone().addScaledVector(n, -0.052), quat: q, glitch: i === 1, center: new THREE.Vector2(x, y) };
  });
  probe.material.dispose();

  // surface points: the tail band feeds falling voxels, the full list feeds materialize bursts
  const band = [], all = [];
  for (let i = 0; i < pos.count; i += 3) {
    const p = v3(pos.getX(i), pos.getY(i), pos.getZ(i));
    all.push(p);
    if (p.y > DISSOLVE_Y - 0.02 && p.y < DISSOLVE_Y + 0.3) band.push(p);
  }
  all.sort((a, b) => a.y - b.y);

  SHARED = {
    body: g, arms, eyes, eyeScale, band, all,
    eyeGeo: new THREE.SphereGeometry(1, 72, 54),
    cubeGeo: new RoundedBoxGeometry(1, 1, 1, 2, 0.14),
    heartTex: heartTexture(), sparkTex: sparkleTexture(), blobTex: blobTexture(),
  };
  return SHARED;
}

// ---------- textures ----------
function canvasTexture(size, draw, nearest) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  draw(cv.getContext('2d'), size);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  if (nearest) { t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; }
  return t;
}
function backdropTexture(center) {
  return canvasTexture(512, (x) => {
    const g = x.createRadialGradient(256, 236, 10, 256, 256, 330);
    g.addColorStop(0, center); g.addColorStop(1, '#050505');
    x.fillStyle = g; x.fillRect(0, 0, 512, 512);
  });
}
function blobTexture() {
  return canvasTexture(256, (x) => {
    const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.45, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  });
}
function heartTexture() {
  return canvasTexture(18, (x) => {
    const rows = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
    x.fillStyle = '#ffffff';
    rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === 'X') x.fillRect(2 + i * 2, 3 + j * 2, 2, 2); }));
  }, true);
}
function sparkleTexture() {
  return canvasTexture(64, (x) => {
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 14);
    g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    x.fillStyle = '#ffffff';
    x.beginPath(); x.moveTo(32, 2); x.lineTo(35, 29); x.lineTo(62, 32); x.lineTo(35, 35); x.lineTo(32, 62); x.lineTo(29, 35); x.lineTo(2, 32); x.lineTo(29, 29); x.closePath(); x.fill();
  });
}

// dark product-photo studio for reflections: overhead softbox, key panel, green + purple strips
function studioScene(blob) {
  const s = new THREE.Scene();
  const geo = new THREE.SphereGeometry(20, 32, 16);
  const col = [], p = geo.attributes.position, c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { c.set('#050506').lerp(new THREE.Color('#1c1d24'), smooth(-6, 16, p.getY(i))); col.push(c.r, c.g, c.b); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  s.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const panel = (w, h, color, k, at) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(...at); m.lookAt(0, 0, 0); s.add(m);
  };
  panel(9, 5, '#ffffff', 4, [0, 9, 1]);
  panel(4, 5, '#ffffff', 2.4, [-6, 3, 6]);
  panel(3, 4, '#dfe6ff', 0.8, [7, 0, 5]);
  panel(0.9, 9, GREEN, 3, [-8, 0, -4]);
  panel(0.9, 9, PURPLE, 5, [8, 0, -4]);
  panel(7, 0.6, '#ffffff', 1.4, [0, 4, -9]);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.MeshBasicMaterial({ map: blob, color: new THREE.Color('#ffffff').multiplyScalar(0.22), transparent: true, side: THREE.DoubleSide }));
  floor.position.set(0, -10, 2); floor.lookAt(0, 0, 0); s.add(floor);
  return s;
}

// ---------- shaders ----------
const GLSL_COMMON = /* glsl */`
uniform float uTime; uniform float uGlitch; uniform float uBandY; uniform float uBandH; uniform float uShift;
float gh12(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
`;
const GLSL_BAND = /* glsl */`
{ vec4 gw = modelMatrix * vec4(transformed, 1.0);
  float inBand = (1.0 - step(uBandH, abs(gw.y - uBandY))) * uGlitch;
  gw.x += uShift * inBand;
  transformed = (inverse(modelMatrix) * gw).xyz; }
`;
const BODY_FRAG_PARS = /* glsl */`
varying vec3 vObj;
uniform float uDissolveY;
uniform vec3 uMouthIn; uniform vec3 uTongue; uniform vec3 uTeeth; uniform vec3 uBlush; uniform float uBlushAmt; uniform float uBlushGlow;
uniform vec3 uGlyph; uniform float uGlyphGlow; uniform vec3 uEdgeA; uniform vec3 uEdgeB; uniform float uEdgeGlow;
uniform vec2 uEyeL; uniform vec2 uEyeR; uniform vec2 uEyeRad; uniform vec2 uMouthPos; uniform float uMouthRot;
uniform float uMouthOpen; uniform float uMouthWide; uniform float uSmile; uniform vec2 uLash; uniform float uArcUp; uniform float uLashGlow;
float sdBox(vec2 p, vec2 b){ vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
`;
const BODY_FRAG_MAIN = /* glsl */`
// voxel dissolve: front-facing square pixel columns, each column ends at its own height,
// and a few stray pixels hang on just below the edge
vec2 gCell = floor(vObj.xy / 0.072);
float gH = vObj.y - (uDissolveY + gh12(vec2(gCell.x, 3.0)) * 0.28);
float gStray = step(0.8, gh12(gCell + 11.0)) * step(-0.17, gH) * step(gH, 0.0);
if (gH < 0.0 && gStray < 0.5) discard;
float gEdge = max(1.0 - step(0.072, gH), gStray);
float gPick = gh12(gCell * 1.37 + 3.1);

// face, painted in object space on the front of the head
float gFront = smoothstep(0.2, 0.5, vObj.z);
vec2 gF = vObj.xy;

// mouth: a "D" smile whose width and depth animate
vec2 gM = gF - uMouthPos;
float gc = cos(uMouthRot), gs = sin(uMouthRot);
gM = mat2(gc, gs, -gs, gc) * gM;
float gW = 0.142 + 0.04 * uMouthWide;
float gD = 0.045 + 0.09 * uMouthOpen;
float gTop0 = 0.012;
float gTopY = gTop0 + gM.x * gM.x * (0.7 + 0.7 * uMouthWide);
float gMsd = max((length(vec2(gM.x / gW, (gM.y - gTop0) / gD)) - 1.0) * min(gW, gD), gM.y - gTopY);
float gAA = fwidth(gMsd) + 1e-4;
float gMouth = (1.0 - smoothstep(-gAA, gAA, gMsd)) * gFront;
float gTeeth = 0.0;
for (int k = 0; k < 2; k++) {
  float fx = k == 0 ? -0.47 * gW : 0.43 * gW;
  float t = (gTop0 + fx * fx * (0.7 + 0.7 * uMouthWide) - gM.y) / 0.05;
  float fsd = max(abs(gM.x - fx) - 0.024 * (1.0 - t), max(-t, t - 1.0) * 0.05);
  gTeeth = max(gTeeth, 1.0 - smoothstep(-gAA, gAA, fsd));
}
gTeeth *= gMouth;
float gTongue = (1.0 - smoothstep(-gAA, gAA, (length(vec2((gM.x - 0.012) / (gW * 0.56), (gM.y - (gTop0 - gD * 0.8)) / (gD * 0.52))) - 1.0) * gD * 0.5)) * gMouth;

// contact shadows around the mouth and the outside of each eye
float gAO = 1.0 - 0.3 * (1.0 - smoothstep(0.0, 0.05, gMsd)) * step(0.0, gMsd) * gFront;
float gEl = length((gF - uEyeL) / uEyeRad) - 1.0;
float gEr = length((gF - uEyeR) / uEyeRad) - 1.0;
gAO *= 1.0 - 0.36 * (1.0 - smoothstep(0.0, 0.32, gEl)) * step(0.0, gEl) * gFront * (1.0 - uLash.x);
gAO *= 1.0 - 0.36 * (1.0 - smoothstep(0.0, 0.32, gEr)) * step(0.0, gEr) * gFront * (1.0 - uLash.y);

// closed-eye lines: a relaxed blink curves down, a laugh curves up into ^ ^
float gLash = 0.0;
for (int k = 0; k < 2; k++) {
  vec2 c = k == 0 ? uEyeL : uEyeR;
  float lv = k == 0 ? uLash.x : uLash.y;
  vec2 q = (gF - c) / uEyeRad.x;
  float cy = mix(-0.32, 0.55, uArcUp) * (1.0 - q.x * q.x) + mix(0.04, -0.3, uArcUp);
  float dl = length(vec2(max(abs(q.x) - 0.82, 0.0), q.y - cy)) * uEyeRad.x;
  float la = fwidth(dl) + 1e-4;
  gLash = max(gLash, (1.0 - smoothstep(0.017 - la, 0.017 + la, dl)) * lv);
}
gLash *= gFront;

float gB = 0.0;
for (int k = 0; k < 2; k++) {
  vec2 bc = vec2(k == 0 ? -0.49 : 0.49, -0.14);
  gB = max(gB, 1.0 - smoothstep(0.05, 1.0, length((gF - bc) / vec2(0.125, 0.075))));
}
float gBlush = gB * uBlushAmt * (0.7 + 0.6 * uSmile) * gFront;

vec2 gG = gF - vec2(0.0, 0.68);
float gGsd = min(min(sdBox(gG - vec2(0.012, 0.0), vec2(0.034, 0.13)) - 0.006,
                     sdSeg(gG, vec2(0.04, 0.122), vec2(-0.062, 0.062)) - 0.032),
                 sdBox(gG - vec2(0.012, -0.118), vec2(0.078, 0.024)) - 0.006);
float gGa = fwidth(gGsd) + 1e-4;
float gGlyphLine = (1.0 - smoothstep(0.016 - gGa, 0.016 + gGa, abs(gGsd))) * gFront;
float gGlyphFill = (1.0 - smoothstep(-gGa, gGa, gGsd)) * gFront;
float gOpaque = max(max(gMouth, gGlyphFill), gLash);
`;
const BODY_COLOR = /* glsl */`
vec3 gMouthCol = mix(uMouthIn * 2.4, uMouthIn, smoothstep(-gD, 0.0, gM.y));
gMouthCol = mix(gMouthCol, uTongue * mix(0.75, 1.1, smoothstep(gTop0 - gD, gTop0 - gD * 0.4, gM.y)), gTongue);
gMouthCol = mix(gMouthCol, uTeeth, gTeeth);
diffuseColor.rgb = mix(diffuseColor.rgb, uBlush, gBlush);
diffuseColor.rgb *= gAO;
diffuseColor.rgb *= 1.0 - 0.45 * max(gGlyphFill, gGlyphLine);
diffuseColor.rgb = mix(diffuseColor.rgb, uMouthIn * 0.7, gLash);
diffuseColor.rgb = mix(diffuseColor.rgb, gMouthCol, gMouth);
if (gEdge > 0.5 && gPick < 0.6) diffuseColor.rgb *= 0.35;
if (!gl_FrontFacing) diffuseColor.rgb = vec3(0.015);
`;
const BODY_EMISSIVE = /* glsl */`
totalEmissiveRadiance *= (1.0 - gMouth) * (1.0 - gLash) * gAO;
totalEmissiveRadiance += uGlyph * (gGlyphLine * uGlyphGlow + gGlyphFill * 0.22 * uGlyphGlow);
totalEmissiveRadiance += uEdgeA * gLash * uLashGlow + uBlush * gBlush * uBlushGlow;
if (gEdge > 0.5 && gPick < 0.6) totalEmissiveRadiance += (gPick < 0.33 ? uEdgeA : uEdgeB) * uEdgeGlow;
if (!gl_FrontFacing) totalEmissiveRadiance += mix(uEdgeA, uEdgeB, gPick) * 0.3 * uEdgeGlow;
`;

function bodyMaterial(v, U, env) {
  const p = { ...v.body };
  for (const k of ['color', 'sheenColor', 'emissive']) if (p[k]) p[k] = new THREE.Color(p[k]);
  const m = new THREE.MeshPhysicalMaterial({ side: THREE.DoubleSide, envMap: env, envMapIntensity: v.env, ...p });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U.shared, U.body);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${GLSL_COMMON}
        attribute vec2 aArm; uniform mat3 uArmRL; uniform mat3 uArmRR; uniform vec3 uPivL; uniform vec3 uPivR;
        varying vec3 vObj;`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        objectNormal = normalize(mix(objectNormal, uArmRL * objectNormal, aArm.x));
        objectNormal = normalize(mix(objectNormal, uArmRR * objectNormal, aArm.y));`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vObj = position;
        transformed = mix(transformed, uPivL + uArmRL * (transformed - uPivL), aArm.x);
        transformed = mix(transformed, uPivR + uArmRR * (transformed - uPivR), aArm.y);
        float lw = smoothstep(-0.1, -1.25, position.y);
        transformed.x += sin(uTime * 2.3 - position.y * 2.4) * 0.05 * lw;
        transformed.z += cos(uTime * 1.7 - position.y * 2.0) * 0.035 * lw;
        ${GLSL_BAND}`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\n${GLSL_COMMON}\n${BODY_FRAG_PARS}`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${BODY_FRAG_MAIN}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${BODY_COLOR}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.3, gMouth); roughnessFactor = mix(roughnessFactor, 0.22, gTeeth);`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>\nmetalnessFactor *= (1.0 - gOpaque) * (1.0 - 0.8 * smoothstep(0.0, 0.15, gBlush));`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${BODY_EMISSIVE}`);
  };
  m.customProgramCacheKey = () => 'glitchy-body-v3';
  return m;
}

function eyeMaterial(U, glitch, env) {
  const lids = { uBlink: { value: 0 }, uSmileLid: { value: 0 } };
  const m = new THREE.MeshPhysicalMaterial({ color: 0x040506, roughness: 0.07, clearcoat: 1, clearcoatRoughness: 0.02, envMap: env, envMapIntensity: 1 });
  m.userData.lids = lids;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U.shared, U.eye, lids);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${GLSL_COMMON}\nvarying vec3 vEye;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nvEye = position;\n${GLSL_BAND}`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\n${GLSL_COMMON}
        varying vec3 vEye; uniform vec2 uLook; uniform vec3 uIris; uniform vec3 uIris2; uniform float uIrisGlow;
        uniform float uBlink; uniform float uSmileLid;`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        // upper lid sweeps down on a blink; smiling cheeks push a curved lower lid up into a crescent
        float eTop = mix(1.25, -1.3, uBlink) - 0.1 * vEye.x * vEye.x;
        float eLow = -1.25 + uSmileLid * (0.95 + 0.55 * (1.0 - vEye.x * vEye.x));
        if (vEye.y > eTop || vEye.y < eLow) discard;
        float eRim = smoothstep(0.0, 0.1, min(eTop - vEye.y, vEye.y - eLow));`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        vec2 e = vEye.xy;
        vec2 c = uLook;
        vec3 em = vec3(0.0);
        ${glitch ? `
        vec2 q = e;
        float band = floor(q.y * 9.0);
        float tick = floor(uTime * 7.0);
        float sl = (gh12(vec2(band, tick)) - 0.5) * 0.24 * (0.2 + uGlitch);
        q.x += sl * step(0.6, gh12(vec2(band * 1.7, tick)));
        vec2 qp = (floor(q * 13.0) + 0.5) / 13.0;
        float a = 1.0 - step(0.52, length(qp - c - vec2(-0.075, 0.0)));
        float b = 1.0 - step(0.52, length(qp - c - vec2(0.075, 0.0)));
        vec2 pp = abs(qp - c);
        float pup = step(max(pp.x, pp.y), 0.16);
        vec3 col = uIris2 * a * (1.0 - b) + uIris * b * (1.0 - a) + vec3(0.95) * a * b * 0.55;
        em += col * (1.0 - pup) * uIrisGlow;
        vec2 s1 = abs(e - vec2(-0.28, 0.33));
        em += vec3(1.0) * step(max(s1.x, s1.y), 0.11) * 1.6;
        vec2 s2 = abs(e - vec2(0.26, -0.26));
        em += vec3(1.0) * step(max(s2.x, s2.y), 0.05) * 1.2;
        ` : `
        float aa = fwidth(e.x) * 1.5 + 0.002;
        vec2 ec = e - c;
        float d = length(ec);
        float iris = 1.0 - smoothstep(0.52 - aa, 0.52 + aa, d);
        float pupil = 1.0 - smoothstep(0.2 - aa, 0.2 + aa, length(ec * vec2(1.0, 0.86)));
        float grad = mix(1.45, 0.45, smoothstep(-0.5, 0.5, ec.y));
        float ring = smoothstep(0.36, 0.52, d) * 0.6;
        float fibre = 0.86 + 0.14 * sin(atan(ec.y, ec.x) * 14.0);
        em += uIris * grad * (1.0 - ring) * fibre * iris * (1.0 - pupil) * uIrisGlow;
        em += vec3(1.0) * (1.0 - smoothstep(0.14, 0.16, length((e - vec2(-0.28, 0.33)) * vec2(1.0, 1.1)))) * 1.7;
        em += vec3(1.0) * (1.0 - smoothstep(0.06, 0.075, length(e - vec2(0.26, -0.26)))) * 1.3;
        em += vec3(1.0) * (1.0 - smoothstep(0.03, 0.042, length(e - vec2(-0.04, 0.43)))) * 1.2;
        `}
        totalEmissiveRadiance += em * eRim * step(0.0, vEye.z);`);
  };
  m.customProgramCacheKey = () => 'glitchy-eye-' + (glitch ? 'g' : 'n');
  return m;
}

const VignetteShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uGrain: { value: 0.016 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime; uniform float uGrain; varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float v = smoothstep(0.9, 0.3, length((vUv - 0.5) * vec2(1.0, 1.12)));
      c.rgb *= mix(0.7, 1.0, v);
      float n = fract(sin(dot(vUv * 1000.0 + fract(uTime) * 61.0, vec2(12.9898, 78.233))) * 43758.5453);
      c.rgb += (n - 0.5) * uGrain;
      gl_FragColor = c;
    }`,
};

// ---------- voxel particles ----------
class Voxels {
  constructor(count, material, colors, rand, sizeMin, sizeMax) {
    const S = shared();
    this.mesh = new THREE.InstancedMesh(S.cubeGeo, material, count);
    this.mesh.frustumCulled = false;
    this.rand = rand; this.sizeMin = sizeMin; this.sizeMax = sizeMax;
    this.p = []; this.dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const it = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), age: 0, life: 1, size: 0.05, rx: 0, ry: 0, spin: 0 };
      this.respawn(it, true);
      this.p.push(it);
      if (colors) this.mesh.setColorAt(i, colors[i % colors.length]);
    }
    if (colors) this.mesh.instanceColor.needsUpdate = true;
  }
  respawn(it, initial, burst = 0, from = null) {
    const r = this.rand, S = shared();
    const s = from || S.band[(r() * S.band.length) | 0];
    it.pos.copy(s);
    const out = v3(s.x - 0.25, 0, s.z).normalize();
    it.vel.set(out.x * (0.02 + r() * 0.09 + burst), -(0.1 + r() * 0.2) - burst * 0.4, out.z * (0.02 + r() * 0.08 + burst));
    it.life = 1.4 + r() * 1.8;
    it.age = initial ? r() * it.life : 0;
    it.size = this.sizeMin + r() * (this.sizeMax - this.sizeMin);
    it.rx = r() < 0.6 ? 0 : r() * 0.6; it.ry = r() * 0.5; it.spin = (r() - 0.5) * 1.6;
    if (initial) it.pos.addScaledVector(it.vel, it.age);
  }
  burst(n, atY = null) {
    const S = shared();
    for (let i = 0; i < Math.min(n, this.p.length); i++) {
      let from = null;
      if (atY !== null) {
        // pick a surface point near the given height (S.all is sorted by y)
        let lo = 0, hi = S.all.length - 1;
        while (lo < hi) { const mid = (lo + hi) >> 1; if (S.all[mid].y < atY) lo = mid + 1; else hi = mid; }
        from = S.all[clamp(lo + (((this.rand() - 0.5) * 900) | 0), 0, S.all.length - 1)];
      }
      this.respawn(this.p[(this.rand() * this.p.length) | 0], false, atY !== null ? 0.25 : 0.5, from);
    }
  }
  update(dt) {
    const d = this.dummy;
    for (let i = 0; i < this.p.length; i++) {
      const it = this.p[i];
      it.age += dt;
      if (it.age > it.life) this.respawn(it, false);
      it.vel.y -= 0.06 * dt;
      it.pos.addScaledVector(it.vel, dt);
      const k = it.age / it.life;
      const env = Math.min(1, k / 0.1) * (1 - smooth(0.6, 1, k));
      d.position.copy(it.pos);
      d.rotation.set(it.rx, it.ry + it.spin * it.age, 0);
      d.scale.setScalar(Math.max(1e-4, it.size * env));
      d.updateMatrix();
      this.mesh.setMatrixAt(i, d.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// ---------- pixel hearts and sparkles ----------
class Fx {
  constructor(scene, rand) {
    const S = shared();
    this.rand = rand; this.items = [];
    for (let i = 0; i < 18; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: S.heartTex, transparent: true, depthWrite: false }));
      s.visible = false; scene.add(s);
      this.items.push({ s, age: 0, life: 0, vel: new THREE.Vector3(), size: 0, kind: 'heart', spin: 0 });
    }
  }
  take() { return this.items.find((it) => !it.s.visible) || this.items[0]; }
  hearts(n, o, scale) {
    const r = this.rand, S = shared();
    for (let i = 0; i < n; i++) {
      const it = this.take(), side = i % 2 ? 1 : -1;
      it.kind = 'heart'; it.age = -i * 0.12; it.life = 1.5 + r() * 0.4; it.size = (0.17 + r() * 0.08) * scale; it.spin = 0;
      it.s.material.map = S.heartTex; it.s.material.rotation = (r() - 0.5) * 0.4;
      it.s.material.color.set(r() < 0.7 ? PURPLE : GREEN).multiplyScalar(r() < 0.7 ? 2.2 : 1.5);
      it.s.position.set(o.x + side * (0.5 + r() * 0.4) * scale, o.y + (0.75 + r() * 0.3) * scale, o.z + 0.5 * scale);
      it.vel.set(side * (0.1 + r() * 0.15) * scale, (0.5 + r() * 0.25) * scale, 0);
      it.s.visible = true;
    }
  }
  sparkles(n, o, scale) {
    const r = this.rand, S = shared();
    for (let i = 0; i < n; i++) {
      const it = this.take(), a = r() * Math.PI * 2;
      it.kind = 'spark'; it.age = -r() * 0.4; it.life = 0.6 + r() * 0.4; it.size = (0.16 + r() * 0.16) * scale; it.spin = (r() - 0.5) * 3;
      it.s.material.map = S.sparkTex; it.s.material.rotation = r();
      it.s.material.color.set(r() < 0.5 ? STATIC : GREEN).multiplyScalar(1.8);
      it.s.position.set(o.x + Math.cos(a) * (1.05 + r() * 0.3) * scale, o.y + (0.15 + Math.sin(a) * (0.95 + r() * 0.2)) * scale, o.z + 0.4 * scale);
      it.vel.set(0, 0.05 * scale, 0);
      it.s.visible = true;
    }
  }
  update(dt) {
    for (const it of this.items) {
      if (!it.s.visible) continue;
      it.age += dt;
      if (it.age < 0) { it.s.scale.setScalar(1e-4); continue; }
      const k = it.age / it.life;
      if (k >= 1) { it.s.visible = false; continue; }
      it.s.position.addScaledVector(it.vel, dt);
      let sc;
      if (it.kind === 'heart') {
        it.s.position.x += Math.sin(it.age * 6) * 0.004;
        sc = it.size * (k < 0.15 ? smooth(0, 0.15, k) * 1.25 : mix(1.25, 1, smooth(0.15, 0.3, k)));
        it.s.material.opacity = 1 - smooth(0.65, 1, k);
      } else {
        sc = it.size * Math.sin(k * Math.PI);
        it.s.material.rotation += it.spin * dt;
        it.s.material.opacity = 1;
      }
      it.s.scale.setScalar(Math.max(1e-4, sc));
    }
  }
  hideAll() { this.items.forEach((it) => { it.s.visible = false; }); }
}

// ---------- one character ----------
export class GlitchyCharacter {
  constructor(stage, variant, opts = {}) {
    const S = shared(), v = GLITCHY_VARIANTS[variant];
    if (!v) throw new Error('unknown Glitchy variant: ' + variant);
    this.stage = stage; this.v = v; this.variant = variant;
    this.rand = rng(opts.seed ?? (variant.charCodeAt(0) * 977 + stage.characters.length * 131));
    this.opts = { idle: opts.idle ?? stage.opts.idle, wander: opts.wander ?? stage.opts.wander };
    const c = (h) => new THREE.Color(h);
    this.U = {
      shared: { uTime: { value: 0 }, uGlitch: { value: 0 }, uBandY: { value: 0 }, uBandH: { value: 0.1 }, uShift: { value: 0 } },
      body: {
        uDissolveY: { value: DISSOLVE_Y },
        uMouthIn: { value: c(v.mouthIn) }, uTongue: { value: c(v.tongue) }, uTeeth: { value: c(v.teeth) },
        uBlush: { value: c(v.blush) }, uBlushAmt: { value: v.blushAmt }, uBlushGlow: { value: v.blushGlow },
        uGlyph: { value: c(v.glyph) }, uGlyphGlow: { value: v.glyphGlow },
        uEdgeA: { value: c(v.edgeA) }, uEdgeB: { value: c(v.edgeB) }, uEdgeGlow: { value: v.edgeGlow },
        uEyeL: { value: S.eyes[0].center }, uEyeR: { value: S.eyes[1].center },
        uEyeRad: { value: new THREE.Vector2(S.eyeScale.x * 0.83, S.eyeScale.y * 0.83) },
        uMouthPos: { value: new THREE.Vector2(0.02, -0.19) }, uMouthRot: { value: 0.06 },
        uMouthOpen: { value: 0.5 }, uMouthWide: { value: 0.1 }, uSmile: { value: 0.2 },
        uLash: { value: new THREE.Vector2() }, uArcUp: { value: 0 }, uLashGlow: { value: v.lashGlow },
        uArmRL: { value: new THREE.Matrix3() }, uArmRR: { value: new THREE.Matrix3() },
        uPivL: { value: S.arms[0].pivot }, uPivR: { value: S.arms[1].pivot },
      },
      eye: { uLook: { value: new THREE.Vector2() }, uIris: { value: c(v.iris) }, uIris2: { value: c(v.iris2) }, uIrisGlow: { value: v.irisGlow } },
    };

    // root = placement in the scene; rig = the animated body inside it
    this.root = new THREE.Group();
    this.root.position.set(opts.x ?? 0, opts.y ?? 0, opts.z ?? 0);
    this.root.scale.setScalar(opts.scale ?? 1);
    this.baseYaw = opts.yaw ?? 0;
    stage.scene.add(this.root);
    const rig = this.rig = new THREE.Group(); this.root.add(rig);
    rig.add(new THREE.Mesh(S.body, bodyMaterial(v, this.U, stage.env)));
    this.eyes = S.eyes.map((e) => {
      const m = new THREE.Mesh(S.eyeGeo, eyeMaterial(this.U, e.glitch, stage.env));
      m.position.copy(e.pos); m.quaternion.copy(e.quat); m.scale.copy(S.eyeScale);
      m.renderOrder = 1; rig.add(m); return m;
    });

    // voxels breaking off the dissolving tail: body-material cubes + glowing brand cubes
    const bp = { ...v.body }; for (const k of ['color', 'sheenColor']) if (bp[k]) bp[k] = new THREE.Color(bp[k]);
    const glowCols = [c(GREEN).multiplyScalar(2.2), c(PURPLE).multiplyScalar(4.5), c(GREEN).multiplyScalar(1.6)];
    this.voxels = [
      new Voxels(44, new THREE.MeshPhysicalMaterial({ ...bp, envMap: stage.env, envMapIntensity: v.env }), null, this.rand, 0.03, 0.07),
      new Voxels(46, new THREE.MeshBasicMaterial(), glowCols, this.rand, 0.03, 0.075),
    ];
    this.voxels.forEach((x) => rig.add(x.mesh));

    if (stage.opts.floor) {
      this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), new THREE.MeshBasicMaterial({ map: S.blobTex, color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false }));
      this.shadow.rotation.x = -Math.PI / 2; stage.scene.add(this.shadow);
      this.glow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ map: S.blobTex, color: c(GREEN).multiplyScalar(0.16), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      this.glow.rotation.x = -Math.PI / 2; stage.scene.add(this.glow);
    }
    this.fx = new Fx(stage.scene, this.rand);

    const rr = this.rand;
    this.s = {
      look: new THREE.Vector2(), lookT: new THREE.Vector2(), lookHold: -1, rotY: 0, vel: 0, lastDrag: -1e9,
      hover: false, hoverAmt: 0, glitchEnd: -1, nextGlitch: 2 + rr() * 4, nextBlink: 1.5 + rr() * 3, blinkAt: -1,
      nextIdle: 2.5 + rr() * 3, nextLook: 1 + rr() * 2, cycle: 0, spinOffset: 0,
      // page-wide pointer attention: spring-follow offset (root-local units), proximity and excitement cooldown
      tracking: false, trackAt: -1, near: 0, exciteCool: 0,
      followT: new THREE.Vector2(), follow: new THREE.Vector2(), followV: new THREE.Vector2(),
    };
    this.e = { smile: 0.2, open: 0.5, wide: 0.1, arcUp: 0, armL: 0, armR: 0, blinkL: 0, blinkR: 0 };
    this.act = null; this.queue = []; this.tween = null; this.dissolve = null;
    this.t = 0; this.tmpM4 = new THREE.Matrix4(); this.tmpV = new THREE.Vector3();
  }

  get origin() { return this.rig.getWorldPosition(this.tmpV); }
  get scale() { return this.root.scale.x; }

  // ---- public controls ----
  play(name) {
    if (!DUR[name]) return;
    const t = this.t, sc = this.scale;
    this.act = { name, t0: t, dur: DUR[name] };
    this.s.nextIdle = t + DUR[name] + 3.5 + this.rand() * 4;
    if (name === 'laugh') { this.fx.hearts(3, this.origin, sc); this.queue.push({ at: t + 0.7, fn: () => this.fx.hearts(2, this.origin, sc) }); this.fx.sparkles(4, this.origin, sc); }
    if (name === 'wave' || name === 'wink') this.fx.sparkles(name === 'wave' ? 3 : 2, this.origin, sc);
    if (name === 'spin') this.queue.push({ at: t + 0.9, fn: () => this.fx.sparkles(6, this.origin, sc) });
    if (name === 'hop') this.queue.push({ at: t + 0.85, fn: () => this.voxels.forEach((x) => x.burst(18)) });
    if (name === 'glitch') { this.glitch(0.5); this.voxels.forEach((x) => x.burst(30)); }
  }
  // gaze in [-1, 1] screen-ish space; hold keeps idle wandering away for that many seconds
  lookAt(x, y, hold = 1.5) { this.s.lookT.set(clamp(x, -1, 1), clamp(y, -1, 1)); this.s.lookHold = this.t + hold; }
  pointer(x, y) { this.s.hover = true; this.lookAt(x, y, 0.4); }
  // Pointer anywhere on the page. x, y = pointer offset from this character in character radii (y up),
  // proximity in [0, 1]. Eyes and head follow, the body drifts toward it on a spring, closeness = bigger smile.
  track(x, y, proximity = 0) {
    const s = this.s;
    s.tracking = true; s.trackAt = this.t; s.near = clamp(proximity, 0, 1);
    s.lookT.set(clamp(x * 0.55, -1, 1), clamp(y * 0.55, -1, 1)); s.lookHold = this.t + 1.5;
    s.followT.set(clamp(x, -1.6, 1.6) * 0.17, clamp(y, -1.4, 1.4) * 0.11);
  }
  untrack() { const s = this.s; s.tracking = false; s.near = 0; s.followT.set(0, 0); }
  // A fast flick of the pointer: a quick hop or glitch, rate-limited so it stays a treat.
  excite() {
    if (this.act || this.t < this.s.exciteCool || this.stage.opts.reducedMotion) return;
    this.s.exciteCool = this.t + 3.5;
    this.play(this.rand() < 0.55 ? 'hop' : 'glitch');
  }
  leave() { this.s.hover = false; this.s.lookT.set(0, 0); }
  tap() { this.play(TAP_CYCLE[this.s.cycle++ % TAP_CYCLE.length]); }
  hover() { if (!this.act) this.play('wink'); }
  materialize(dur = 1.6) { this.dissolve = { t0: this.t, dur, from: HIDDEN_Y, to: DISSOLVE_Y }; this.setVisible(true); this.glitch(0.25); }
  dematerialize(dur = 0.8) { this.dissolve = { t0: this.t, dur, from: DISSOLVE_Y, to: HIDDEN_Y }; this.glitch(0.3); }
  hideNow() { this.dissolve = null; this.U.body.uDissolveY.value = HIDDEN_Y; this.setVisible(false); }
  setVisible(on) {
    this.root.visible = on;
    if (this.shadow) { this.shadow.visible = on; this.glow.visible = on; }
    if (!on) this.fx.hideAll();
  }
  moveTo({ x, y, z, scale, yaw }, dur = 0.9) {
    const r = this.root;
    this.tween = { t0: this.t, dur, from: { x: r.position.x, y: r.position.y, z: r.position.z, scale: r.scale.x, yaw: this.baseYaw },
      to: { x: x ?? r.position.x, y: y ?? r.position.y, z: z ?? r.position.z, scale: scale ?? r.scale.x, yaw: yaw ?? this.baseYaw } };
  }
  glitch(dur) {
    const U = this.U.shared;
    this.s.glitchEnd = this.t + dur;
    U.uBandY.value = this.root.position.y + (-0.6 + this.rand() * 1.6) * this.scale; U.uBandH.value = (0.05 + this.rand() * 0.1) * this.scale;
    U.uShift.value = (this.rand() < 0.5 ? -1 : 1) * (0.05 + this.rand() * 0.07) * this.scale;
  }
  // yaw added on top of everything (used for drag-to-spin and turntables)
  spinBy(rad) { this.s.rotY += rad; }
  // pointer drag: spins with inertia, then eases back to face front once the user lets go
  drag(rad) { this.s.vel = rad; this.s.rotY += rad; this.s.lastDrag = this.t; }

  update(dt) {
    const t = (this.t += dt);
    const s = this.s, U = this.U, rig = this.rig, e = this.e, reduced = this.stage.opts.reducedMotion;
    U.shared.uTime.value = t;
    for (let i = this.queue.length - 1; i >= 0; i--) if (t >= this.queue[i].at) { this.queue[i].fn(); this.queue.splice(i, 1); }

    // placement tween + materialize/dematerialize sweep
    if (this.tween) {
      const k = clamp((t - this.tween.t0) / this.tween.dur, 0, 1), q = easeInOut(k), a = this.tween.from, b = this.tween.to;
      this.root.position.set(mix(a.x, b.x, q), mix(a.y, b.y, q), mix(a.z, b.z, q));
      this.root.scale.setScalar(mix(a.scale, b.scale, q)); this.baseYaw = mix(a.yaw, b.yaw, q);
      if (k >= 1) this.tween = null;
    }
    if (this.dissolve) {
      const D = this.dissolve, k = clamp((t - D.t0) / D.dur, 0, 1);
      const y = mix(D.from, D.to, D.to < D.from ? easeOut(k) : easeInOut(k));
      U.body.uDissolveY.value = y;
      if (((t * 60) | 0) % 3 === 0 && k < 1) this.voxels.forEach((x) => x.burst(3, y + 0.1));
      if (k >= 1) { this.dissolve = null; if (D.to === HIDDEN_Y) this.setVisible(false); }
    }
    const dy = U.body.uDissolveY.value;
    this.eyes.forEach((m) => { m.visible = dy < -0.05; });
    if (!this.root.visible) return;

    // idle life: random little performances, glitch flickers, wandering gaze
    if (this.opts.idle && !reduced && !this.act && t > s.nextIdle) this.play(IDLE[(this.rand() * IDLE.length) | 0]);
    if (this.opts.idle && !reduced && t > s.nextGlitch) { this.glitch(0.12 + this.rand() * 0.1); s.nextGlitch = t + 3 + this.rand() * 5; }
    if (this.opts.wander && !s.hover && t > s.lookHold && t > s.nextLook) {
      s.lookT.set(this.rand() < 0.35 ? 0 : (this.rand() - 0.5) * 1.2, this.rand() < 0.35 ? 0 : (this.rand() - 0.5) * 0.8);
      s.nextLook = t + 1.2 + this.rand() * 2.4;
    }
    const g = t < s.glitchEnd ? 1 : 0;
    if (g && this.rand() < 0.25) { U.shared.uBandY.value = this.root.position.y + (-0.6 + this.rand() * 1.6) * this.scale; U.shared.uShift.value *= -1; }
    U.shared.uGlitch.value = g;

    // natural blink
    if (t > s.nextBlink) { s.blinkAt = t; s.nextBlink = t + 2.2 + this.rand() * 3.2; }
    const bk = s.blinkAt > 0 ? (t - s.blinkAt) / 0.2 : 2;
    const blink = bk < 1 ? Math.sin(bk * Math.PI) : 0;

    // expression + pose targets: idle base, then the running action on top
    s.hoverAmt += (Math.max(s.hover ? 1 : 0, s.near) - s.hoverAmt) * (1 - Math.exp(-dt * 5));
    const f = reduced ? 0.3 : 1;
    const T = {
      smile: 0.28 + 0.3 * s.hoverAmt, open: 0.5 + 0.15 * s.hoverAmt + 0.05 * Math.sin(t * 2.1), wide: 0.12 + 0.18 * s.hoverAmt, arcUp: 0,
      armL: (0.1 + Math.sin(t * 1.6) * 0.08) * f, armR: (0.12 + Math.sin(t * 1.9 + 1) * 0.1) * f, blinkL: blink, blinkR: blink,
    };
    let hopY = 0, squash = 0, spin = 0, tilt = 0.06 * s.hoverAmt;
    const A = this.act;
    if (A) {
      const lt = t - A.t0, k = lt / A.dur;
      if (k >= 1) this.act = null;
      else {
        const env = smooth(0, 0.14, k) * (1 - smooth(0.8, 1, k));
        if (A.name === 'wave') {
          T.armR += env * (1.15 + Math.sin(lt * 12) * 0.4); T.smile += 0.4 * env; T.open += 0.3 * env; T.wide += 0.2 * env; tilt += 0.09 * env * Math.sin(lt * 3);
        } else if (A.name === 'laugh') {
          T.blinkL = Math.max(T.blinkL, env); T.blinkR = Math.max(T.blinkR, env); T.arcUp = 1;
          T.open = mix(T.open, 0.82 + 0.18 * Math.abs(Math.sin(lt * 13)), env); T.wide += 0.4 * env; T.smile += 0.5 * env;
          T.armL += env * (0.8 + Math.sin(lt * 13) * 0.12); T.armR += env * (0.75 + Math.sin(lt * 13 + 1) * 0.12);
          hopY = Math.abs(Math.sin(lt * 8)) * 0.08 * env;
        } else if (A.name === 'hop') {
          if (lt < 0.2) squash = -0.13 * smooth(0, 0.2, lt);
          else if (lt < 0.8) { const u = (lt - 0.2) / 0.6; hopY = 4 * u * (1 - u) * 0.38; squash = 0.1 * (1 - 2 * u) * (u < 0.5 ? 1 : 0.4); }
          else squash = -0.1 * Math.sin(((lt - 0.8) / 0.25) * Math.PI);
          T.armL += 0.6 * env; T.armR += 0.6 * env; T.open += 0.35 * env; T.smile += 0.35 * env;
        } else if (A.name === 'spin') {
          spin = easeInOut(clamp(k * 1.12, 0, 1)) * Math.PI * 2;
          T.armL += 0.55 * env; T.armR += 0.55 * env; T.smile += 0.35 * env; T.open += 0.25 * env; hopY = Math.sin(clamp(k * 1.12, 0, 1) * Math.PI) * 0.12;
        } else if (A.name === 'wink') {
          T.blinkL = Math.max(T.blinkL, Math.sin(clamp((k - 0.15) / 0.55, 0, 1) * Math.PI)); T.smile += 0.45 * env; T.open += 0.18 * env; tilt += 0.12 * env;
        } else if (A.name === 'glitch') {
          T.open += 0.3 * env; T.wide -= 0.15 * env;
        }
      }
    }
    // pointer attention: drift toward the pointer on an underdamped spring, give up after 2.5 s of stillness
    if (s.tracking && t - s.trackAt > 2.5) this.untrack();
    const fk = reduced ? 0 : 1;
    s.followV.x += (s.followT.x * fk - s.follow.x) * 30 * dt;
    s.followV.y += (s.followT.y * fk - s.follow.y) * 30 * dt;
    s.followV.multiplyScalar(Math.exp(-dt * 6.5));
    s.follow.addScaledVector(s.followV, dt);
    tilt += -s.followV.x * 0.55;

    // springs: faces react fast, limbs a little slower
    const kf = 1 - Math.exp(-dt * 16), ka = 1 - Math.exp(-dt * 11), kb = 1 - Math.exp(-dt * 30);
    for (const key of ['smile', 'open', 'wide', 'arcUp']) e[key] += (T[key] - e[key]) * kf;
    e.armL += (T.armL - e.armL) * ka; e.armR += (T.armR - e.armR) * ka;
    e.blinkL += (T.blinkL - e.blinkL) * kb; e.blinkR += (T.blinkR - e.blinkR) * kb;

    // face uniforms
    const smile = clamp(e.smile, 0, 1);
    U.body.uMouthOpen.value = clamp(e.open, 0, 1); U.body.uMouthWide.value = clamp(e.wide, 0, 1); U.body.uSmile.value = smile;
    U.body.uArcUp.value = e.arcUp;
    U.body.uLash.value.set(smooth(0.5, 0.82, e.blinkL), smooth(0.5, 0.82, e.blinkR));
    this.eyes[0].material.userData.lids.uBlink.value = e.blinkL; this.eyes[1].material.userData.lids.uBlink.value = e.blinkR;
    this.eyes.forEach((m) => { m.material.userData.lids.uSmileLid.value = smile * 0.52; });
    U.body.uGlyphGlow.value = this.v.glyphGlow * (1 + 0.15 * Math.sin(t * 2.4) + (A && A.name === 'laugh' ? 0.4 : 0));

    // arms
    const S = shared();
    U.body.uArmRL.value.setFromMatrix4(this.tmpM4.makeRotationAxis(S.arms[0].axis, S.arms[0].sign * e.armL));
    U.body.uArmRR.value.setFromMatrix4(this.tmpM4.makeRotationAxis(S.arms[1].axis, S.arms[1].sign * e.armR));

    // float, squash and stretch, hop
    const sq = Math.sin(t * 3.0) * 0.014 * f + squash;
    rig.position.x = s.follow.x;
    rig.position.y = Math.sin(t * 1.5) * 0.07 * f + hopY + s.follow.y;
    rig.rotation.z = Math.sin(t * 1.05) * 0.045 * f + tilt;
    rig.scale.set(1 - sq * 0.6, 1 + sq, 1 - sq * 0.6);

    // gaze + yaw (base placement + drag/turntable + action spin + look)
    s.look.lerp(s.lookT, 1 - Math.exp(-dt * 5));
    s.rotY += s.vel; s.vel *= Math.pow(0.9, dt * 60);
    if (s.lastDrag > -1e8 && t - s.lastDrag > 1.4) { const front = Math.round(s.rotY / (Math.PI * 2)) * Math.PI * 2; s.rotY += (front - s.rotY) * (1 - Math.exp(-dt * 2.2)); }
    rig.rotation.y = this.baseYaw + s.rotY + spin + s.look.x * 0.32 + Math.sin(t * 0.7) * 0.05 * f;
    rig.rotation.x = -s.look.y * 0.12 - s.followV.y * 0.3;
    U.eye.uLook.value.set(clamp(s.look.x * 0.24, -0.24, 0.24), clamp(s.look.y * 0.2, -0.2, 0.2));

    this.voxels.forEach((x) => x.update(dt));
    this.fx.update(dt);

    if (this.shadow) {
      const sc = this.scale, hgt = rig.position.y, P = this.root.position;
      const fx = rig.position.x * sc;
      this.shadow.position.set(P.x + 0.15 * sc + fx, P.y - 2.02 * sc, P.z);
      this.glow.position.set(P.x + 0.2 * sc + fx, P.y - 2.01 * sc, P.z);
      this.shadow.material.opacity = clamp(0.5 - hgt * 0.7, 0.15, 0.6) * smooth(0.6, -1.0, dy);
      const ss = (1 - clamp(hgt, -0.2, 0.6) * 0.5) * sc;
      this.shadow.scale.set(ss, ss * 0.45, 1);
      this.glow.scale.set(sc, sc * 0.5, 1);
      this.glow.material.opacity = clamp(0.9 - hgt, 0.3, 1) * smooth(0.6, -1.0, dy);
    }
  }
}

// ---------- the stage ----------
export class GlitchyStage {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} opts  pixelRatio, transparent, post, bloom, vignette, bokeh, floor, idle, wander,
   *                       reducedMotion, preserveDrawingBuffer, background, lights {key, rim}, exposure, seed
   */
  constructor(canvas, opts = {}) {
    opts = Object.fromEntries(Object.entries(opts).filter(([, val]) => val !== undefined));
    this.opts = {
      transparent: false, post: true, bokeh: true, floor: true, idle: true, wander: true, reducedMotion: false,
      background: '#16141e', lights: { key: 2.3, rim: 1.7 }, exposure: 1.0, bloom: [0.42, 0.45, 1.3], grain: 0.016, ...opts,
    };
    const o = this.opts, S = shared();
    if (o.transparent) { o.post = false; o.bokeh = false; o.floor = false; }
    this.rand = rng(o.seed ?? 4242);
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !o.post, alpha: o.transparent, premultipliedAlpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!o.preserveDrawingBuffer });
    r.setPixelRatio(o.pixelRatio ?? Math.min(globalThis.devicePixelRatio || 1, 1.75));
    r.toneMapping = THREE.NeutralToneMapping; r.toneMappingExposure = o.exposure;
    if (o.transparent) r.setClearColor(0x000000, 0);

    const scene = this.scene = new THREE.Scene();
    const pm = new THREE.PMREMGenerator(r);
    this.env = pm.fromScene(studioScene(S.blobTex), 0.02).texture;
    pm.dispose();

    this.camera = new THREE.PerspectiveCamera(o.fov ?? 30, 0.8, 0.1, 80);
    this.setCamera(o.cameraPos ?? [0, 0.1, 7.7], o.cameraTarget ?? [0, -0.2, 0]);

    if (!o.transparent) {
      this.backdrop = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), new THREE.MeshBasicMaterial({ map: backdropTexture(o.background), toneMapped: false, depthWrite: false }));
      this.backdrop.position.set(0, -0.1, -6); this.backdrop.renderOrder = -10; scene.add(this.backdrop);
    }
    if (o.bokeh) {
      this.bokeh = new THREE.Group(); scene.add(this.bokeh);
      [[30, 0.09], [16, 0.24]].forEach(([n, size]) => {
        const pos = [], col = [];
        for (let i = 0; i < n; i++) {
          pos.push((this.rand() - 0.5) * 12, (this.rand() - 0.5) * 8, -1.6 - this.rand() * 2.6);
          const c = new THREE.Color(this.rand() < 0.5 ? GREEN : PURPLE).multiplyScalar(0.35 + this.rand() * 0.35); col.push(c.r, c.g, c.b);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
        this.bokeh.add(new THREE.Points(g, new THREE.PointsMaterial({ size, map: S.blobTex, vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })));
      });
    }

    const L = o.lights;
    const key = new THREE.DirectionalLight(0xffffff, L.key); key.position.set(-2.4, 3.4, 4.2); scene.add(key);
    const fill = new THREE.DirectionalLight(0xdfe6ff, L.key * 0.25); fill.position.set(3, -0.5, 3); scene.add(fill);
    const rimG = new THREE.PointLight(GREEN, 12 * L.rim, 0, 2); rimG.position.set(-2.7, 1.1, -2.1); scene.add(rimG);
    const rimP = new THREE.PointLight(PURPLE, 18 * L.rim, 0, 2); rimP.position.set(2.7, 0.5, -1.9); scene.add(rimP);
    this.rims = [rimG, rimP];

    if (o.post) {
      // MSAA render, bloom on emissive parts only, tone map, then vignette + fine grain
      const rt = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: 4 });
      this.composer = new EffectComposer(r, rt);
      this.composer.addPass(new RenderPass(scene, this.camera));
      this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), o.bloom[0], o.bloom[1], o.bloom[2]);
      // clamp what feeds the bloom so tiny hot specular points can't turn into blocky halos
      const hp = this.bloom.materialHighPassFilter;
      const clamped = hp.fragmentShader.replace(/gl_FragColor\s*=\s*mix\(\s*outputColor,\s*texel,\s*alpha\s*\);/, 'gl_FragColor = min(mix(outputColor, texel, alpha), vec4(2.2));');
      if (clamped !== hp.fragmentShader) { hp.fragmentShader = clamped; hp.needsUpdate = true; }
      this.composer.addPass(this.bloom);
      this.composer.addPass(new OutputPass());
      this.vignette = new ShaderPass(VignetteShader);
      this.vignette.uniforms.uGrain.value = o.grain;
      this.composer.addPass(this.vignette);
    }

    this.characters = [];
    this.t = 0;
  }
  add(variant, opts) { const c = new GlitchyCharacter(this, variant, opts); this.characters.push(c); return c; }
  setCamera(pos, target) {
    this.camera.position.set(...pos);
    this.cameraTarget = new THREE.Vector3(...target);
    this.camera.lookAt(this.cameraTarget);
  }
  setFov(fov) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }
  setSize(w, h) {
    w = Math.max(2, w | 0); h = Math.max(2, h | 0);
    this.renderer.setSize(w, h, false);
    if (this.composer) this.composer.setSize(w, h);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }
  step(dt) {
    this.t += dt;
    for (const c of this.characters) c.update(dt);
    if (this.bokeh) { this.bokeh.position.y = Math.sin(this.t * 0.25) * 0.15; this.bokeh.rotation.y = Math.sin(this.t * 0.12) * 0.15; }
    if (this.vignette) this.vignette.uniforms.uTime.value = this.t;
  }
  render() { if (this.composer) this.composer.render(); else this.renderer.render(this.scene, this.camera); }
  dispose() {
    this.scene.traverse((o) => { if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose()); } });
    this.env.dispose();
    if (this.composer) this.composer.dispose();
    this.renderer.dispose();
  }
}
