import styles from "./Marquee.module.css";

interface MarqueeProps {
  items?: string[];
  reverse?: boolean;
}

const DEFAULT = [
  "INFECT THE INTERNET",
  "SIGNAL DETECTED",
  "THE INFECTED",
  "ZERO TAX",
  "FULLY RENOUNCED",
  "BUILT ON SOLANA",
];

export function Marquee({ items = DEFAULT, reverse = false }: MarqueeProps) {
  const row = [...items, ...items];
  return (
    <div
      className={[styles.marquee, reverse ? styles.reverse : ""].join(" ")}
      aria-hidden="true"
    >
      <div className={styles.track}>
        {row.map((item, i) => (
          <span key={i} className={styles.item}>
            {item}
            <span className={styles.sep}>{"//"}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
