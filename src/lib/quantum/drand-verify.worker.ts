// Verifies drand rounds off the main thread: a BLS12-381 pairing check is several hundred ms of
// CPU on a phone, too long to run beside the page.
import { verifyDrandRound } from "./drand";

interface Job { id: number; round: number; signature: string; randomness: string }
const scope = self as unknown as { onmessage: ((e: MessageEvent<Job>) => void) | null; postMessage: (m: { id: number; ok: boolean }) => void };

scope.onmessage = (e) => {
  const { id, round, signature, randomness } = e.data;
  scope.postMessage({ id, ok: verifyDrandRound(round, signature, randomness) });
};
