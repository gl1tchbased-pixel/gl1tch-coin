// Five badges, kept in this browser only (localStorage; a session-only fallback when storage is
// blocked). Unlocking fires a window event the FunLayer turns into a toast and a sound.

export const ACHIEVEMENTS = {
  scan: { title: "First scan", text: "You scanned your first token." },
  hunter: { title: "Rug Hunter", text: "Caught 3 rugs in Rug or Not?" },
  perfect: { title: "Flawless", text: "8/8. Ghost Node detective." },
  collector: { title: "Collector", text: "Flipped all five rank coins." },
  secret: { title: "Secret code", text: "You broke the system. Glitchy is proud." },
} as const;

export type AchievementId = keyof typeof ACHIEVEMENTS;
export const ACHIEVEMENT_IDS = Object.keys(ACHIEVEMENTS) as AchievementId[];
export const ACH_EVENT = "gl1tch:ach";
export interface AchievementEvent { id: AchievementId; count: number; total: number }

const KEY = "gl1tch-ach";
let memory: AchievementId[] | null = null;

function read(): AchievementId[] {
  if (memory) return memory;
  let saved: unknown = [];
  try { saved = JSON.parse((typeof window !== "undefined" && window.localStorage.getItem(KEY)) || "[]"); } catch { saved = []; }
  memory = Array.isArray(saved) ? saved.filter((x): x is AchievementId => ACHIEVEMENT_IDS.includes(x)) : [];
  return memory;
}

export const unlockedAchievements = (): AchievementId[] => read().slice();

/** Unlocks a badge once; returns true only the first time. */
export function unlock(id: AchievementId): boolean {
  const got = read();
  if (got.includes(id) || !(id in ACHIEVEMENTS)) return false;
  memory = [...got, id];
  try { window.localStorage.setItem(KEY, JSON.stringify(memory)); } catch { /* session only */ }
  if (typeof window !== "undefined") {
    const detail: AchievementEvent = { id, count: memory.length, total: ACHIEVEMENT_IDS.length };
    window.dispatchEvent(new CustomEvent(ACH_EVENT, { detail }));
  }
  return true;
}

/** Test hook: forget the in-memory copy. */
export function _resetAchievements() { memory = null; }
