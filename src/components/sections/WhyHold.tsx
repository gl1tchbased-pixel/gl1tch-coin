import Link from "next/link";
import { Reveal } from "@/components/effects/Reveal";
import { ShieldCheckIcon, LockIcon, BoltIcon } from "@/components/icons/Glyphs";
import { RANK_TIERS, formatAmount } from "@/lib/ranks";
import shared from "./shared.module.css";
import styles from "./WhyHold.module.css";

const pillars = [
  {
    id: "wh-access",
    Icon: LockIcon,
    title: "Token-Gated Access",
    body: "Holding $GL1TCH unlocks private Telegram rooms and a live rank that grows with your bag. One focused utility — built and shipped, not promised.",
  },
  {
    id: "wh-proof",
    Icon: ShieldCheckIcon,
    title: "Provable & Self-Custody",
    body: "Verify by signing a free off-chain message. The bot reads your balance and nothing else — it never holds, moves, or has access to your funds.",
  },
  {
    id: "wh-status",
    Icon: BoltIcon,
    title: "Earned Status",
    body: "Five tiers from Observer to Ghost Node. The deeper you commit, the deeper into the network you go — recognition that can't be bought, only held.",
  },
];

export function WhyHold() {
  return (
    <section className={shared.section} id="why-hold" aria-label="Why hold GL1TCH">
      <div className="container">
        <Reveal className={shared.head}>
          <span className={shared.eyebrow}>Utility</span>
          <h2 className={shared.title}>Why Hold $GL1TCH?</h2>
          <p className={shared.body}>
            No staking gimmicks, no fake yield, no sprawling roadmap of vaporware.
            One flagship utility, live today: hold to unlock access, rank, and
            standing inside The Infected.
          </p>
        </Reveal>

        <Reveal className={styles.pillars}>
          {pillars.map((p) => (
            <div key={p.id} id={p.id} className={styles.pillar}>
              <span className={styles.icon}>
                <p.Icon size={26} />
              </span>
              <h3 className={styles.pillarTitle}>{p.title}</h3>
              <p className={styles.pillarBody}>{p.body}</p>
            </div>
          ))}
        </Reveal>

        <Reveal className={styles.ladder}>
          <div className={styles.ladderHead}>
            <span>Rank</span>
            <span>Hold</span>
            <span>Unlocks</span>
          </div>
          {RANK_TIERS.map((t) => (
            <div key={t.id} className={styles.ladderRow} data-tier={t.tier}>
              <span className={styles.rank}>{t.rank}</span>
              <span className={styles.amount}>
                {t.min === 0 ? "Free" : `${formatAmount(t.min)}+`}
              </span>
              <span className={styles.unlocks}>{t.unlocks}</span>
            </div>
          ))}
        </Reveal>

        <Reveal className={styles.footer}>
          <Link href="/ranks" className={styles.cta} id="why-hold-cta">
            Check Your Rank →
          </Link>
          <span className={styles.note}>
            Thresholds mirror the whitepaper and the live bot — kept in sync by an
            automated cross-surface test.
          </span>
        </Reveal>
      </div>
    </section>
  );
}
