// Supply ring: the live holder split as a ring of light — the liquidity pool's share in violet
// glass, everyone else in green. Arcs are the real percentages from the self-scan; hover a segment
// to lift it and read it.
import * as THREE from 'three';
import { C, TAU, k, textures } from './fx';

/** @param {{ stage: any, host: HTMLElement, reduced: boolean, pointer: {x:number,y:number,active:boolean}, redraw: () => void, ui: any, options: any }} ctx */
export function mount(ctx) {
  const { stage, host, pointer, ui, options, redraw } = ctx;
  const { scene, camera } = stage;
  const { glow: GLOW } = textures();
  const ringGrp = new THREE.Group(); scene.add(ringGrp);
  const GAP = 0.035, R = 1.55, TUBE = 0.2;
  const segs = [];
  let start = Math.PI / 2;
  const total = options.segments.reduce((s, x) => s + x.pct, 0) || 100;
  options.segments.forEach((sg, i) => {
    // a hairline of supply still needs to be seen and hovered
    const arc = Math.max(0.09, (sg.pct / total) * TAU - GAP);
    const mat = sg.tone === 'pool'
      ? new THREE.MeshPhysicalMaterial({ color: 0x6b4bd6, metalness: 0.2, roughness: 0.12, transmission: 0.55, thickness: 0.6, ior: 1.4, clearcoat: 1, emissive: C.glitch.clone(), emissiveIntensity: 0.55, iridescence: 0.6 })
      : new THREE.MeshPhysicalMaterial({ color: 0x2f7d1f, metalness: 0.6, roughness: 0.2, clearcoat: 1, emissive: k(C.signal, 1), emissiveIntensity: 1.6 });
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(R, TUBE, 32, Math.max(12, Math.round(arc * 40)), arc), mat);
    mesh.rotation.z = start - arc; // torus arcs run counter-clockwise from +x
    mesh.userData.idx = i;
    const pivot = new THREE.Group(); pivot.add(mesh); ringGrp.add(pivot);
    const mid = start - arc / 2;
    segs.push({ mesh, pivot, mid, lift: 0, base: mat.emissiveIntensity });
    start -= arc + GAP;
  });
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: C.glitch.clone(), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.scale.setScalar(5.2); halo.position.z = -0.8; ringGrp.add(halo);
  ringGrp.rotation.x = -0.5;

  function resize(w, h) { camera.position.set(0, 0, w / h < 1 ? 7.6 : 6.4); camera.lookAt(0, 0, 0); }

  const ray = new THREE.Raycaster(), v2 = new THREE.Vector2();
  let hovered = -1;
  const pick = () => {
    if (!pointer.active) return -1;
    v2.set(pointer.x, pointer.y); ray.setFromCamera(v2, camera);
    const hit = ray.intersectObjects(segs.map((s) => s.mesh), false)[0];
    return hit ? hit.object.userData.idx : -1;
  };
  const setHover = (h) => { if (h === hovered) return false; hovered = h; ui.onHover?.(h); return true; };
  const onMove = () => { if (ctx.reduced) setTimeout(() => { if (setHover(pick())) redraw(); }, 0); };
  const onLeave = () => setHover(-1);
  host.addEventListener('pointermove', onMove);
  host.addEventListener('pointerleave', onLeave);

  function update(t, dt) {
    if (!ctx.reduced) setHover(pick());
    ringGrp.rotation.z = Math.sin(t * 0.25) * 0.12;
    ringGrp.rotation.x = -0.5 + Math.sin(t * 0.4) * 0.05 + (pointer.active ? -pointer.y * 0.12 : 0);
    ringGrp.rotation.y = pointer.active ? pointer.x * 0.2 : 0;
    segs.forEach((s, i) => {
      s.lift += ((hovered === i ? 1 : 0) - s.lift) * Math.min(1, dt * 6 || 1);
      s.pivot.position.set(Math.cos(s.mid) * s.lift * 0.18, Math.sin(s.mid) * s.lift * 0.18, s.lift * 0.15);
      s.mesh.material.emissiveIntensity = s.base * (1 + s.lift * 0.8);
    });
    halo.material.opacity = 0.32 + Math.sin(t * 1.4) * 0.05;
  }
  const dispose = () => { host.removeEventListener('pointermove', onMove); host.removeEventListener('pointerleave', onLeave); };
  return { update, resize, dispose, api: {} };
}
