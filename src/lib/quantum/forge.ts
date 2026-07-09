/**
 * Quantum Forge — quantum-inspired optimization (pure, classical hardware).
 *
 * Honesty (spec §2, §8B.4): this does NOT run on a quantum computer. It solves
 * QUBO/Ising problems with simulated annealing — an algorithm inspired by
 * quantum/thermal tunnelling dynamics — on classical hardware. It only helps on
 * genuinely combinatorial, multi-constraint problems; a good classical solver
 * can beat it on well-structured ones. The QUBO format is chosen so the same
 * problem could later be sent to real quantum hardware (spec §8B.3).
 *
 * Deterministic: seeded PRNG (no Math.random), so results are reproducible and
 * testable and identical across the annealing anneal for a given seed.
 */

/** Minimal deterministic PRNG (mulberry32) — reproducible, dependency-free. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** QUBO energy x^T Q x for a binary vector x (Q assumed square, upper-triangular usable). */
export function quboEnergy(Q: number[][], x: number[]): number {
  let e = 0;
  for (let i = 0; i < x.length; i++) {
    if (!x[i]) continue;
    e += Q[i][i];
    for (let j = i + 1; j < x.length; j++) if (x[j]) e += Q[i][j] + Q[j][i];
  }
  return e;
}

export interface AnnealOptions {
  seed?: number;
  restarts?: number;
  sweeps?: number;
  tStart?: number;
  tEnd?: number;
}

export interface AnnealResult {
  assignment: number[];
  energy: number;
  restarts: number;
  sweeps: number;
}

/**
 * Minimize x^T Q x over x ∈ {0,1}^n with simulated annealing + random restarts.
 * Returns the best assignment found. Cost is bounded (restarts × sweeps × n).
 */
export function solveQUBO(Q: number[][], opts: AnnealOptions = {}): AnnealResult {
  const n = Q.length;
  if (n === 0) return { assignment: [], energy: 0, restarts: 0, sweeps: 0 };
  if (Q.some((row) => row.length !== n)) throw new Error("Q must be square");

  const seed = opts.seed ?? 0x9e3779b9;
  const restarts = Math.max(1, opts.restarts ?? 8);
  const sweeps = Math.max(1, opts.sweeps ?? 200);
  const tStart = opts.tStart ?? Math.max(1, maxAbs(Q));
  const tEnd = opts.tEnd ?? 1e-3;
  const rnd = mulberry32(seed);
  const cool = Math.pow(tEnd / tStart, 1 / Math.max(1, sweeps - 1));

  let best: number[] = new Array(n).fill(0);
  let bestE = quboEnergy(Q, best);

  for (let r = 0; r < restarts; r++) {
    const x = Array.from({ length: n }, () => (rnd() < 0.5 ? 0 : 1));
    let e = quboEnergy(Q, x);
    let T = tStart;
    for (let s = 0; s < sweeps; s++) {
      for (let k = 0; k < n; k++) {
        const i = (rnd() * n) | 0;
        const delta = flipDelta(Q, x, i);
        if (delta <= 0 || rnd() < Math.exp(-delta / T)) {
          x[i] ^= 1;
          e += delta;
        }
      }
      T *= cool;
    }
    if (e < bestE) {
      bestE = e;
      best = [...x];
    }
  }
  return { assignment: best, energy: bestE, restarts, sweeps };
}

/** Energy change from flipping bit i (cheap incremental evaluation). */
function flipDelta(Q: number[][], x: number[], i: number): number {
  const cur = x[i];
  const sign = cur ? -1 : 1; // flipping 1->0 removes contributions, 0->1 adds
  let delta = sign * Q[i][i];
  for (let j = 0; j < x.length; j++) {
    if (j === i || !x[j]) continue;
    delta += sign * (Q[i][j] + Q[j][i]);
  }
  return delta;
}

function maxAbs(Q: number[][]): number {
  let m = 0;
  for (const row of Q) for (const v of row) m = Math.max(m, Math.abs(v));
  return m;
}

/**
 * Holder tool (spec §8B.1): pick a subset of candidate items maximizing total
 * "score" subject to a hard count cap — a knapsack-style constraint the user
 * defines. NOT investment advice; a math tool over user-declared constraints.
 * Encoded as QUBO: minimize -Σ score·x + λ·(Σx − cap)^2.
 */
export interface SubsetProblem {
  scores: number[];
  maxCount: number;
  penalty?: number;
  seed?: number;
}

export function optimizeSubset(p: SubsetProblem): { chosen: number[]; total: number } {
  const n = p.scores.length;
  if (n === 0) return { chosen: [], total: 0 };
  const lambda = p.penalty ?? Math.max(1, ...p.scores.map(Math.abs)) * 2;
  const cap = p.maxCount;
  const Q: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  // -score·x_i  +  λ(Σx - cap)^2 = λ(Σx_i x_j) - 2λcap·Σx_i + const
  for (let i = 0; i < n; i++) {
    Q[i][i] += -p.scores[i] + lambda * (1 - 2 * cap);
    for (let j = i + 1; j < n; j++) Q[i][j] += 2 * lambda;
  }
  const res = solveQUBO(Q, { seed: p.seed, restarts: 12, sweeps: 300 });
  const chosen: number[] = [];
  res.assignment.forEach((b, i) => b && chosen.push(i));
  const total = chosen.reduce((s, i) => s + p.scores[i], 0);
  return { chosen, total };
}
