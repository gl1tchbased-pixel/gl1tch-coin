// Hero scene: the Signal Core (plasma in a glass shell, chrome gyroscope rings, radar plate and a
// sweeping beam) with Chrome Glitchy standing next to it. Radar nodes carry the REAL tokens of the
// last Rug Radar sweep (setSweep); the remaining nodes are unlabelled, neutral and never flagged.
import * as THREE from 'three';
import { C, TAU, k, clamp, pick, rng, band, bandColor, textures, NOISE, Burst, Sparks, BAD, GOOD, bubble } from './fx';

const LINES = {
  ok: ['Clean. I read every line.', 'Looks legit. Still DYOR.', 'No traps here. Nice.'],
  warn: ['Hmm. Sus, but not a rug.', 'Careful with this one.'],
  bad: ['RUG ALERT. Hands off!', "Nope. That's rug-shaped.", 'I would not touch that.'],
  error: ["Couldn't read that one. Try the full scanner."],
  idle: ['Another one flagged.', 'Got one.', 'Red dot. Not touching that.', 'Scanning… always scanning.'],
};

/**
 * @param {{ stage: any, host: HTMLElement, reduced: boolean, mobile: boolean, pointer: {x:number,y:number,active:boolean},
 *   ui?: { bubble?: HTMLElement, onFlag?: (item: any) => void, onPing?: (band: string) => void, frame?: HTMLElement } }} ctx
 */
