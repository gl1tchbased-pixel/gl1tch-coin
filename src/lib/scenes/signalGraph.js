// Signal Graph 3D: the deployer-reputation graph from the bot. A faint shell of dots counts every
// deployer the graph has seen (one dot each; placement is layout only, no relationship implied).
// Inside it, each flagged deployer is a hub linked to the tokens it really shipped and we really
// scanned. Hover a hub to light its subgraph; drag to turn; click a token to open its report.
import * as THREE from 'three';
import { C, k, clamp, textures } from './fx';

const short = (a) => `${a.slice(0, 4)}…${a.slice(-4)}`;
const kindOf = (verdict, score) => {
  const v = String(verdict || '').toUpperCase();
  if (v === 'CLEAN' || v === 'LOW RISK') return 'ok';
  if (v === 'CAUTION') return 'warn';
  if (v) return 'bad';
  return score >= 80 ? 'ok' : score >= 50 ? 'warn' : 'bad';
};
const KIND_WORD = { ok: 'scanned clean', warn: 'scanned caution', bad: 'scanned high-risk' };

/**
 * @param {{ stage: any, host: HTMLElement, mobile: boolean, reduced: boolean, pointer: {x:number,y:number,active:boolean}, redraw: () => void,
 *   ui: any,
 *   options: any }} ctx
 */
