// Risk Orb: a scan score as an object. Clean reads as smooth glass with green sparkles circling it;
// as risk rises the surface grows spikes, turns amber then red, glitches in slices and sheds voxels.
import * as THREE from 'three';
import { C, k, rng, textures, NOISE, Burst, Sparks, BAD } from './fx';

/** @param {{ stage: any, host: HTMLElement, reduced: boolean, mobile: boolean, pointer: {x:number,y:number,active:boolean}, options: { score?: number } }} ctx */
export function mount(ctx) {
  const { stage, mobile, pointer, options = {} } = ctx;
  const { scene, camera } = stage;
  const { glow: GLOW } = textures();
  const riskOf = (score) => Math.min(1, Math.max(0, 1 - (Number(score) || 0) / 100));

  const uni = { uTime: { value: 0 }, uRisk: { value: riskOf(options.score ?? 90) }, uSafe: { value: C.signal.clone() }, uWarn: { value: C.warn }, uBad: { value: C.bad } };
  const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, mobile ? 36 : 52), new THREE.ShaderMaterial({
    uniforms: uni,
    vertexShader: `uniform float uTime; uniform float uRisk; varying vec3 vView; varying vec3 vNrm; varying float vDisp; ${NOISE}
      float disp(vec3 nrm){ float f = mix(1.0, 3.2, uRisk); float n = snoise(nrm * f + vec3(0., uTime * mix(.1, .85, uRisk), uTime * .05));
        float sp = pow(max(0., snoise(nrm * mix(2., 6.5, uRisk) - uTime * .45)), 3.) * uRisk * uRisk * 1.5; return n * mix(.01, .25, pow(uRisk, 1.2)) + sp; }
      void main(){ vec3 nrm = normalize(position);
        vec3 t1 = normalize(cross(nrm, abs(nrm.y) < .99 ? vec3(0., 1., 0.) : vec3(1., 0., 0.))); vec3 t2 = cross(nrm, t1);
        vec3 n1 = normalize(nrm + t1 * .012), n2 = normalize(nrm + t2 * .012);
        float d = disp(nrm); vec3 P0 = nrm * (1.15 + d), P1 = n1 * (1.15 + disp(n1)), P2 = n2 * (1.15 + disp(n2));
        vec3 N = normalize(cross(P1 - P0, P2 - P0)); if (dot(N, nrm) < 0.) N = -N;
        vec3 p = P0; float slice = step(.93, fract(sin(floor((p.y + uTime * .6) * 13.) * 43.17) * 917.3)) * step(.55, uRisk);
        p.x += slice * .14 * uRisk * sin(uTime * 37.);
        vDisp = d; vNrm = normalize(normalMatrix * N); vec4 mv = modelViewMatrix * vec4(p, 1.); vView = mv.xyz; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uRisk; uniform vec3 uSafe; uniform vec3 uWarn; uniform vec3 uBad; varying vec3 vView; varying vec3 vNrm; varying float vDisp;
      void main(){ vec3 N = normalize(vNrm); vec3 V = normalize(-vView); float fres = pow(1. - max(dot(N, V), 0.), 3.);
        vec3 Ld = normalize(vec3(.5, .8, .7)); float diff = max(dot(N, Ld), 0.);
        vec3 tint = uRisk < .5 ? mix(uSafe, uWarn, uRisk * 2.) : mix(uWarn, uBad, (uRisk - .5) * 2.);
        vec3 R = reflect(-V, N);
        vec3 col = vec3(.012, .012, .02) + tint * (.03 + .07 * diff);
        col += tint * fres * 2.1;
        col += vec3(1.) * smoothstep(.72, .97, R.y) * .95;
        col += vec3(.48, .24, 1.) * smoothstep(.62, .95, R.x) * 1.2 * pow(1. - uRisk, 2.);
        col += tint * smoothstep(.62, .95, -R.x) * .9;
        col += tint * max(vDisp, 0.) * 2.4;
        col += vec3(pow(max(dot(reflect(-Ld, N), V), 0.), 64.)) * .8;
        gl_FragColor = vec4(col, 1.); }`,
  }));
  scene.add(orb);

  const PN = mobile ? 360 : 640, pos = new Float32Array(PN * 3), rr = rng(3);
  for (let i = 0; i < PN; i++) {
    const v = new THREE.Vector3(rr() - 0.5, rr() - 0.5, rr() - 0.5).normalize().multiplyScalar(1.5 + rr() * 0.8);
    pos.set([v.x, v.y, v.z], i * 3);
  }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.055, map: GLOW, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: k(C.signal, 1.6) }));
  scene.add(pts);
  const burst = new Burst(scene, mobile ? 80 : 140, 0.07), sparks = new Sparks(scene, 24);

  let target = uni.uRisk.value, emitAcc = 0, sparkAcc = 0;
  const tint = new THREE.Color(), dir = new THREE.Vector3(), origin = new THREE.Vector3();

  function resize(w, h) {
    camera.position.set(0, 0, w / h < 1 ? 7.4 : 6.3);
    camera.lookAt(0, 0, 0);
  }

  function update(t, dt) {
    uni.uTime.value = t;
    uni.uRisk.value += (target - uni.uRisk.value) * Math.min(1, dt * 3 || 1);
    const rk = uni.uRisk.value;
    tint.copy(rk < 0.5 ? C.signal.clone().lerp(C.warn, rk * 2) : C.warn.clone().lerp(C.bad, (rk - 0.5) * 2));
    pts.material.color.copy(tint).multiplyScalar(1.6);
    pts.rotation.y += dt * (0.08 + rk * 0.9); pts.rotation.x = Math.sin(t * 0.3) * 0.2;
    pts.scale.setScalar(1 + (rk > 0.5 ? Math.sin(t * 31) * 0.015 * rk : 0));
    emitAcc += dt * rk * rk * 40;
    while (emitAcc > 1) {
      emitAcc -= 1;
      dir.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(1.2);
      burst.emit(dir, 1, BAD(), 1.4 + rk, 0.1, 0.6);
    }
    sparkAcc += dt * (1 - rk) * (1 - rk) * 3;
    if (sparkAcc > 1) { sparkAcc = 0; sparks.emit(origin, 1, k(C.signal, 2), 1.45, 0.22); }
    burst.update(dt); sparks.update(dt);
    orb.rotation.y += dt * 0.15;
    const px = pointer.active ? pointer.x : 0, py = pointer.active ? pointer.y : 0;
    orb.rotation.x += (-py * 0.4 - orb.rotation.x) * Math.min(1, dt * 2 || 1);
    camera.position.x += (px * 0.5 - camera.position.x) * Math.min(1, dt * 2 || 1);
    camera.lookAt(0, 0, 0);
  }

  const api = {
    /** 0–100 safety score; the orb eases into the new shape. */
    setScore(score) {
      const next = riskOf(score);
      if (next > 0.5 && target <= 0.5) burst.emit(origin, 60, BAD(), 3.2, 0.3, 1.2);
      if (next < 0.2 && target >= 0.2) sparks.emit(origin, 12, k(C.signal, 2.2), 1.5);
      target = next;
    },
  };

  return { update, resize, api };
}