export function mount(ctx) {
  const { stage, host, reduced, mobile, pointer, ui = {} } = ctx;
  const { scene, camera } = stage;
  const { glow: GLOW, ring: RING } = textures();
  const g = stage.add('chrome', { x: -2.05, y: 0, z: 2.0, scale: 0.58, yaw: 0.55, seed: 303 });
  const say = bubble(stage, g, host, ui.bubble);
  const base = new THREE.Vector3(), look = new THREE.Vector3();

  const root = new THREE.Group(); root.scale.setScalar(0.82); scene.add(root);

  // plasma core inside a glass shell
  const plasmaU = { uT: { value: 0 }, uA: { value: C.signal.clone() }, uB: { value: C.glitch.clone() }, uBad: { value: C.bad.clone() }, uHot: { value: 0 }, uAlarm: { value: 0 } };
  const plasma = new THREE.Mesh(new THREE.IcosahedronGeometry(0.66, mobile ? 5 : 8), new THREE.ShaderMaterial({
    uniforms: plasmaU,
    vertexShader: 'varying vec3 vN; varying vec3 vP; varying vec3 vV; void main(){ vN = normalize(normalMatrix * normal); vP = position; vec4 mv = modelViewMatrix * vec4(position, 1.); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }',
    fragmentShader: `${NOISE} uniform float uT; uniform vec3 uA; uniform vec3 uB; uniform vec3 uBad; uniform float uHot; uniform float uAlarm; varying vec3 vN; varying vec3 vP; varying vec3 vV;
      void main(){ float n1 = snoise(vP * 1.7 + vec3(0., uT * .35, uT * .2)); float n2 = snoise(vP * 3.6 - vec3(uT * .5, 0., uT * .3));
        float sw = .5 + .5 * sin(n1 * 3.2 + n2 * 1.6 + uT * .8);
        vec3 col = uB * 1.6 * smoothstep(.55, .15, sw) + uA * 1.5 * smoothstep(.62, .92, sw);
        col += uA * pow(1. - abs(n2), 9.) * 2.6 * smoothstep(.45, .7, sw);
        col = mix(col, uBad * 2.4, smoothstep(0., .3, uAlarm));
        float fres = pow(1. - max(dot(normalize(vN), normalize(vV)), 0.), 2.);
        col *= .6 + fres * 1.4 + uHot * 1.4;
        gl_FragColor = vec4(col, 1.); }`,
  }));
  root.add(plasma);
  const glass = new THREE.Mesh(new THREE.IcosahedronGeometry(1, mobile ? 8 : 14), new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: 0.04, transmission: 1, thickness: 1.1, ior: 1.32, envMapIntensity: 1.25,
    clearcoat: 1, clearcoatRoughness: 0.03, iridescence: 0.6, iridescenceIOR: 1.45, attenuationColor: new THREE.Color(0xeeeaff), attenuationDistance: 3.2,
  }));
  root.add(glass);
  const chrome = new THREE.MeshPhysicalMaterial({ color: 0xe6e9ee, metalness: 1, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.5 });
  const gyro = [1.24, 1.38].map((r, i) => {
    const grp = new THREE.Group();
    grp.add(new THREE.Mesh(new THREE.TorusGeometry(r, 0.026, 16, 180), chrome));
    const neon = new THREE.Mesh(new THREE.TorusGeometry(r + 0.03, 0.006, 8, 220), new THREE.MeshBasicMaterial({ color: i ? k(C.glitch, 3.2) : k(C.signal, 2.4) }));
    grp.add(neon);
    grp.rotation.set(Math.PI / 2 + (i ? 0.62 : -0.25), i ? 0.4 : 0, 0);
    root.add(grp);
    return { grp, neon };
  });
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: C.glitch.clone(), transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.scale.setScalar(4.6); halo.position.z = -0.8; root.add(halo);

  // radar plate
  const plate = new THREE.Group(); root.add(plate);
  [1.7, 2.3, 2.9, 3.55].forEach((r, i) => {
    const m = new THREE.Mesh(new THREE.RingGeometry(r - 0.008, r + 0.008, 200), new THREE.MeshBasicMaterial({
      color: i === 3 ? k(C.signal, 1.6) : k(C.glitchInk, 0.55), transparent: true, opacity: i === 3 ? 0.55 : 0.25, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    m.rotation.x = -Math.PI / 2; plate.add(m);
  });
  const sp = [];
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * TAU, r0 = i % 3 ? 3.35 : 1.7;
    sp.push(new THREE.Vector3(Math.cos(a) * r0, 0, -Math.sin(a) * r0), new THREE.Vector3(Math.cos(a) * 3.55, 0, -Math.sin(a) * 3.55));
  }
  plate.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(sp), new THREE.LineBasicMaterial({ color: C.glitchInk, transparent: true, opacity: 0.12 })));
  const disc = new THREE.Mesh(new THREE.CircleGeometry(3.55, 96), new THREE.MeshBasicMaterial({ map: GLOW, color: k(C.glitch, 0.35), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  disc.rotation.x = -Math.PI / 2; disc.position.y = -0.01; plate.add(disc);

  // sweep: floor wedge + leading line + vertical blade (azimuth convention: atan2(-z, x))
  const L = 1.15, sweep = new THREE.Group(); root.add(sweep);
  const wedge = new THREE.Mesh(new THREE.RingGeometry(1.2, 3.55, 96, 1, 0, L), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uC: { value: k(C.signal, 1.5) }, uL: { value: L } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'uniform vec3 uC; uniform float uL; varying vec3 vP; void main(){ float a = atan(vP.y, vP.x); if(a < 0.) a += 6.2831853; float f = clamp(a / uL, 0., 1.); float r = length(vP.xy); float rad = smoothstep(1.2, 1.7, r) * (1. - smoothstep(3.25, 3.55, r)); gl_FragColor = vec4(uC, pow(f, 2.6) * .55 * rad); }',
  }));
  wedge.rotation.x = -Math.PI / 2; sweep.add(wedge);
  sweep.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(Math.cos(L) * 1.2, 0, -Math.sin(L) * 1.2), new THREE.Vector3(Math.cos(L) * 3.55, 0, -Math.sin(L) * 3.55)]),
    new THREE.LineBasicMaterial({ color: k(C.signal, 2.4) }),
  ));
  const bladeGeo = new THREE.PlaneGeometry(2.35, 2.5); bladeGeo.translate(1.2 + 2.35 / 2, 0.25, 0);
  const blade = new THREE.Mesh(bladeGeo, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uC: { value: k(C.signal, 1.4) }, uT: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'uniform vec3 uC; uniform float uT; varying vec2 vUv; void main(){ float v = 1. - smoothstep(0., .9, abs(vUv.y - .4) * 1.9); float u = smoothstep(0., .12, vUv.x) * (1. - smoothstep(.85, 1., vUv.x)); float lines = .55 + .45 * sin(vUv.y * 140. - uT * 6.); gl_FragColor = vec4(uC, v * u * lines * .16); }',
  }));
  blade.rotation.y = L; sweep.add(blade);

  // nodes
  const r = rng(7), N = mobile ? 56 : 84, nodes = [];
  const gems = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.06, 0), new THREE.MeshBasicMaterial({ color: 0xffffff }), N);
  const stems = [], m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), s4 = new THREE.Vector3(1, 1, 1), col = new THREE.Color(), up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < N; i++) {
    const rad = 1.8 + r() * 1.65, az = r() * TAU, y = (r() - 0.45) * 1.9;
    const p = new THREE.Vector3(Math.cos(az) * rad, y, -Math.sin(az) * rad);
    nodes.push({ p, az, item: null, band: null, flash: 0, marked: false, spin: r() * TAU });
    m4.compose(p, q4, s4); gems.setMatrixAt(i, m4); gems.setColorAt(i, k(C.glitchInk, 0.3));
    stems.push(p.clone(), new THREE.Vector3(p.x, 0, p.z));
  }
  root.add(gems);
  root.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(stems), new THREE.LineBasicMaterial({ color: C.glitchInk, transparent: true, opacity: 0.1 })));
  const pool = Array.from({ length: 24 }, () => {
    const o = new THREE.Sprite(new THREE.SpriteMaterial({ map: RING, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    o.visible = false; root.add(o); return { sp: o, age: 9 };
  });
  const shocks = Array.from({ length: 6 }, () => {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 64), new THREE.MeshBasicMaterial({ color: k(C.bad, 2.4), transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.rotation.x = -Math.PI / 2; m.visible = false; root.add(m); return { m, age: 9 };
  });
  const burst = new Burst(scene, mobile ? 110 : 200, 0.07), sparks = new Sparks(scene, 30);
  let pi = 0, si = 0;
  const ping = (n) => {
    const o = pool[pi++ % pool.length];
    o.sp.position.copy(n.p); o.sp.material.color.copy(n.band ? k(bandColor(n.band), 1.8) : k(C.glitchInk, 0.9)); o.age = 0; o.sp.visible = true;
  };
  const shock = (n) => { const o = shocks[si++ % shocks.length]; o.m.position.set(n.p.x, 0.01, n.p.z); o.age = 0; o.m.visible = true; };

  let phi = 0, prevLead = null, yaw = 0, tiltX = 0, tiltY = 0, boost = 0, alarm = 0, hot = 0, shake = 0, lastReact = 0, nextTalk = 8;
  const wpos = new THREE.Vector3();
  const lookAtNode = (n) => {
    root.localToWorld(wpos.copy(n.p));
    const gp = g.root.position;
    g.lookAt(clamp((wpos.x - gp.x) / 3, -1, 1), clamp((wpos.y - gp.y - 0.2) / 2, -1, 1), 1.4);
  };

  function resize(w, h) {
    const narrow = w / h < 1.05;
    if (narrow) { g.root.position.set(-1.7, 1.75, 1.3); g.root.scale.setScalar(0.5); base.set(-0.15, 2.4, 13.4); look.set(-0.15, 0.2, 0); }
    else { g.root.position.set(-2.05, 0, 2.0); g.root.scale.setScalar(0.58); base.set(-0.4, 1.85, 11.2); look.set(-0.4, -0.05, 0); }
    camera.position.copy(base); camera.lookAt(look);
  }

  function update(t, dt) {
    phi += dt * (0.95 + boost * 2.6); boost = Math.max(0, boost - dt * 0.6);
    sweep.rotation.y = phi; blade.material.uniforms.uT.value = t;
    const lead = L + phi;
    if (prevLead !== null && dt > 0) {
      const span = lead - prevLead;
      for (const n of nodes) {
        const d = (((n.az - prevLead) % TAU) + TAU) % TAU;
        if (d > span) continue;
        n.flash = 1; ping(n);
        // a sound only for nodes that are real radar tokens (the host rate-limits it)
        if (n.band) ui.onPing?.(n.band);
        if (n.band === 'bad') {
          n.marked = true;
          root.localToWorld(wpos.copy(n.p)); burst.emit(wpos, 12, BAD(), 1.5, 0.9); shock(n); lookAtNode(n);
          ui.onFlag?.(n.item);
          if (t > nextTalk && t - lastReact > 4) {
            say.say(pick(LINES.idle), 2.2); nextTalk = t + 9 + Math.random() * 6;
            if (Math.random() < 0.4) g.play(pick(['wink', 'glitch', 'hop']));
          }
        }
      }
    }
    prevLead = lead;
    alarm = Math.max(0, alarm - dt * 0.65); hot = Math.max(0, hot - dt * 0.8); shake = Math.max(0, shake - dt * 1.8);
    plasmaU.uT.value = t; plasmaU.uAlarm.value = alarm; plasmaU.uHot.value = hot;
    nodes.forEach((n, i) => {
      n.flash *= Math.exp(-dt * 1.4);
      if (n.marked) col.copy(C.bad).multiplyScalar(0.9 + n.flash * 2.6);
      else if (n.band) col.copy(C.glitchInk).multiplyScalar(0.35).lerp(k(bandColor(n.band), 3), n.flash);
      else col.copy(C.glitchInk).multiplyScalar(0.3 + n.flash * 0.5);
      if (alarm > 0) col.lerp(k(C.bad, 1.8), alarm * 0.7);
      gems.setColorAt(i, col);
      n.spin += dt * (1 + n.flash * 6); q4.setFromAxisAngle(up, n.spin); s4.setScalar((n.band ? 1.15 : 0.8) + n.flash * 0.9);
      m4.compose(n.p, q4, s4); gems.setMatrixAt(i, m4);
    });
    gems.instanceColor.needsUpdate = true; gems.instanceMatrix.needsUpdate = true;
    for (const o of pool) { if (!o.sp.visible) continue; o.age += dt; const q = o.age / 1.1; if (q >= 1) { o.sp.visible = false; continue; } o.sp.scale.setScalar(0.08 + q * 0.55); o.sp.material.opacity = (1 - q) * 0.9; }
    for (const o of shocks) { if (!o.m.visible) continue; o.age += dt; const q = o.age / 0.9; if (q >= 1) { o.m.visible = false; continue; } o.m.scale.setScalar(0.1 + q * 0.9); o.m.material.opacity = (1 - q) * 0.9; }
    burst.update(dt); sparks.update(dt);
    gyro[0].grp.rotation.z += dt * 0.45; gyro[1].grp.rotation.z -= dt * 0.32; gyro[1].grp.rotation.x += dt * 0.08;
    plasma.rotation.y += dt * 0.2;
    halo.material.opacity = 0.36 + Math.sin(t * 1.3) * 0.06 + hot * 0.3 + alarm * 0.2; halo.material.color.copy(alarm > 0.05 ? C.bad : C.glitch);
    yaw += dt * 0.05;
    const px = pointer.active ? pointer.x : Math.sin(t * 0.3) * 0.25, py = pointer.active ? pointer.y : 0;
    tiltX += (-py * 0.14 - tiltX) * Math.min(1, dt * 3); tiltY += (px * 0.35 - tiltY) * Math.min(1, dt * 3);
    root.rotation.set(tiltX, yaw + tiltY, 0);
    camera.position.copy(base);
    if (shake > 0 && !reduced) camera.position.add(new THREE.Vector3((Math.random() - 0.5) * 0.25 * shake, (Math.random() - 0.5) * 0.18 * shake, 0));
    camera.lookAt(look);
    say.update();
  }

  const api = {
    /** Real Rug Radar sweep: [{ symbol, name, mint, score, verdict, ... }]. Spread over the nodes. */
    setSweep(items) {
      nodes.forEach((n) => { n.item = null; n.band = null; n.marked = false; });
      if (!Array.isArray(items) || !items.length) return;
      const step = Math.max(1, Math.floor(nodes.length / items.length));
      items.forEach((it, i) => {
        const n = nodes[(i * step + 3) % nodes.length];
        n.item = it; n.band = band(Number(it.score) || 0);
      });
    },
    /** Reaction to a hero scan: band = 'ok' | 'warn' | 'bad' | 'error'. */
    react(kind) {
      const o = new THREE.Vector3(0, 0.1, 0);
      if (kind === 'ok') { hot = 1; burst.emit(o, 90, GOOD(), 3.4, 1.1); sparks.emit(new THREE.Vector3(0, 0.3, 0.6), 12, k(C.signal, 2.2), 1.3); g.play('laugh'); }
      else if (kind === 'warn') { hot = 0.5; burst.emit(o, 36, [k(C.warn, 2.4), k(C.stat, 1.4)], 2.4, 0.8); g.play('wink'); }
      else if (kind === 'bad') {
        alarm = 1; shake = 1; burst.emit(o, 110, BAD(), 3.8, 0.7); nodes.forEach((n) => { n.flash = Math.max(n.flash, 0.7); }); g.play('glitch');
        if (ui.frame && !reduced) { ui.frame.dataset.alarm = '1'; setTimeout(() => { if (ui.frame) delete ui.frame.dataset.alarm; }, 900); }
      } else { g.play('wink'); }
      say.say(pick(LINES[kind] || LINES.error)); boost = 1; lastReact = performance.now() / 1000;
    },
    /** Radar spins faster while a scan is in flight. */
    scanning() { boost = 1.2; g.lookAt(0.6, -0.2, 1.5); },
    greet() { g.play('wave'); say.say('Hi! Paste a token, I will read it.', 3.2); },
  };

  return { update, resize, chars: [g], api };
}