export function mount(ctx) {
  const { stage, host, mobile, pointer, ui, options, redraw } = ctx;
  const { scene, camera } = stage;
  const { glow: GLOW } = textures();
  const root = new THREE.Group(); scene.add(root);
  const golden = Math.PI * (3 - Math.sqrt(5));

  // ---- the shell: one dot per mapped deployer ----
  const N = Math.min(options.deployers || 0, mobile ? 700 : 1400);
  if (N > 0) {
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / Math.max(1, N - 1)) * 2, r = Math.sqrt(1 - y * y), th = golden * i;
      const R = 3.5 + Math.sin(i * 12.9898) * 0.12;
      pos.set([Math.cos(th) * r * R, y * R, Math.sin(th) * r * R], i * 3);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    root.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 0.075, map: GLOW, color: k(C.glitchInk, 1.5), transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending })));
  }

  // ---- hubs (flagged deployers) and their tokens ----
  const nodes = [], edges = [];
  const hubs = options.hubs || [];
  hubs.forEach((h, j) => {
    const y = hubs.length > 1 ? 1 - (j / (hubs.length - 1)) * 2 : 0, rad = Math.sqrt(Math.max(0, 1 - y * y)), th = golden * j * 2.3;
    const p = new THREE.Vector3(Math.cos(th) * rad, y * 0.75, Math.sin(th) * rad).multiplyScalar(hubs.length > 1 ? 2.1 : 0);
    const hi = nodes.length;
    nodes.push({ p, kind: 'hub', hub: hi, h, tone: h.level === 'serial' ? 'bad' : h.level === 'watch' ? 'warn' : 'clean' });
    const toks = h.tokens.slice(0, 12);
    toks.forEach((t, m) => {
      const a = (m / Math.max(1, toks.length)) * Math.PI * 2 + j;
      const d = new THREE.Vector3(Math.cos(a), Math.sin(a * 1.7) * 0.6, Math.sin(a)).normalize().multiplyScalar(0.55 + (m % 3) * 0.14);
      nodes.push({ p: p.clone().add(d), kind: 'tok', hub: hi, t, tone: kindOf(t.verdict, t.score ?? 0) });
      edges.push([hi, nodes.length - 1]);
    });
  });

  const toneColor = (tone) => (tone === 'bad' ? C.bad : tone === 'warn' ? C.warn : tone === 'ok' ? C.signal : C.glitchInk);
  const baseScale = (n) => (n.kind === 'hub' ? 0.15 : 0.065);
  const inst = nodes.length ? new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), new THREE.MeshBasicMaterial({ color: 0xffffff }), nodes.length) : null;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  const nodeColor = (n, f = 1) => k(n.kind === 'hub' ? (n.tone === 'clean' ? C.glitchInk : toneColor(n.tone)) : toneColor(n.tone), n.kind === 'hub' ? 1.9 : 1.7).multiplyScalar(f);
  if (inst) {
    nodes.forEach((n, i) => { m4.compose(n.p, q, sc.setScalar(baseScale(n))); inst.setMatrixAt(i, m4); inst.setColorAt(i, nodeColor(n)); });
    root.add(inst);
    const lp = [], lc = [];
    edges.forEach(([a, b]) => {
      const A = nodes[a].p, B = nodes[b].p; lp.push(A.x, A.y, A.z, B.x, B.y, B.z);
      const c = k(toneColor(nodes[b].tone), 0.7); lc.push(c.r, c.g, c.b, c.r, c.g, c.b);
    });
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3)); lg.setAttribute('color', new THREE.Float32BufferAttribute(lc, 3));
    root.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false })));
  }
  const halos = nodes.filter((n) => n.kind === 'hub').map((n) => {
    const o = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: toneColor(n.tone).clone(), transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false }));
    o.position.copy(n.p); o.scale.setScalar(n.tone === 'bad' ? 1.1 : 0.75); root.add(o);
    return { o, n, pulse: n.h.level === 'serial' || n.h.flaggedCount > 1 };
  });
  const pulses = edges.length ? Array.from({ length: Math.min(edges.length * 2, mobile ? 16 : 30) }, () => {
    const o = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
    o.scale.setScalar(0.14); root.add(o);
    return { sp: o, e: Math.floor(Math.random() * edges.length), t: Math.random(), v: 0.25 + Math.random() * 0.5 };
  }) : [];

  function resize(w, h) { camera.position.set(0, 0, w / h < 1 ? 12.5 : 9.6); camera.lookAt(0, 0, 0); }

  // ---- interaction ----
  let rotY = 0, rotX = 0.25, drag = null, hov = -1, focus = -1;
  const onDown = (e) => { drag = { x: e.clientX, y: e.clientY, ry: rotY, rx: rotX, moved: false }; };
  const onUp = () => { setTimeout(() => { drag = null; }, 0); };
  const onDrag = (e) => {
    if (!drag || !(e.buttons & 1)) return;
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 4) drag.moved = true;
    rotY = drag.ry + (e.clientX - drag.x) * 0.008; rotX = clamp(drag.rx + (e.clientY - drag.y) * 0.006, -1, 1);
    if (ctx.reduced) { root.rotation.set(rotX, rotY, 0); redraw(); }
  };
  const ray = new THREE.Raycaster(), v2 = new THREE.Vector2();
  const pick = () => {
    if (!inst || !pointer.active) return -1;
    v2.set(pointer.x, pointer.y); ray.setFromCamera(v2, camera);
    const hit = ray.intersectObject(inst)[0];
    return hit ? hit.instanceId : -1;
  };
  const recolor = () => {
    if (!inst) return;
    nodes.forEach((n, i) => { const lit = focus < 0 || n.hub === focus; inst.setColorAt(i, nodeColor(n, lit ? (focus >= 0 ? 1.5 : 1) : 0.16)); });
    inst.instanceColor.needsUpdate = true;
  };
  const tipFor = (n) => {
    if (n.kind === 'hub') {
      const h = n.h;
      return { title: `Deployer ${short(h.address)}`, body: `${h.flaggedCount} of ${h.tokensSeen} scanned token${h.tokensSeen === 1 ? '' : 's'} flagged · ${h.level}`, note: h.note || 'A flagged token is a risk signal, not proof of intent.' };
    }
    const t = n.t, label = t.symbol ? `$${t.symbol}` : t.name || short(t.mint);
    return { title: label, body: `${KIND_WORD[n.tone]}${t.score != null ? ` · ${t.score}/100` : ''}`, note: 'Click to open the scan report.' };
  };
  const showTip = (i) => {
    const tip = ui.tip; if (!tip) return;
    if (i < 0) { tip.hidden = true; return; }
    const d = tipFor(nodes[i]);
    tip.replaceChildren();
    const b = document.createElement('b'); b.textContent = d.title;
    const s1 = document.createElement('span'); s1.textContent = d.body;
    const s2 = document.createElement('small'); s2.textContent = d.note;
    tip.append(b, s1, s2); tip.hidden = false;
    const r = host.getBoundingClientRect();
    const x = ((pointer.x + 1) / 2) * r.width, y = ((1 - pointer.y) / 2) * r.height;
    tip.style.left = `${Math.min(x + 14, r.width - 270)}px`; tip.style.top = `${Math.max(8, y - 10)}px`;
  };
  const setHover = (h) => {
    if (h === hov) return false;
    if (hov >= 0) { m4.compose(nodes[hov].p, q, sc.setScalar(baseScale(nodes[hov]))); inst.setMatrixAt(hov, m4); }
    if (h >= 0) { m4.compose(nodes[h].p, q, sc.setScalar(baseScale(nodes[h]) * 1.8)); inst.setMatrixAt(h, m4); }
    if (inst) inst.instanceMatrix.needsUpdate = true;
    hov = h;
    const f = h >= 0 ? nodes[h].hub : -1;
    if (f !== focus) { focus = f; recolor(); }
    host.style.cursor = h >= 0 && nodes[h].kind === 'tok' ? 'pointer' : drag ? 'grabbing' : 'grab';
    return true;
  };
  const onMove = () => { setTimeout(() => { if (drag?.moved) return; const h = pick(); if (setHover(h) && ctx.reduced) redraw(); showTip(h); }, 0); };
  const onClick = () => {
    if (drag?.moved) return;
    const i = pick();
    if (i >= 0 && nodes[i].kind === 'tok') ui.onOpen?.(`/scan/${nodes[nodes[i].hub].h.chain}-${nodes[i].t.mint}`);
  };
  const onLeave = () => { setHover(-1); showTip(-1); };
  host.addEventListener('pointerdown', onDown);
  window.addEventListener('pointerup', onUp);
  host.addEventListener('pointermove', onDrag);
  host.addEventListener('pointermove', onMove);
  host.addEventListener('click', onClick);
  host.addEventListener('pointerleave', onLeave);
  host.style.cursor = 'grab';

  function update(t, dt) {
    if (!drag) rotY += dt * 0.09;
    root.rotation.y += (rotY - root.rotation.y) * Math.min(1, dt * 5 || 1);
    root.rotation.x += (rotX - root.rotation.x) * Math.min(1, dt * 5 || 1);
    for (const p of pulses) {
      p.t += dt * p.v;
      if (p.t > 1) { p.t = 0; p.e = Math.floor(Math.random() * edges.length); }
      const [a, b] = edges[p.e];
      p.sp.position.lerpVectors(nodes[a].p, nodes[b].p, p.t);
      p.sp.material.color.copy(k(toneColor(nodes[b].tone), 1.8));
    }
    for (const h of halos) if (h.pulse) { h.o.material.opacity = 0.32 + Math.sin(t * 3) * 0.16; h.o.scale.setScalar(1.05 + Math.sin(t * 3) * 0.15); }
  }

  const dispose = () => {
    host.removeEventListener('pointerdown', onDown);
    window.removeEventListener('pointerup', onUp);
    host.removeEventListener('pointermove', onDrag);
    host.removeEventListener('pointermove', onMove);
    host.removeEventListener('click', onClick);
    host.removeEventListener('pointerleave', onLeave);
  };
  return { update, resize, dispose, api: {} };
}
