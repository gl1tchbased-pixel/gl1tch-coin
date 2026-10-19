// Browser drand: fetch the latest round, verify it in a Web Worker. Without workers it verifies in
// idle time instead, so a pairing check never lands in the middle of a page load or an input.
import { fetchLatestRound, type DrandPulse } from "./drand-round";

let worker: Worker | null | undefined;
let seq = 0;
const pending = new Map<number, { p: DrandPulse; settle: (ok: boolean) => void }>();

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = new Worker(new URL("./drand-verify.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<{ id: number; ok: boolean }>) => {
      pending.get(e.data.id)?.settle(e.data.ok);
      pending.delete(e.data.id);
    };
    worker.onerror = () => {
      // the worker can't run here: stop using it and verify what's waiting in idle time instead
      worker = null;
      pending.forEach(({ p, settle }) => void verifyIdle(p).then(settle));
      pending.clear();
    };
  } catch {
    worker = null;
  }
  return worker;
}

function verifyIdle(p: DrandPulse): Promise<boolean> {
  return new Promise((res) => {
    // the BLS library loads only on this path; with a worker it never touches the page bundle
    const run = () => void import("./drand").then((m) => res(m.verifyDrandRound(p.round, p.signature, p.randomness)), () => res(false));
    if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(run, { timeout: 4000 });
    else setTimeout(run, 500);
  });
}

function verify(p: DrandPulse): Promise<boolean> {
  const w = getWorker();
  if (!w) return verifyIdle(p);
  const id = ++seq;
  return new Promise((res) => {
    pending.set(id, { p, settle: res });
    w.postMessage({ id, round: p.round, signature: p.signature, randomness: p.randomness });
  });
}

/** The latest quicknet round with `verified` set by a real BLS check (worker or idle time). */
export async function latestDrandVerified(): Promise<DrandPulse | null> {
  const p = await fetchLatestRound();
  if (!p) return null;
  return { ...p, verified: await verify(p) };
}
