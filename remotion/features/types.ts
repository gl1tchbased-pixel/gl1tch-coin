export type CheckStatus = "ok" | "warn" | "bad" | "unknown";
export type Check = { label: string; status: CheckStatus; note?: string };

export type DemoSpec =
  | { kind: "scan"; token: { name: string; symbol: string; chain: string; address: string }; verdict: string; score: number; checks: Check[]; live?: string }
  | { kind: "radar"; rows: { name: string; symbol: string; verdict: string; score: number; reason: string }[]; live?: string }
  | { kind: "alert"; app: "watchtower" | "wallet"; title: string; lines: string[] }
  | { kind: "seal"; root: string; count: number; sig: string; slot: number; attester: string; live?: string }
  | { kind: "graph"; deployers: number; flagged: number; live?: string }
  | { kind: "badge"; token: string; verdict: string; score: number }
  | { kind: "game"; cards: { name: string; flags: string[]; answer: "SAFE" | "RUG" }[] }
  | { kind: "phone"; token: string; verdict: string; score: number };

export type FeatureProps = {
  /** Seed for every random choice, so a render is reproducible. */
  id: string;
  kicker: string;
  /** Two lines; the second is set in brand green. */
  hook: [string, string];
  pain: string;
  painStat?: { value: string; label: string };
  demo: DemoSpec;
  benefits: [string, string, string];
  /** Where to go, without the protocol: "gl1tchbased.xyz/radar" or "t.me/gl1tch_infected_bot". */
  cta: string;
  /** Transparent v3 still in mascot/, e.g. "glitchy-chrome-wave.png". */
  pose: string;
  /** v3 action clip in clips/, e.g. "chrome-wave.mp4". */
  clip: string;
  layout: "left" | "right";
  tint: "purple" | "green";
  hookStyle: "pop" | "type" | "glitch";
};

export const FEATURE_FRAMES = 660;
