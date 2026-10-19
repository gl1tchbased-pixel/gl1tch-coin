// Rug or Not? host scene: Shadow Glitchy presents a spinning token coin. After an answer the coin
// stamps SAFE or RUG, lights green or red and bursts voxels; Glitchy laughs, hops or spins on a
// streak when you're right and glitches when you're wrong. The card UI works fully without it.
import * as THREE from 'three';
import { C, TAU, k, pick, textures, Burst, Sparks, BAD, GOOD, bubble } from './fx';

const RIGHT = ['Nice catch!', "You're a natural.", 'Signal Bearer energy.', 'Exactly. Read the flags.'];
const WRONG = ['Oof. Look again.', 'Glitched you!', 'Check the deployer next time.', 'The flags were right there.'];

/** @param {{ stage: any, host: HTMLElement, reduced: boolean, mobile: boolean, ui: any }} ctx */
export function mount(ctx) {
  const { stage, host, ui } = ctx;
  const { scene, camera } = stage;
  const { glow: GLOW, shadow: SHADOW } = textures();
  const g = stage.add('shadow', { x: -1.25, y: 0.05, scale: 0.8, yaw: 0.4, seed: 77 });
  const say = bubble(stage, g, host, ui.bubble);

  // Coin face is a canvas texture in the site's own display and mono fonts.
  const css = getComputedStyle(document.documentElement);
  const DISPLAY = css.getPropertyValue('--font-display').trim() || 'sans-serif';
  const MONO = css.getPropertyValue('--font-mono').trim() || 'monospace';
  const fc = document.createElement('canvas'); fc.width = fc.height = 512;
  const fx = fc.getContext('2d');
  const ftex = new THREE.CanvasTexture(fc); ftex.colorSpace = THREE.SRGBColorSpace;
  let ticker = '$RUGORNOT', stamp = null;
  const draw = () => {
    fx.fillStyle = '#000'; fx.fillRect(0, 0, 512, 512);
    fx.strokeStyle = '#fff'; fx.fillStyle = '#fff';
    fx.lineWidth = 6; fx.beginPath(); fx.arc(256, 256, 216, 0, TAU); fx.stroke();
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * TAU; fx.lineWidth = 2; fx.beginPath();
      fx.moveTo(256 + Math.cos(a) * 198, 256 + Math.sin(a) * 198); fx.lineTo(256 + Math.cos(a) * 208, 256 + Math.sin(a) * 208); fx.stroke();
    }
    fx.textAlign = 'center'; fx.textBaseline = 'middle';
    const tk = ticker.replace('$', '');
    fx.font = `800 ${tk.length > 8 ? 50 : 62}px ${DISPLAY}`; fx.fillText('$' + tk, 256, stamp ? 218 : 256);
    if (stamp) { fx.font = `700 58px ${MONO}`; fx.fillText(stamp, 256, 318); fx.lineWidth = 5; fx.strokeRect(126, 280, 260, 76); }
    else { fx.font = `500 24px ${MONO}`; fx.globalAlpha = 0.7; fx.fillText('RUG OR NOT?', 256, 330); fx.globalAlpha = 1; }
    ftex.needsUpdate = true;
  };
  draw();
  document.fonts?.ready.then(draw);

  const coin = new THREE.Group(); scene.add(coin);
  const faceMat = new THREE.MeshPhysicalMaterial({ color: 0x2c2548, metalness: 0.95, roughness: 0.22, clearcoat: 1, emissive: C.glitchInk.clone(), emissiveMap: ftex, emissiveIntensity: 2.2 });
  const rimMat = new THREE.MeshPhysicalMaterial({ color: 0xe6e9ee, metalness: 1, roughness: 0.12, clearcoat: 1 });
  const front = new THREE.Mesh(new THREE.CircleGeometry(0.985, 96), faceMat); front.position.z = 0.08;
  const back = new THREE.Mesh(new THREE.CircleGeometry(0.985, 96), faceMat); back.position.z = -0.08; back.rotation.y = Math.PI;
  coin.add(front, back, new THREE.Mesh(new THREE.TorusGeometry(0.99, 0.09, 24, 128), rimMat));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: C.glitch.clone(), transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.scale.setScalar(3.4); halo.position.z = -0.7; coin.add(halo);
  const shade = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), new THREE.MeshBasicMaterial({ map: SHADOW, color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false }));
  shade.rotation.x = -Math.PI / 2; scene.add(shade);
  const burst = new Burst(scene, 140, 0.07), sparks = new Sparks(scene, 30);
  const home = new THREE.Vector3(1.3, 0.15, 0);

  function resize(w, h) {
    if (w / h < 1.1) {
      g.root.position.set(-0.95, 0.45, 0); g.root.scale.setScalar(0.62); home.set(1.0, 0.45, 0); coin.scale.setScalar(0.72);
      camera.position.set(0, 0.35, 9.6); camera.lookAt(0, 0, 0);
    } else {
      g.root.position.set(-1.25, 0.05, 0); g.root.scale.setScalar(0.8); home.set(1.3, 0.15, 0); coin.scale.setScalar(0.95);
      camera.position.set(0, 0.1, 7.7); camera.lookAt(0, -0.2, 0);
    }
    shade.position.set(home.x, g.root.position.y - 2.02 * g.root.scale.x + 0.01, 0.2);
  }

  let spin = 0, spinV = 0, shake = 0;
  function update(t, dt) {
    spinV *= Math.exp(-dt * 2.2); spin += spinV * dt;
    const settle = Math.round(spin / TAU) * TAU;
    if (spinV < 0.8) spin += (settle + Math.sin(t * 0.8) * 0.35 - spin) * Math.min(1, dt * 3);
    coin.rotation.y = spin;
    coin.position.set(home.x + (shake > 0 ? (Math.random() - 0.5) * 0.12 * shake : 0), home.y + Math.sin(t * 1.3) * 0.08, home.z);
    shake = Math.max(0, shake - dt * 2);
    halo.material.opacity = 0.4 + Math.sin(t * 2) * 0.08;
    burst.update(dt); sparks.update(dt); say.update();
  }

  const tint = (c) => { faceMat.emissive.copy(c); halo.material.color.copy(c); };
  const api = {
    show(card) { ticker = card.ticker; stamp = null; draw(); tint(C.glitchInk); spinV = 22; g.lookAt(0.7, -0.1, 2); },
    reveal(isRug, ok, streak) {
      stamp = isRug ? 'RUG' : 'SAFE'; draw(); tint(isRug ? C.bad : C.signal); spinV = 14;
      const o = coin.position.clone();
      burst.emit(o, isRug ? 70 : 50, isRug ? BAD() : GOOD(), 2.8, 0.8);
      if (ok) {
        g.play(streak >= 3 ? 'spin' : pick(['laugh', 'hop', 'wave']));
        sparks.emit(o, 10, k(C.signal, 2.2), 1.2);
        say.say(streak >= 3 ? `${streak} in a row!` : pick(RIGHT));
      } else { g.play('glitch'); shake = 1; say.say(pick(WRONG)); }
    },
    finish(score) {
      g.play(score >= 6 ? 'laugh' : 'wave');
      sparks.emit(coin.position, 16, k(C.signal, 2.2), 1.6);
      say.say(score === 8 ? 'Perfect! Ghost Node detective.' : score >= 5 ? 'Solid run. Again?' : 'Rugs are sneaky. Try again!', 3.4);
    },
  };
  setTimeout(() => say.say('Rug or not? Your call.', 3), 600);

  return { update, resize, chars: [g], api };
}
