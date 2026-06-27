import Image from "next/image";
import Link from "next/link";
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
          <div className={styles.mascot}>
            <Image
              src="/brand/glitchy-1024-t.png"
              alt="Glitchy — corrupted signal carrier"
              width={1024}
              height={1024}
              sizes="(min-width: 880px) 420px, 80vw"
              priority
            />
          </div>
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
