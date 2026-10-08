import { GECKO_CHART_EMBED, GECKO_POOL_URL } from "@/lib/market";
import styles from "./MarketChartEmbed.module.css";

// GeckoTerminal only — DexScreener dropped the GL1TCH pair (low volume), so its
// embed renders blank. Re-add a DexScreener option if it ever re-indexes the pool.
export function MarketChartEmbed() {
  return (
    <div className={styles.frame}>
      <div className={styles.bar}>
        <span className={styles.pair}>
          <span className={styles.dot} aria-hidden="true" />
          GL1TCH&nbsp;/&nbsp;SOL
        </span>
        <a
          className={styles.open}
          href={GECKO_POOL_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          GeckoTerminal ↗
        </a>
      </div>

      <div className={styles.viewport}>
        <iframe
          src={GECKO_CHART_EMBED}
          title="GL1TCH / SOL live price chart"
          className={styles.iframe}
          loading="lazy"
          allow="clipboard-write"
        />
      </div>
    </div>
  );
}
