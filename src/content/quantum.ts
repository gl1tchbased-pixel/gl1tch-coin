/**
 * Quantum Core components — the single source for how many there are. The homepage showcase
 * and /quantum-core both read the count from here so the copy can't drift apart again.
 */
export const QUANTUM_COMPONENTS = ["Vault", "Draw", "Seal", "Forge", "Randomness"] as const;

const WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

/** "Five" — capitalized; lowercase it in running text. */
export const QUANTUM_COUNT_WORD = WORDS[QUANTUM_COMPONENTS.length] ?? String(QUANTUM_COMPONENTS.length);
