# Signal Graph — Schema (living doc)

> Phase 0+ requirement (PREMIUM-PLAN-v3). The single source of truth for the Signal Graph
> data backbone. **Every phase that adds a node/edge type MUST update this file in the same PR.**
> Start with plain SQL/tables; migrate to a graph store (Neo4j / Postgres+AGE) only when
> measured (>500K nodes or query latency >500ms) — not before.

## Node types
| Node | Key fields | Introduced |
|---|---|---|
| `deployer` | `deployer_id` (wallet addr), first_seen | Phase 0 |
| `wallet` | `wallet_id` (addr), first_seen, age_days | Phase 1 |
| `funding_source` | `source_id` (addr) | Phase 1 |
| `token` | `mint`, chain, launch_date, outcome (`clean`/`rug`/`unknown`) | Phase 0 |
| `scan_result` | `scan_id`, mint, verdict, score, trust_level, scanned_at | Phase 0 |

## Edge types
| Edge | From → To | Introduced |
|---|---|---|
| `deployed_by` | token → deployer | Phase 0 |
| `funded_by` | wallet/deployer → funding_source | Phase 1 |
| `co_funded_with` | wallet ↔ wallet (shared source) | Phase 1 |
| `scanned_as` | token → scan_result | Phase 0 |
| `clustered_with` | wallet ↔ wallet (sniper/insider cluster) | Phase 1 |

## v0 seed (Phase 0)
`deployer_id → [token_id, launch_date, outcome]` — the minimal table the current scanner's
deployer field already produces. Everything else is built on top, additively.

## v0 as-built (Phase 0, shipped 2026-07-05)
The graph is **bot-hosted** (durable Railway volume, auto-detected mount) and exposed over
the bot's HTTP bridge — the same pattern as the scan counter. A dedicated graph DB is
deliberately deferred until the plan's measured thresholds (>500K nodes / >500ms queries).

- **Store:** `bot/src/signal-graph/store.ts` — `Map<chain:deployer, DeployerRecord>` persisted
  to `gl1tch-signal-graph.json`. Record = `{deployer, chain, firstSeen, lastSeen, tokens[]}`;
  each token sighting = `{mint, verdict, score, name, symbol, ts}` (deduped by mint, newest
  first, capped at 60/deployer).
- **Pure logic + tests:** `bot/src/signal-graph/graph.ts` (+ `.test.ts`). `applyObservation`
  (upsert `scanned_as`/`deployed_by`) and `reputation` (→ `unknown`/`clean`/`watch`/`serial`,
  self-mint excluded so a token never rates itself).
- **HTTP:** public `GET /signal/deployer?address&chain&exclude`; token-guarded
  `POST /signal/observe` (shares the stats token) — `bot/src/verify/server.ts`.
- **Ingest + read:** every scan flows through the site `/api/scan`, which reads the deployer's
  reputation (tight timeout, degrades to null) and fire-and-forget records the sighting
  (confidence ≥60, non-blocking) — `src/lib/signal-graph.ts`, `src/app/api/scan/route.ts`.
- **Surfaced:** `ScanResult.meta.deployerReputation` → a "Deployer track record" callout in
  `ScanTool.tsx` (serial/watch/clean). **Informational in v0** — score integration (dinging a
  `serial` deployer's score) is the next step, logged in `scoring-changelog.md` when it lands,
  once the graph has accumulated real signal.

## Change log
- 2026-07-05 — v0 shipped: bot-hosted deployer track record, fed + read by both scan surfaces,
  surfaced in the scan UI (informational). Schema unchanged; no graph DB yet (below threshold).
- 2026-07-05 — schema documented (Phase 0 baseline). No graph DB yet (below threshold).
