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

## Change log
- 2026-07-05 — schema documented (Phase 0 baseline). No graph DB yet (below threshold).
