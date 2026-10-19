// When a 3D scene may boot. Building a scene (three.js, the engine's studio light, shader compiles)
// is one long main-thread task, so it must never land in the page's load window:
//  - nothing boots before the window `load` event (or 5 s, if a slow third-party embed holds it back);
//  - scenes boot one at a time, each in idle time;
//  - on phones and low-power devices nothing boots until the visitor first touches, scrolls or
//    types. Until then the scene's poster stands in, which is a complete page on its own.

let chain: Promise<void> = Promise.resolve();
let interacted = false;
let interaction: Promise<void> | null = null;

function constrained(): boolean {
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  return (
    window.matchMedia("(max-width: 820px), (pointer: coarse)").matches ||
    (nav.hardwareConcurrency || 8) <= 4 ||
    (nav.deviceMemory ?? 8) <= 4 ||
    !!nav.connection?.saveData
  );
}

const loaded = () =>
  new Promise<void>((res) => {
    if (document.readyState === "complete") return res();
    window.addEventListener("load", () => res(), { once: true });
    setTimeout(res, 5000);
  });

function firstInteraction(): Promise<void> {
  if (interacted) return Promise.resolve();
  interaction ??= new Promise<void>((res) => {
    const events = ["pointerdown", "touchstart", "keydown", "wheel", "scroll"] as const;
    const go = () => {
      interacted = true;
      events.forEach((e) => window.removeEventListener(e, go));
      // let the interaction's own frame paint before any heavy work
      setTimeout(res, 250);
    };
    events.forEach((e) => window.addEventListener(e, go, { passive: true }));
  });
  return interaction;
}

const idle = (timeout: number) =>
  new Promise<void>((res) => {
    if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(() => res(), { timeout });
    else setTimeout(res, 200);
  });

/** Resolves with a release function once this scene may boot; call it when the boot is done. */
export function acquireBootSlot(): Promise<() => void> {
  const gate = (async () => {
    await loaded();
    if (constrained()) await firstInteraction();
  })();
  let release!: () => void;
  const done = new Promise<void>((r) => { release = r; });
  const turn = chain.then(() => gate).then(() => idle(2000)).then(() => release);
  // the next scene waits for this one to finish booting (or 8 s, if it never reports back)
  chain = turn.then(() => Promise.race([done, new Promise<void>((r) => setTimeout(r, 8000))]));
  return turn;
}
