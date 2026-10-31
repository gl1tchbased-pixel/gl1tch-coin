import Link from "next/link";
import { getYieldSnapshot } from "@/lib/yield/client";
import { networkMetrics } from "@/lib/network";
import { QUANTUM_COUNT_WORD } from "@/content/quantum";
import shared from "./shared.module.css";
import styles from "./ProductsBento.module.css";

const n = (v: number) => v.toLocaleString("en-US");

/**
 * The five products on one grid, each with a live number from the engine (bot /signal/metrics).
 * A number that isn't available is simply not shown — never a placeholder or a guess.
 */
export async function ProductsBento() {
  const [m, ys] = await Promise.all([networkMetrics(), getYieldSnapshot()]);
  const yields = ys?.opportunities.length ?? 0;
  const live = (v: number | undefined, label: string) => (m && v && v > 0 ? `${n(v)} ${label}` : null);

  const cards = [
    {
      id: "scanner",
      href: "/scan",
      name: "Scanner",
      title: "Safe, sus, or rug-shaped. In seconds.",
      body: "Paste any token on Solana, Ethereum, Base, BNB and more. Every flag comes with a plain-language reason.",
      stats: [live(m?.scans.total, "scans, mostly automated"), live(m?.signalGraph.deployers, "deployers mapped")],
      tone: "signal",
    },
    {
      id: "radar",
      href: "/radar",
      name: "Rug Radar",
      title: "The riskiest fresh launches, hourly.",
      body: "It sweeps newly promoted tokens and ranks them riskiest first.",
      stats: [live(m?.scans.flagged, "high-risk flags")],
      tone: "bad",
    },
    {
      id: "agents",
      href: "/agents",
      name: "Agent Trust",
      title: "Know Your Agent.",
      body: "AI agents hold wallets now. Check an agent's identity, provenance and track record in one call.",
      stats: [live(m?.agents.registered, "agents assessed")],
      tone: "neutral",
    },
    {
      id: "yield",
      href: "/yield",
      name: "Yield X-Ray",
      title: "Where does the APY come from?",
      body: "Staking, lending and DEX yields on 7 chains, read from the chain, with who pays them, how you get out and a risk score.",
      stats: [yields ? `${yields} yields measured on-chain` : null],
      tone: "signal",
    },
    {
      id: "quantum",
      href: "/quantum-core",
      name: "Quantum Core",
      title: "Verifiable randomness, honestly labelled.",
      body: "Provably fair draws, post-quantum encryption and a randomness API you can verify in your browser.",
      stats: [`${QUANTUM_COUNT_WORD} live components`],
      tone: "glitch",
    },
  ];

  return (
    <section className={shared.section} id="products" aria-labelledby="products-title">
      <div className="container">
        <div className={shared.head}>
          <span className={shared.eyebrow}>The products</span>
          <h2 id="products-title" className={shared.title}>
            One engine. <span className="hl">Five ways in.</span>
          </h2>
        </div>
        <div className={styles.grid}>
          {cards.map((c) => (
            <Link key={c.id} href={c.href} className={`${styles.card} ${styles[c.id]}`} data-tone={c.tone}>
              <span className={styles.name}>{c.name}</span>
              <h3 className={styles.title}>{c.title}</h3>
              <p className={styles.body}>{c.body}</p>
              <span className={styles.stats}>
                {c.stats.filter(Boolean).map((s) => (
                  <span key={s} className={styles.stat}><i aria-hidden="true" />{s}</span>
                ))}
              </span>
              <span className={styles.go} aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
