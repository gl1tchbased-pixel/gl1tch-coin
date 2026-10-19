// Rank coins: the five holder tiers as minted coins — graphite, anodized green, chrome, iridescent
// violet, glass. Hover lifts a coin, click flips it with sparks; a connected wallet's tier steps
// forward and glows. Tier names and thresholds come in as options (src/lib/ranks.ts).
import * as THREE from 'three';
import { C, TAU, k, rng, textures, Sparks } from './fx';

const LOOKS = [
  { color: 0x3a3c46, metal: 0.75, rough: 0.45, glow: 0xb3b6c4, gi: 1.1 },
  { color: 0x3f9a2a, metal: 0.9, rough: 0.28, glow: 0x7cff4f, gi: 1.9 },
  { color: 0xdadde2, metal: 1, rough: 0.12, glow: 0x7cff4f, gi: 2.2 },
  { color: 0x5a45a0, metal: 1, rough: 0.2, glow: 0xb99bff, gi: 2.4, irid: true },
  { color: 0xe2d8ff, glow: 0x9b66ff, gi: 3, glass: true },
];

/** @param {{ stage: any, host: HTMLElement, pointer: {x:number,y:number,active:boolean}, ui: any, options: any, redraw: () => void }} ctx */
export function mount(ctx) {
  const { stage, host, pointer, ui, options, redraw } = ctx;
  const { scene, camera } = stage;
  const { glow: GLOW } = textures();
  const tiers = options.tiers;
  const css = getComputedStyle(document.documentElement);
  const MONO = css.getPropertyValue('--font-mono').trim() || 'monospace';

  const canvasTex = (draw) => {
    const c = document.createElement('canvas'); c.width = c.height = 512; draw(c.getContext('2d'));
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  };
  const mapTex = (seed) => canvasTex((g) => {
    const r = rng(seed); g.fillStyle = '#8f9096'; g.fillRect(0, 0, 512, 512);
    for (let rr = 8; rr < 256; rr += 2) { g.strokeStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${0.03 + r() * 0.06})`; g.lineWidth = 1; g.beginPath(); g.arc(256, 256, rr, 0, TAU); g.stroke(); }
    g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 8; g.beginPath(); g.arc(256, 256, 232, 0, TAU); g.stroke();
    g.lineWidth = 3; g.beginPath(); g.arc(256, 256, 200, 0, TAU); g.stroke();
  });
  const emTex = (tier) => canvasTex((g) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, 512, 512); g.fillStyle = '#fff'; g.strokeStyle = '#fff';
    g.lineWidth = 5; g.beginPath(); g.arc(256, 256, 218, 0, TAU); g.stroke();
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * TAU, r0 = i % 4 ? 206 : 196; g.lineWidth = 2; g.beginPath();
      g.moveTo(256 + Math.cos(a) * r0, 256 + Math.sin(a) * r0); g.lineTo(256 + Math.cos(a) * 212, 256 + Math.sin(a) * 212); g.stroke();
    }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `600 30px ${MONO}`; g.fillText('GL1TCH', 256, 150);
    const w = 22, gap = 12, tot = tier.lvl * w + (tier.lvl - 1) * gap;
    for (let i = 0; i < tier.lvl; i++) g.fillRect(256 - tot / 2 + i * (w + gap), 196, w, w);
    const name = tier.name.toUpperCase();
    g.font = `700 ${name.length > 10 ? 34 : 44}px ${MONO}`; g.fillText(name, 256, 282);
    g.font = `500 30px ${MONO}`; g.globalAlpha = 0.75; g.fillText(tier.hold, 256, 338); g.globalAlpha = 1;
  });

  const coins = [], pickable = [], faces = [], sparks = new Sparks(scene, 40), flipped = new Set();
  tiers.forEach((tier, i) => {
    const look = LOOKS[Math.min(i, LOOKS.length - 1)];
    const grp = new THREE.Group(); scene.add(grp);
    const em = emTex(tier);
    let face, rim;
    if (look.glass) {
      face = new THREE.MeshPhysicalMaterial({ color: look.color, metalness: 0, roughness: 0.06, transmission: 1, thickness: 0.5, ior: 1.45, emissive: look.glow, emissiveMap: em, emissiveIntensity: look.gi, clearcoat: 1, attenuationColor: new THREE.Color(0x7a3cff), attenuationDistance: 1.4 });
      rim = new THREE.MeshPhysicalMaterial({ color: look.color, metalness: 0, roughness: 0.05, transmission: 1, thickness: 0.3, ior: 1.45, clearcoat: 1, iridescence: 0.8 });
      grp.add(new THREE.Mesh(new THREE.CircleGeometry(0.62, 64), new THREE.MeshBasicMaterial({ color: k(C.glitch, 2.2), transparent: true, opacity: 0.6, side: THREE.DoubleSide })));
    } else {
      face = new THREE.MeshPhysicalMaterial({ color: look.color, metalness: look.metal, roughness: look.rough, map: mapTex(11 + i), emissive: look.glow, emissiveMap: em, emissiveIntensity: look.gi, clearcoat: 0.7, clearcoatRoughness: 0.15, iridescence: look.irid ? 0.9 : 0, iridescenceIOR: 1.6 });
      rim = new THREE.MeshPhysicalMaterial({ color: look.color, metalness: look.metal, roughness: Math.max(0.1, look.rough - 0.08), clearcoat: 0.6, iridescence: look.irid ? 0.9 : 0 });
    }
    const front = new THREE.Mesh(new THREE.CircleGeometry(0.985, 96), face); front.position.z = 0.075;
    const back = new THREE.Mesh(new THREE.CircleGeometry(0.985, 96), face); back.position.z = -0.075; back.rotation.y = Math.PI;
    const torus = new THREE.Mesh(new THREE.TorusGeometry(0.99, 0.082, 24, 128), rim);
    grp.add(front, back, torus);
    [front, back, torus].forEach((m) => { m.userData.idx = i; pickable.push(m); });
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: new THREE.Color(look.glow), transparent: true, opacity: 0.22 + i * 0.05, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.setScalar(3.2); glow.position.z = -0.6; grp.add(glow);
    faces.push({ face, gi: look.gi });
    coins.push({ grp, rotY: 0, home: new THREE.Vector3(), hover: 0, mine: 0, glow, base: 0.22 + i * 0.05 });
  });

  let highlight = options.highlight ?? null;
  function resize(w, h) {
    const wide = w / h > 1.7;
    coins.forEach((c, i) => {
      if (wide) c.home.set((i - 2) * 2.5, 0, 0);
      else { const row = i < 3 ? 0 : 1, cc = row ? i - 3 : i, n = row ? 2 : 3; c.home.set((cc - (n - 1) / 2) * 2.45, row ? -1.25 : 1.25, 0); }
    });
    const needW = wide ? 13 : 7.8, needH = wide ? 2.9 : 5.4, tt = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camera.position.set(0, 0, Math.max(needH / (2 * tt), needW / (2 * tt * camera.aspect)) + 0.4);
    camera.lookAt(0, 0, 0);
  }

  const ray = new THREE.Raycaster(), v2 = new THREE.Vector2();
  let hovered = -1;
  const pickAt = () => {
    if (!pointer.active) return -1;
    v2.set(pointer.x, pointer.y); ray.setFromCamera(v2, camera);
    const hit = ray.intersectObjects(pickable, false)[0];
    return hit ? hit.object.userData.idx : -1;
  };
  const setHover = (h) => { if (h !== hovered) { hovered = h; host.style.cursor = h >= 0 ? 'pointer' : ''; return true; } return false; };
  // animated: hover is picked every frame; reduced motion has no loop, so pick after the stage's
  // window listener has updated the pointer, then redraw
  const onMove = () => { if (ctx.reduced) setTimeout(() => { if (setHover(pickAt())) redraw(); }, 0); };
  const onClick = () => {
    const i = pickAt();
    if (i < 0) return;
    const c = coins[i]; c.rotY += Math.PI; flipped.add(i);
    sparks.emit(c.grp.position, 8, k(new THREE.Color(LOOKS[Math.min(i, 4)].glow), 2.2), 1.1, 0.3);
    ui.onFlip?.(i, flipped.size);
    if (ctx.reduced) c.grp.rotation.y = c.rotY;
    redraw();
  };
  host.addEventListener('pointermove', onMove);
  host.addEventListener('click', onClick);
  const onLeave = () => { hovered = -1; host.style.cursor = ''; };
  host.addEventListener('pointerleave', onLeave);

  function update(t, dt) {
    if (!ctx.reduced) setHover(pickAt());
    const kk = Math.min(1, dt * 6 || 1);
    coins.forEach((c, i) => {
      c.hover += ((hovered === i ? 1 : 0) - c.hover) * kk;
      c.mine += ((highlight === i ? 1 : 0) - c.mine) * kk;
      const dim = highlight != null && highlight !== i ? 0.55 : 1;
      c.grp.position.set(c.home.x, c.home.y + Math.sin(t * 1.1 + i) * 0.06, c.home.z + c.hover * 0.45 + c.mine * 0.6);
      c.grp.scale.setScalar(1 + c.hover * 0.07 + c.mine * 0.12);
      const target = c.rotY + Math.sin(t * 0.6 + i * 1.3) * 0.42 * (1 - c.hover) + c.hover * Math.sin(t * 2) * 0.12;
      c.grp.rotation.y += (target - c.grp.rotation.y) * Math.min(1, dt * 4 || 1);
      c.grp.rotation.x = Math.sin(t * 0.5 + i) * 0.06;
      c.glow.material.opacity = c.base * (1 + c.hover * 0.9 + c.mine * 1.6) * dim;
      faces[i].face.emissiveIntensity = faces[i].gi * (dim + c.mine * 0.5);
    });
    sparks.update(dt);
  }

  const api = {
    /** Index of the connected wallet's tier, or null. */
    highlight(i) {
      const next = i == null || i < 0 ? null : i;
      if (next !== null && next !== highlight) sparks.emit(coins[next].grp.position, 14, k(C.signal, 2.4), 1.3, 0.3);
      highlight = next; redraw();
    },
  };
  const dispose = () => {
    host.removeEventListener('pointermove', onMove);
    host.removeEventListener('click', onClick);
    host.removeEventListener('pointerleave', onLeave);
  };
  return { update, resize, dispose, api };
}
