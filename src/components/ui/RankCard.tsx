import styles from "./RankCard.module.css";

interface RankCardProps {
  id?: string;
  rank: string;
  description: string;
  behavior?: string;
  /** 1 (dim) .. 5 (bright) — controls glow intensity */
  tier: 1 | 2 | 3 | 4 | 5;
  className?: string;
}

export function RankCard({
  id,
  rank,
  description,
  behavior,
  tier,
  className = "",
}: RankCardProps) {
  return (
    <div
      id={id}
      className={[styles.card, className].filter(Boolean).join(" ")}
      data-tier={tier}
      style={{ ["--tier-alpha" as string]: (tier / 5).toFixed(2) }}
    >
      <div className={styles.head}>
        <span className={styles.dots} aria-hidden="true">
          {"▪".repeat(tier)}
        </span>
        <h3 className={styles.rank}>{rank}</h3>
      </div>
      <p className={styles.desc}>{description}</p>
      {behavior && <p className={styles.behavior}>{behavior}</p>}
    </div>
  );
}
