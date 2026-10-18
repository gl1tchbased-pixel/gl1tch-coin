import Link from "next/link";
import { GlitchyStage } from "@/components/glitchy/GlitchyStage";
import { GlitchText } from "@/components/effects/GlitchText";
import { TerminalLog, type LogLine } from "@/components/effects/TerminalLog";
import styles from "./not-found.module.css";

const LINES: LogLine[] = [
  { text: "resolving node…", kind: "muted" },
  { text: "ERROR 0x194 — node not found in this segment of the network", kind: "err" },
  { text: "the transmission you followed has decayed, or never existed.", kind: "muted" },
  { text: "rerouting to known signal sources ↓", kind: "ok" },
];

const routes = [
  { href: "/", label: "home // the signal" },
  { href: "/lore", label: "lore // the archive" },
  { href: "/whitepaper", label: "whitepaper // the doctrine" },
  { href: "/links", label: "links // verified channels" },
];

export default function NotFound() {
  return (
    <section className={styles.wrap}>
      <div className={styles.stage}>
        <div className={styles.mascotFrame}>
          <span className={styles.aura} aria-hidden="true" />
          <GlitchyStage
            className={styles.mascot3d}
            characters={[{ edition: "shadow" }]}
            camera={{ position: [0, 0.1, 7.6], target: [0, -0.3, 0] }}
            background="#120c1f"
            poster="/brand/glitchy-v3/glitchy-shadow-hero.png"
            posterAlt="Glitchy, Shadow edition — corrupted signal carrier"
            eager
          />
          <div className={styles.code}>SIGNAL_LOST · NODE_404</div>
        </div>

        <div className={styles.terminal}>
          <div className={styles.bar}>
            <span className={styles.dots}>
              <i /> <i /> <i />
            </span>
            <span className={styles.barTitle}>gl1tch://lost-node — SIGNAL TRACE</span>
          </div>

          <div className={styles.body}>
            <div className={styles.heading}>
              <span className={styles.errorBadge}>404</span>
              <GlitchText as="h1" text="SIGNAL LOST" trigger="load" className={styles.title} />
            </div>

            <TerminalLog lines={LINES}>
              <ul className={styles.routes}>
                {routes.map((r) => (
                  <li key={r.href}>
                    <Link href={r.href} className={styles.route}>
                      <span className={styles.arrow}>→</span> {r.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </TerminalLog>
          </div>
        </div>
      </div>
    </section>
  );
}
